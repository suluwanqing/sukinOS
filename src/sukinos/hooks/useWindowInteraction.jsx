import { useRef, useCallback, useEffect } from 'react'

const MIN_WIDTH = 300
const MIN_HEIGHT = 200

export const useWindowInteraction = ({ winSize: initialState, allowResize = true, SAFE_DRAG_AREA = 40, isIframeMode = false, onDragEnd }) => {
  // SAFE_DRAG_AREA 是防止拖出屏幕的安全阈值；initialState 的 x/y/w/h 需与 DOM 对应，优先级高于 css
  const windowElRef = useRef(null)

  // 矩形只存 ref、完全不进 React 状态：拖拽期间不触发重渲染
  const rectRef = useRef(initialState)
  const actionType = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startRect = useRef({ ...initialState })
  const beforeMaximizeRect = useRef(null)

  const isDraggingRef = useRef(false)

  const rafIdRef = useRef(null)
  const lastMoveTimeRef = useRef(0)
  const THROTTLE_MS = isIframeMode ? 8 : 0 // 物理沙箱模式下限制到约125fps

  // 存最新的 handleMouseMove/handleMouseUp 供卸载清理读取，这样清理 effect 的依赖数组能保持为空
  const handleMouseMoveRef = useRef(null)
  const handleMouseUpRef = useRef(null)

  // 挂载时把初始矩形写进 DOM 样式
  useEffect(() => {
    if (windowElRef.current) {
      const el = windowElRef.current
      el.style.left = `${initialState.x}px`
      el.style.top = `${initialState.y}px`
      el.style.width = `${initialState.w}px`
      el.style.height = `${initialState.h}px`
      rectRef.current = initialState
    }
  }, [initialState.x, initialState.y, initialState.w, initialState.h])

  // 卸载清理：拖拽中途被卸载也要把 document 事件与 RAF 全部释放
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      if (handleMouseMoveRef.current) {
        document.removeEventListener('mousemove', handleMouseMoveRef.current)
      }
      if (handleMouseUpRef.current) {
        document.removeEventListener('mouseup', handleMouseUpRef.current)
      }
    }
  }, [])

  const updateDOMStyles = useCallback((el, updates) => {
    for (const [key, value] of Object.entries(updates)) {
      el.style[key] = value
    }
  }, [])

  const prepareForInteraction = useCallback((el) => {
    if (!el) return
    // 交互开始：分配 GPU 合成层，禁用 transition 避免拖拽偏移
    el.style.transition = 'none'
    el.style.transform = 'translateZ(0)'

    if (isIframeMode) {
      // 临时禁用 iframe 内的指针事件，防止鼠标移动过快进入 iframe 导致事件丢失
      const iframe = el.querySelector('iframe')
      if (iframe) {
        iframe.style.pointerEvents = 'none'
      }
    }
  }, [isIframeMode])

  const finishInteraction = useCallback((el) => {
    if (!el) return

    // 清掉交互期间注入的 inline transform，让 CSS 接管合成层：焦点窗口靠 .is-focused{translateZ(0)} 拿到 GPU 层，非焦点自动释放
    el.style.transform = ''
    el.style.transition = isIframeMode ? 'none' : 'width 0.2s ease-out, height 0.2s ease-out, left 0.2s ease-out, top 0.2s ease-out'

    if (isIframeMode) {
      const iframe = el.querySelector('iframe')
      if (iframe) {
        iframe.style.pointerEvents = ''
      }
    }
  }, [isIframeMode])

  const handleMouseMove = useCallback((e) => {
    if (!actionType.current || !windowElRef.current) return

    if (isIframeMode) {
      const now = Date.now()
      if (now - lastMoveTimeRef.current < THROTTLE_MS) {
        return
      }
      lastMoveTimeRef.current = now
    }

    const updateFn = () => {
      // RAF 回调是异步的：真正执行时组件可能已卸载、ref 已为 null，所以必须重新读 ref 而不是用闭包里的旧值
      const el = windowElRef.current
      if (!el) return

      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      const { x, y, w, h } = startRect.current

      const updates = {}

      switch (actionType.current) {
        case 'drag': {
          let newX = x + deltaX
          let newY = y + deltaY

          const viewportW = window.innerWidth
          const viewportH = window.innerHeight

          // 上下左右各保留 SAFE_DRAG_AREA 在视口内
          newY = Math.max(0, newY)
          newY = Math.min(newY, viewportH - SAFE_DRAG_AREA)
          newX = Math.max(newX, -(w - SAFE_DRAG_AREA))
          newX = Math.min(newX, viewportW - SAFE_DRAG_AREA)

          if (isIframeMode) {
            // 硬件加速：拖动期间只写 transform3d 增量，不动 left/top
            const transX = newX - x
            const transY = newY - y
            const newTransform = `translate3d(${transX}px, ${transY}px, 0)`
            if (el.style.transform !== newTransform) {
              el.style.transform = newTransform
              // 最终坐标暂存 dataset，mouseUp 时再落回 left/top
              el.dataset.realLeft = newX
              el.dataset.realTop = newY
            }
          } else {
            updates.left = `${newX}px`
            updates.top = `${newY}px`
          }
          break
        }

        case 'e': {
          updates.width = `${Math.max(MIN_WIDTH, w + deltaX)}px`
          break
        }

        case 'w': {
          const newW = Math.max(MIN_WIDTH, w - deltaX)
          updates.width = `${newW}px`
          updates.left = `${x + w - newW}px`
          break
        }

        case 's': {
          updates.height = `${Math.max(MIN_HEIGHT, h + deltaY)}px`
          break
        }

        case 'n': {
          const newH = Math.max(MIN_HEIGHT, h - deltaY)
          updates.height = `${newH}px`
          updates.top = `${y + h - newH}px`
          break
        }

        case 'se': {
          updates.width = `${Math.max(MIN_WIDTH, w + deltaX)}px`
          updates.height = `${Math.max(MIN_HEIGHT, h + deltaY)}px`
          break
        }

        case 'sw': {
          const newW = Math.max(MIN_WIDTH, w - deltaX)
          updates.width = `${newW}px`
          updates.left = `${x + w - newW}px`
          updates.height = `${Math.max(MIN_HEIGHT, h + deltaY)}px`
          break
        }

        case 'ne': {
          updates.width = `${Math.max(MIN_WIDTH, w + deltaX)}px`
          const newH = Math.max(MIN_HEIGHT, h - deltaY)
          updates.height = `${newH}px`
          updates.top = `${y + h - newH}px`
          break
        }

        case 'nw': {
          const newW = Math.max(MIN_WIDTH, w - deltaX)
          updates.width = `${newW}px`
          updates.left = `${x + w - newW}px`
          const newH = Math.max(MIN_HEIGHT, h - deltaY)
          updates.height = `${newH}px`
          updates.top = `${y + h - newH}px`
          break
        }
      }

      if (Object.keys(updates).length > 0) {
        updateDOMStyles(el, updates)
      }
    }

    if (isIframeMode) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null
        if (!windowElRef.current) return
        updateFn()
      })
    } else {
      updateFn()
    }
  }, [SAFE_DRAG_AREA, isIframeMode, THROTTLE_MS, updateDOMStyles])

  const handleMouseUp = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    if (windowElRef.current) {
      const el = windowElRef.current

      // 物理沙箱模式：将 transform 增量转换回布局 left/top，并清除 transform 避免叠加偏移
      if (isIframeMode && el.style.transform && el.style.transform !== 'none') {
        const realLeft = el.dataset.realLeft
        const realTop = el.dataset.realTop

        if (realLeft !== undefined && realTop !== undefined) {
          el.style.left = `${realLeft}px`
          el.style.top = `${realTop}px`
          el.style.transform = ''
          delete el.dataset.realLeft
          delete el.dataset.realTop
        }
      }

      finishInteraction(el)

      // 回写最终矩形到 ref；el 是局部强引用，此后 ref 被置 null 也不影响这次测量
      const finalRect = el.getBoundingClientRect()
      rectRef.current = {
        x: finalRect.left,
        y: finalRect.top,
        w: finalRect.width,
        h: finalRect.height,
      }

      onDragEnd?.(rectRef.current)
    }

    isDraggingRef.current = false
    actionType.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, isIframeMode, finishInteraction, onDragEnd])

  useEffect(() => {
    handleMouseMoveRef.current = handleMouseMove
  }, [handleMouseMove])

  useEffect(() => {
    handleMouseUpRef.current = handleMouseUp
  }, [handleMouseUp])

  const handleMouseDown = useCallback((e, type) => {
    if (e.button !== 0) return
    e.stopPropagation()

    if (!allowResize && type !== 'drag') return

    if (!windowElRef.current) return

    isDraggingRef.current = true
    actionType.current = type
    startPos.current = { x: e.clientX, y: e.clientY }

    if (windowElRef.current) {
      const el = windowElRef.current
      // 必须使用 getComputedStyle 获取真实物理坐标，getBoundingClientRect 会受 transform 影响导致缩放偏移
      const style = window.getComputedStyle(el)

      startRect.current = {
        x: parseFloat(style.left) || 0,
        y: parseFloat(style.top) || 0,
        w: parseFloat(style.width) || el.offsetWidth,
        h: parseFloat(style.height) || el.offsetHeight,
      }

      prepareForInteraction(el)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseup', handleMouseUp)
  }, [allowResize, handleMouseMove, handleMouseUp, prepareForInteraction])

  const setMaximized = useCallback((isMaximizing) => {
    if (isMaximizing) {
      beforeMaximizeRect.current = { ...rectRef.current }
      const maximizedRect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
      rectRef.current = maximizedRect

      if (windowElRef.current) {
        const el = windowElRef.current
        el.style.left = `${maximizedRect.x}px`
        el.style.top = `${maximizedRect.y}px`
        el.style.width = `${maximizedRect.w}px`
        el.style.height = `${maximizedRect.h}px`
        el.style.transform = 'none'
      }
    } else {
      const restoredRect = beforeMaximizeRect.current || initialState
      rectRef.current = restoredRect

      if (windowElRef.current) {
        const el = windowElRef.current
        el.style.left = `${restoredRect.x}px`
        el.style.top = `${restoredRect.y}px`
        el.style.width = `${restoredRect.w}px`
        el.style.height = `${restoredRect.h}px`
        // 清除 inline transform，让 CSS .is-focused 自动接管 GPU 合成层
        el.style.transform = ''
      }
    }
  }, [initialState])

  const setRect = useCallback((partialRect = {}) => {
    const el = windowElRef.current
    if (!el) return

    const current = rectRef.current || initialState
    // 允许只传部分字段（如 {w,h}），非法输入回退当前值
    const next = {
      x: Number.isFinite(partialRect.x) ? partialRect.x : current.x,
      y: Number.isFinite(partialRect.y) ? partialRect.y : current.y,
      w: Number.isFinite(partialRect.w) ? partialRect.w : current.w,
      h: Number.isFinite(partialRect.h) ? partialRect.h : current.h,
    }
    // clamp：尺寸下限 + 与拖拽一致的安全区，防止窗口被推出视口
    next.w = Math.max(MIN_WIDTH, next.w)
    next.h = Math.max(MIN_HEIGHT, next.h)
    next.y = Math.max(0, Math.min(next.y, window.innerHeight - SAFE_DRAG_AREA))
    next.x = Math.max(-(next.w - SAFE_DRAG_AREA), Math.min(next.x, window.innerWidth - SAFE_DRAG_AREA))

    // 物理沙箱模式：清除拖拽残留的 transform 增量，避免与 left/top 叠加偏移
    el.style.transform = ''
    delete el.dataset.realLeft
    delete el.dataset.realTop

    el.style.left = `${next.x}px`
    el.style.top = `${next.y}px`
    el.style.width = `${next.w}px`
    el.style.height = `${next.h}px`
    rectRef.current = next

    // 复用拖拽结束的持久化链路（→ kernel.updateWindowRect）
    onDragEnd?.(next)
  }, [initialState, onDragEnd, SAFE_DRAG_AREA])

  const getCurrentRect = useCallback(() => rectRef.current, [])
  const getIsDragging = useCallback(() => isDraggingRef.current, [])

  return {
    windowElRef,
    handleMouseDown,
    setMaximized,
    setRect,
    getCurrentRect,
    getIsDragging
  }
}
