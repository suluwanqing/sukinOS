/**
 * 不再复制 <link>/<style> 节点引用，
 * 而是直接读取 document.styleSheets 里已经处理好的 CSS 规则文本，
 * 以 <style> 内联方式注入 iframe——彻底绕过 Vite @import 指令问题。
 */
class StyleSyncHub {
  constructor() {
    this.STYLE_ID = '__iframe_sync__main'
    this.targetDocs = new Set()
    this.rafId = null
    this.headObserver = null
    this.contentObserver = null
    this.themeObserver = null

    // 绑定上下文，确保回调函数被异步调度时 this 指向正确
    this.serializeAllSheets = this.serializeAllSheets.bind(this)
    this.flushAll = this.flushAll.bind(this)
    this.schedule = this.schedule.bind(this)
    this.disconnectObservers = this.disconnectObservers.bind(this)
    this.ensureObservers = this.ensureObservers.bind(this)
    this.registerSandboxDoc = this.registerSandboxDoc.bind(this)
  }

  // ─── 读取主文档所有已处理的 CSS 规则 ────────────────────────────────────────────

  /**
   * 把 document.styleSheets 里所有规则序列化成 CSS 文本。
   * 这是浏览器已经解析好的最终产物，不含任何 Vite/@tailwindcss 特有指令。
   */
  serializeAllSheets() {
    const parts = []
    for (const sheet of document.styleSheets) {
      try {
        // cssRules 在跨域 sheet 上会抛异常，同源不会
        const rules = Array.from(sheet.cssRules)
          .map(r => r.cssText)
          .join('\n')
        if (rules) parts.push(rules)
      } catch {
        // 跨域 sheet 跳过（iconfont CDN 等）
      }
    }
    return parts.join('\n')
  }

  // ─── 同步到所有目标 doc ───────────────────────────────────────────────────────

  flushAll() {
    this.rafId = null
    const css = this.serializeAllSheets()

    for (const doc of this.targetDocs) {
      if (!doc?.head) continue

      // 复用同一个 <style> 标签，直接覆盖内容
      let el = doc.getElementById(this.STYLE_ID)
      if (!el) {
        el = doc.createElement('style')
        el.id = this.STYLE_ID
        doc.head.appendChild(el)
      }
      if (el.textContent !== css) {
        el.textContent = css
      }

      // 同步主文档 <html> 的 class（dark/light/Shadcn 主题类）
      if (doc.documentElement) {
        doc.documentElement.className = document.documentElement.className
      }
    }
  }

  schedule() {
    if (this.rafId) return
    this.rafId = requestAnimationFrame(this.flushAll)
  }

  // ─── 注销并清理主文档所有活跃观察者 ──────────────────────────────────────────────

  disconnectObservers() {
    if (this.headObserver) {
      this.headObserver.disconnect()
      this.headObserver = null
    }
    if (this.contentObserver) {
      this.contentObserver.disconnect()
      this.contentObserver = null
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect()
      this.themeObserver = null
    }
  }

  // ─── 监听主文档变化 ───────────────────────────────────────────────────────────

  ensureObservers() {
    if (this.headObserver) return

    // 1. 监听 head 新增/删除样式节点（Emotion、动态插入的 CSS）
    this.headObserver = new MutationObserver(muts => {
      const isStyleNode = n =>
        n.nodeType === 1 &&
        (n.nodeName === 'STYLE' ||
          (n.nodeName === 'LINK' && n.getAttribute('rel') === 'stylesheet'))

      for (const m of muts) {
        const changed = [...m.addedNodes, ...m.removedNodes].some(isStyleNode)
        if (changed) {
          this.schedule()
          break
        }
      }
    })
    this.headObserver.observe(document.head, {childList: true})

    // 2. 监听 <style> 内容变化（Tailwind JIT / Emotion in-place 更新）
    this.contentObserver = new MutationObserver(this.schedule)
    this.contentObserver.observe(document.head, {
      subtree: true,
      characterData: true,
      childList: true,
    })

    // 3. 监听 html class 变化（暗色模式切换）
    this.themeObserver = new MutationObserver(() => {
      for (const doc of this.targetDocs) {
        if (doc?.documentElement) doc.documentElement.className = document.documentElement.className
      }
    })
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  // ─── 公共 API ────────────────────────────────────────────────────────────────

  /**
   * 注册一个 iframe document，立即同步当前所有样式，并持续跟踪变化。
   *
   * @param   {Document}    targetDoc   iframe.contentDocument
   * @returns {() => void}              卸载函数，在组件 unmount 时调用
   */
  registerSandboxDoc(targetDoc) {
    if (!targetDoc) return () => {}
    this.ensureObservers()
    this.targetDocs.add(targetDoc)
    this.schedule()
    return () => {
      this.targetDocs.delete(targetDoc)
      if (this.targetDocs.size === 0) {
        this.disconnectObservers()
      }
    }
  }
}

// 建立全局唯一单例
const styleSyncHubInstance = new StyleSyncHub()

// 代理导出公开函数
export const registerSandboxDoc = styleSyncHubInstance.registerSandboxDoc
