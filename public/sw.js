const CACHE_PREFIX = 'sukin-cache'
const CACHE_VERSION = 'v1.0.2'
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`
const OFFLINE_PAGE = '/index.html'
const ORIGIN = 'sukin.top'
const NETWORK_PRIORITY_PREFIXES = ['/api/user/status']
const SHOULD_CACHE = ['/', OFFLINE_PAGE]

// 预初始化 Cache 引用
let cachePromise
const getCache = () => {
  if (!cachePromise) {
    cachePromise = caches.open(CACHE_NAME)
  }
  return cachePromise
}

// 检查响应是否可缓存[过滤 206 和其他不可缓存的状态]
const isCacheableResponse = (response, request) => {
  if (!response || !response.ok) return false

  //过滤 206 部分内容响应
  if (response.status === 206) {
    // console.log('跳过 206 响应，不缓存:', request.url)
    return false
  }

  // 只缓存 200、304 等成功状态
  if (response.status !== 200 && response.status !== 304) return false

  // 可选：过滤特定大小的文件
  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    // 跳过超过 50MB 的文件
    if (size > 50 * 1024 * 1024) return false
  }

  return true
}

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(getCache().then(cache => cache.addAll(SHOULD_CACHE)))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.map(k => (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME ? caches.delete(k) : null))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', event => {
  const {request} = event
  const url = new URL(request.url)

  // 拦截非合法sw注册
  if (request.headers.get('Service-Worker') === 'script' && url.pathname !== '/sw.js') {
    return event.respondWith(new Response('Forbidden', {status: 403}))
  }

  // 排除非 GET 和 DATA URL
  if (request.method !== 'GET' || !request.url.startsWith('http')) return

  // 拦截特定标识
  if (url.hostname.includes(ORIGIN) && request.headers.has('x-kernel-process-id')) {
    return event.respondWith(new Response('forbidden', {status: 403}))
  }

  // 网络优先 API 列表
  if (NETWORK_PRIORITY_PREFIXES.some(p => url.pathname.startsWith(p))) {
    event.respondWith(fetch(request).catch(() => new Response('API Error', {status: 408})))
    return
  }

  // 导航请求:网络优先，失败后回退离线页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          // 只缓存成功的完整响应，不缓存 206
          if (isCacheableResponse(res, request)) {
            const clone = res.clone()
            getCache().then(cache => cache.put(request, clone))
          }
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_PAGE)
        })
    )
    return
  }

  // 匹配特定需要进行 Stale-While-Revalidate（缓存优先，后台静默更新）的 API 请求（完整匹配带或不带 /api 前缀的路径）
  const isStaleWhileRevalidateApi =
    url.pathname === '/system/update/log/latest' || url.pathname === '/api/system/update/log/latest'

  // 静态资源[包括字体、视频等] 以及 需要被 SW 代理缓存的目标 API
  const isStatic =
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'video' ||
    request.destination === 'audio' ||
    request.destination === 'font' || // 字体文件
    /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|mp3|wav|aac|flac|otf|ttf|woff|woff2)$/i.test(
      url.pathname
    ) ||
    isStaleWhileRevalidateApi

  event.respondWith(
    (async () => {
      const cache = await getCache()
      const cachedResponse = await cache.match(request)

      // 如果有缓存且不是 206（缓存中不会存 206），直接返回
      if (cachedResponse) {
        // 对于视频/音频/字体等大文件，延迟更长时间，避免影响播放性能
        const delayTime =
          request.destination === 'video' ||
          request.destination === 'audio' ||
          request.destination === 'font' ||
          /\.(mp4|webm|ogg|mp3|wav|otf|ttf|woff2?)$/i.test(url.pathname)
            ? 5000
            : isStaleWhileRevalidateApi
              ? 1000 // 特定的缓存 API 使用较短延迟，提高数据刷新时效
              : 2000

        // 后台静默更新[可选，对于字体文件可以不更新]
        const shouldBackgroundUpdate = request.destination !== 'font' // 字体文件不强制后台更新

        if (shouldBackgroundUpdate) {
          event.waitUntil(
            new Promise(resolve => setTimeout(resolve, delayTime)).then(() =>
              fetch(request)
                .then(networkResponse => {
                  // 只缓存可缓存的响应[过滤 206]
                  if (isCacheableResponse(networkResponse, request)) {
                    cache.put(request, networkResponse)
                  }
                })
                .catch(() => {})
            )
          )
        }
        return cachedResponse
      }

      // 无缓存，走网络
      return fetch(request)
        .then(networkResponse => {
          // 只缓存可缓存的响应（自动过滤 206）并且属于需要代理缓存的静态资源或特定的 API 请求
          if (isCacheableResponse(networkResponse, request) && isStatic) {
            // 检查文件大小，避免缓存过大文件
            const contentLength = networkResponse.headers.get('content-length')
            const isVideoOrAudio =
              request.destination === 'video' ||
              request.destination === 'audio' ||
              /\.(mp4|webm|ogg|mp3|wav)$/i.test(url.pathname)

            const isFont =
              request.destination === 'font' || /\.(otf|ttf|woff|woff2)$/i.test(url.pathname)

            if (isVideoOrAudio && contentLength) {
              const size = parseInt(contentLength, 10)
              if (size <= 20 * 1024 * 1024) {
                // 只缓存小于20MB的视频/音频
                cache.put(request, networkResponse.clone())
              }
            } else if (isFont) {
              // 字体文件：不缓存[避免 206 问题]，直接返回
              // 或者可以强制重新请求完整字体
            } else {
              // 普通静态资源及特定需要缓存的 API 正常缓存
              cache.put(request, networkResponse.clone())
            }
          }
          return networkResponse
        })
        .catch(() => new Response('Network Error', {status: 408}))
    })()
  )
})
