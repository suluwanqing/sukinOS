const installSw = () => {
  const isSupported = () => {
    // 基础支持判断
    if (!('serviceWorker' in navigator)) return false
    // 排除兼容性极差的国产移动端内置浏览器
    const ua = navigator.userAgent
    if (/UCBrowser|QQBrowser|MiuiBrowser/i.test(ua)) return false
    // 安全域名判断
    return window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  }
  // 如果不支持或手动指定 nosw 参数，则跳过
  if (!isSupported() || window.location.search.includes('nosw=true')) return
  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW 注册成功')
        // 周期性检查更新[每小时]
        setInterval(() => {
          registration.update().catch(() => {})
        }, 3600000)
        // 监听更新逻辑
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            // 当新 SW 下载完成并处于 installed 状态，且已有控制者时，通知接管
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('教育平台: 发现新版本，正在准备静默接管...')
              // 发送消息给 sw.js 执行 self.skipWaiting()
              newWorker.postMessage({type: 'SKIP_WAITING'})
            }
          })
        })
      })
      .catch(err => {
        console.warn('教育平台: SW 注册失败:', err)
      })
  }
  // 如果页面已经加载完成，直接利用空闲注册
  if (document.readyState === 'complete') {
    const run = () => {
      // 此时 main.jsx 应该已经在处理下载后的逻辑，利用 CPU 空闲启动 SW
      if ('requestIdleCallback' in window) {
        requestIdleCallback(register, {timeout: 2000})
      } else {
        setTimeout(register, 1000)
      }
    }
    run()
  } else {
    // 监听 load 事件，此时核心 index.js 通常已下载完毕
    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(register, {timeout: 3000})
      } else {
        setTimeout(register, 1500)
      }
    })
  }
}
// installSw()
export default installSw
