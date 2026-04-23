const CACHE_PREFIX = 'sukin-cache'
const CACHE_VERSION = 'v1.0.6'
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
  //拦截非合法sw注册
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
          const clone = res.clone()
          getCache().then(cache => cache.put(request, clone))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_PAGE)
        })
    )
    return
  }
  // 静态资源
  const isStatic =
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'video' ||
    request.destination === 'font' ||
    /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|mp3|wav|aac|flac)$/i.test(url.pathname)

  event.respondWith(
    (async () => {
      const cache = await getCache()
      const cachedResponse = await cache.match(request)
      // 如果有缓存，直接返回，但在后台延迟更新
      if (cachedResponse) {
        // 对于视频/音频等大文件，延迟更长时间，避免影响播放性能
        const delayTime =
          request.destination === 'video' ||
          request.destination === 'audio' ||
          /\.(mp4|webm|ogg|mp3|wav)$/i.test(url.pathname)
            ? 5000
            : 2000

        event.waitUntil(
          new Promise(resolve => setTimeout(resolve, delayTime)).then(() =>
            fetch(request)
              .then(networkResponse => {
                if (networkResponse.ok) {
                  // 对于大文件，限制缓存大小
                  const contentType = networkResponse.headers.get('content-type')
                  const contentLength = networkResponse.headers.get('content-length')
                  const isLargeFile =
                    request.destination === 'video' ||
                    request.destination === 'audio' ||
                    (contentType && contentType.includes('video/')) ||
                    (contentType && contentType.includes('audio/'))

                  // 只缓存小于20MB的视频/音频文件
                  if (isLargeFile && contentLength) {
                    const size = parseInt(contentLength, 10)
                    if (size <= 20 * 1024 * 1024) {
                      // 20MB
                      cache.put(request, networkResponse)
                    }
                  } else {
                    cache.put(request, networkResponse)
                  }
                }
              })
              .catch(() => {})
          )
        )
        return cachedResponse
      }

      // 无缓存，走网络
      return fetch(request)
        .then(networkResponse => {
          if (networkResponse.ok && isStatic) {
            // 检查文件大小，避免缓存过大文件
            const contentLength = networkResponse.headers.get('content-length')
            const isVideoOrAudio =
              request.destination === 'video' ||
              request.destination === 'audio' ||
              /\.(mp4|webm|ogg|mp3|wav)$/i.test(url.pathname)

            if (isVideoOrAudio && contentLength) {
              const size = parseInt(contentLength, 10)
              if (size <= 20 * 1024 * 1024) {
                // 只缓存小于20MB的视频/音频
                cache.put(request, networkResponse.clone())
              }
            } else {
              // 非视频/音频文件，或小于20MB的文件，正常缓存
              cache.put(request, networkResponse.clone())
            }
          }
          return networkResponse
        })
        .catch(() => new Response('Network Error', {status: 408}))
    })()
  )
})
