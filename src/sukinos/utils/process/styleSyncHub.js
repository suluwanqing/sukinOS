/**
 * 不再复制 <link>/<style> 节点引用，
 * 而是直接读取 document.styleSheets 里已经处理好的 CSS 规则文本，
 * 以 <style> 内联方式注入 iframe——彻底绕过 Vite @import 指令问题。
 */
class StyleSyncHub {
  constructor() {
    this.STYLE_ID = '__iframe_sync__main'
    this.targetDocs = new Set()
    this.visibleDocs = new Set()    // 可见窗口的 iframe doc，仅这些 doc 接收实时样式同步
    this.rafId = null
    this.headObserver = null
    this.contentObserver = null
    this.themeObserver = null

    // 缓存上一次同步的 CSS，仅在有变化时再刷新
    this.lastCss = null

    // 绑定上下文，确保回调函数被异步调度时 this 指向正确
    this.serializeAllSheets = this.serializeAllSheets.bind(this)
    this.flushAll = this.flushAll.bind(this)
    this.schedule = this.schedule.bind(this)
    this.disconnectObservers = this.disconnectObservers.bind(this)
    this.ensureObservers = this.ensureObservers.bind(this)
    this.registerSandboxDoc = this.registerSandboxDoc.bind(this)
    this.updateVisibility = this.updateVisibility.bind(this)
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

  // ─── 同步到所有可见目标 doc ───────────────────────────────────────────────────

  flushAll() {
    this.rafId = null
    const css = this.serializeAllSheets()

    // CSS 无变化则跳过所有写入（包括可见 doc），节省序列化比较开销
    if (this.lastCss === css) return
    this.lastCss = css

    // 仅向可见窗口的 iframe doc 写入样式，隐藏窗口不接收实时同步
    for (const doc of this.visibleDocs) {
      if (!this.targetDocs.has(doc) || !doc?.head) continue

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

    // 3. 监听 html class 变化（暗色模式切换）— 仅同步到可见窗口
    this.themeObserver = new MutationObserver(() => {
      const className = document.documentElement.className
      for (const doc of this.visibleDocs) {
        if (doc?.documentElement) doc.documentElement.className = className
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
   * @param   {boolean}     [isVisible=true]  该 iframe 是否属于可见窗口
   * @returns {() => void}              卸载函数，在组件 unmount 时调用
   */
  registerSandboxDoc(targetDoc, isVisible = true) {
    if (!targetDoc) return () => {}
    this.ensureObservers()
    this.targetDocs.add(targetDoc)
    if (isVisible) {
      this.visibleDocs.add(targetDoc)
    }
    this.schedule()
    return () => {
      this.targetDocs.delete(targetDoc)
      this.visibleDocs.delete(targetDoc)
      if (this.targetDocs.size === 0) {
        this.disconnectObservers()
      }
    }
  }

  /**
   * 更新已注册 iframe document 的可见性。
   * 窗口从隐藏变为可见时调用 → 恢复实时样式同步。
   * 窗口从可见变为隐藏时调用 → 停止样式同步。
   */
  updateVisibility(targetDoc, isVisible) {
    if (!targetDoc) return
    if (isVisible && this.targetDocs.has(targetDoc)) {
      this.visibleDocs.add(targetDoc)
      // 恢复可见时立即同步一次最新样式，保证视觉一致性
      this.schedule()
    } else {
      this.visibleDocs.delete(targetDoc)
    }
  }
}

// 建立全局唯一单例
const styleSyncHubInstance = new StyleSyncHub()

// 代理导出公开函数
export const registerSandboxDoc = styleSyncHubInstance.registerSandboxDoc
export const updateVisibility = styleSyncHubInstance.updateVisibility
