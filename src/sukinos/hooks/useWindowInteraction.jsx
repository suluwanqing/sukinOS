import { useRef, useCallback, useEffect } from 'react'

const MIN_WIDTH = 300
const MIN_HEIGHT = 200

export const useWindowInteraction = ({ winSize: initialState, allowResize = true, SAFE_DRAG_AREA = 40, isIframeMode = false }) => {
  // SAFE_DRAG_AREA:安全阈值,避免dom拖出屏幕[包括dom宽/高] ,initialState{x,y,w,h}初始相对坐标和宽高需要和dom对应,优先级高于css
  const windowElRef = useRef(null)

  // 使用ref存储状态，避免React重渲染。完全弃用 useState 以获取极致性能
  const rectRef = useRef(initialState)
  const actionType = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startRect = useRef({ ...initialState })
  const beforeMaximizeRect = useRef(null)

  // 存储当前是否在拖拽中，用于外部查询
  const isDraggingRef = useRef(false)

  // iframe模式下的优化：使用RAF节流
  const rafIdRef = useRef(null)
  const lastMoveTimeRef = useRef(0)
  const THROTTLE_MS = isIframeMode ? 8 : 0 // 物理沙箱模式下限制到约125fps

  //  在组件挂载时，用初始状态设置一次 DOM 元素的样式
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

  // 批量更新样式
  const updateDOMStyles = useCallback((el, updates) => {
    for (const [key, value] of Object.entries(updates)) {
      el.style[key] = value
    }
  }, [])

  // 物理沙箱模式下：使用 will-change 提示浏览器优化
  const prepareForInteraction = useCallback((el) => {
    if (!el) return
    // 交互开始：强制禁用 transition 避免位移延迟带来的缩放/拖拽偏移感
    el.style.transition = 'none'

    if (isIframeMode) {
      el.style.willChange = 'width, height, left, top, transform'
      // 临时禁用 iframe 内的指针事件，防止鼠标移动过快进入 iframe 导致事件丢失
      const iframe = el.querySelector('iframe')
      if (iframe) {
        iframe.style.pointerEvents = 'none'
      }
    }
  }, [isIframeMode])

  // 恢复交互后的状态
  const finishInteraction = useCallback((el) => {
    if (!el) return
    // 交互结束：恢复 transition 效果（可根据需要从外部传入或默认）
    el.style.transition = isIframeMode ? 'none' : 'width 0.2s ease-out, height 0.2s ease-out, left 0.2s ease-out, top 0.2s ease-out'

    if (isIframeMode) {
      el.style.willChange = ''
      const iframe = el.querySelector('iframe')
      if (iframe) {
        iframe.style.pointerEvents = ''
      }
    }
  }, [isIframeMode])

  const handleMouseMove = useCallback((e) => {
    if (!actionType.current || !windowElRef.current) return

    // 物理沙箱模式下的节流优化
    if (isIframeMode) {
      const now = Date.now()
      if (now - lastMoveTimeRef.current < THROTTLE_MS) {
        return
      }
      lastMoveTimeRef.current = now
    }

    const updateFn = () => {
      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      const { x, y, w, h } = startRect.current
      const el = windowElRef.current

      if (!el) return

      const updates = {}

      switch (actionType.current) {
        case 'drag': {
          // 计算理论上的新位置
          let newX = x + deltaX
          let newY = y + deltaY

          // 获取视口（viewport）的尺寸
          const viewportW = window.innerWidth
          const viewportH = window.innerHeight

          // 限制新位置在安全范围内
          newY = Math.max(0, newY)
          newY = Math.min(newY, viewportH - SAFE_DRAG_AREA)
          newX = Math.max(newX, -(w - SAFE_DRAG_AREA))
          newX = Math.min(newX, viewportW - SAFE_DRAG_AREA)

          if (isIframeMode) {
            // 使用 transform3d 硬件加速，并计算相对于 startRect 的增量位移，防止偏移
            const transX = newX - x
            const transY = newY - y
            const newTransform = `translate3d(${transX}px, ${transY}px, 0)`
            if (el.style.transform !== newTransform) {
              el.style.transform = newTransform
              // 存入 dataset 以便 mouseUp 物理化
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
          el.style.transform = 'none'
          delete el.dataset.realLeft
          delete el.dataset.realTop
        }
      }

      // 恢复交互后的 transition 和状态
      finishInteraction(el)

      // 更新最终的逻辑矩形状态（仅存在 ref 中）
      const finalRect = el.getBoundingClientRect()
      rectRef.current = {
        x: finalRect.left,
        y: finalRect.top,
        w: finalRect.width,
        h: finalRect.height,
      }
    }

    isDraggingRef.current = false
    actionType.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, isIframeMode, finishInteraction])

  const handleMouseDown = useCallback((e, type) => {
    if (e.button !== 0) return
    e.stopPropagation()

    if (!allowResize && type !== 'drag') return

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

      // 准备交互：禁用 transition 和 iframe 指针
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
        el.style.transform = 'none'
      }
    }
  }, [initialState])

  const getCurrentRect = useCallback(() => rectRef.current, [])
  const getIsDragging = useCallback(() => isDraggingRef.current, [])

  return {
    windowElRef,
    handleMouseDown,
    setMaximized,
    getCurrentRect,
    getIsDragging
  }
}
