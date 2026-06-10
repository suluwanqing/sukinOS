;(function () {
  'use strict'
  const seoConfig = {
    title: 'Sukin - 云端应用口袋',
    meta: {
      description:
        'Sukin 是一个基于应用系统。内置 sukinOS 网页操作系统、前端在线开发教育平台，涵盖:文件管理,表格,画板,应用商店等常用APP,提供高效便捷的网页端数字化体验。',
      keywords: 'Sukin, sukinOS, 在线前端开发, Web PWA, React 操作系统, 数字化工作空间, 应用口袋',
      author: 'Sukin - 爱踢粪球的虫',
      robots: 'index, follow',

      'theme-color': '#f0f9ff',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': 'Sukin',

      'og:type': 'website',
      'og:title': 'Sukin - 数字化工作空间',
      'og:description': '基于 React + Vite 的渐进式网页应用，探索在线开发与轻量级 OS 体验。',
      'og:image': 'https://sukin.top/author.jpg',
      'og:url': 'https://sukin.top',
      'og:site_name': 'Sukin',

      'twitter:card': 'summary_large_image',
      'twitter:title': 'Sukin - 数字化工作空间',
      'twitter:description': '基于 React + Vite 的渐进式网页应用，探索在线开发与轻量级 OS 体验。',
      'twitter:image': 'https://sukin.top/author.jpg',
    },

    links: {
      canonical: 'https://sukin.top/',
    },
  }

  const head = document.head || document.getElementsByTagName('head')[0]

  if (seoConfig.title) {
    document.title = seoConfig.title
  }
  for (const [key, value] of Object.entries(seoConfig.meta)) {
    if (!value) continue
    let metaTag = document.createElement('meta')

    if (key.startsWith('og:')) {
      metaTag.setAttribute('property', key)
    } else {
      metaTag.setAttribute('name', key)
    }

    metaTag.setAttribute('content', value)
    head.insertBefore(metaTag, head.firstChild)
  }
  for (const [rel, href] of Object.entries(seoConfig.links)) {
    if (!href) continue
    let existingLink = head.querySelector(`link[rel="${rel}"]`)
    if (!existingLink) {
      let linkTag = document.createElement('link')
      linkTag.setAttribute('rel', rel)
      linkTag.setAttribute('href', href)
      head.appendChild(linkTag)
    }
  }
})()
