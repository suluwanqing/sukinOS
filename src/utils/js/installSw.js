const installSw = () => {
  const isSupported = () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    if (typeof Promise === 'undefined') {
      return false
    }

    const userAgent = navigator.userAgent
    const unsupportedBrowsers = [
      //避免部分浏览器器不支持导致页面访问正常,无法渲染问题
      'UCBrowser', // UC浏览器
      'UCWEB', // UC浏览器
      'QQBrowser', // QQ浏览器
      'MQQBrowser', // 手机QQ浏览器
      'MiuiBrowser', // 小米浏览器
      'SamsungBrowser', // 三星浏览器（某些版本）
      'BaiduBrowser', // 百度浏览器
      'SogouMobileBrowser', // 搜狗浏览器
    ]

    for (const browser of unsupportedBrowsers) {
      if (userAgent.includes(browser)) {
        console.log(`检测到不支持的浏览器: ${browser}`)
        return false
      }
    }

    const isSecureContext =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'

    if (!isSecureContext) {
      console.log('非安全上下文，无法使用Service Worker')
      return false
    }

    return true
  }

  // 如果任何条件不满足，直接返回
  if (!isSupported()) {
    console.log('浏览器环境不支持Service Worker，跳过安装')
    return
  }

  // 只有所有条件都满足才安装
  const onLoad = () => {
    navigator.serviceWorker
      .register('/sw.js', {scope: '/'})
      .then(registration => {
        // 检查等待的Service Worker
        if (registration.waiting) {
          registration.waiting.postMessage({type: 'SKIP_WAITING'})
        }
        // 监听更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                new Notification()
              }
            })
          }
        })
      })
      .catch(error => {
        console.log('Service Worker安装失败:', error)
      })
  }

  // 页面加载完成后安装
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // 如果页面已经加载完成，直接执行
    setTimeout(onLoad, 1000)
  } else {
    // 否则等待页面加载完成
    window.addEventListener('load', () => {
      setTimeout(onLoad, 1000)
    })
  }
}

export default installSw
