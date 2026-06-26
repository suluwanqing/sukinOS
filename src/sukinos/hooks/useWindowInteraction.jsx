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

  // 保存最新的 handleMouseMove / handleMouseUp 引用，供卸载清理 effect 读取
  // 避免 effect 依赖数组变化导致重复注册/卸载
  const handleMouseMoveRef = useRef(null)
  const handleMouseUpRef = useRef(null)

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

  // 卸载清理：组件在拖拽过程中被卸载时，确保 document 事件和 RAF 全部释放
  // 不在此处依赖 handleMouseMove/handleMouseUp，而是读取最新 ref，避免 stale closure
  useEffect(() => {
    return () => {
      // 取消还未执行的 RAF，防止回调在卸载后异步触发时访问已为 null 的 ref
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      // 移除挂在 document 上的事件，防止卸载后仍然触发并访问 null ref
      if (handleMouseMoveRef.current) {
        document.removeEventListener('mousemove', handleMouseMoveRef.current)
      }
      if (handleMouseUpRef.current) {
        document.removeEventListener('mouseup', handleMouseUpRef.current)
      }
    }
  }, []) // 仅在卸载时执行一次，依赖数组为空

  // 批量更新样式
  const updateDOMStyles = useCallback((el, updates) => {
    for (const [key, value] of Object.entries(updates)) {
      el.style[key] = value
    }
  }, [])

  // 物理沙箱模式下：使用 will-change 提示浏览器优化
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

  // 恢复交互后的状态
  const finishInteraction = useCallback((el) => {
    if (!el) return

    // 清除交互期间注入的 inline transform，让 CSS class 接管 GPU 合成层分配
    // 焦点窗口通过 .is-focused { translateZ(0) } 获得 GPU 层
    // 非焦点窗口无 CSS transform，自动释放 GPU 层
    el.style.transform = ''
    // 交互结束：恢复 transition 效果（可根据需要从外部传入或默认）
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

    // 物理沙箱模式下的节流优化
    if (isIframeMode) {
      const now = Date.now()
      if (now - lastMoveTimeRef.current < THROTTLE_MS) {
        return
      }
      lastMoveTimeRef.current = now
    }

    const updateFn = () => {
      // RAF 是异步的：在 requestAnimationFrame 回调真正执行时，
      // 组件可能已经卸载导致 windowElRef.current 变为 null，
      // 此处必须重新从 ref 读取，而非依赖外层 closure 捕获的旧值
      const el = windowElRef.current
      if (!el) return

      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      const { x, y, w, h } = startRect.current

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
        // RAF 回调是异步的，执行时组件可能已卸载，ref 已为 null，
        // 需在进入 updateFn 前再做一次守卫，防止 getBoundingClientRect / style 访问 null
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

      // 恢复交互后的 transition 和状态
      finishInteraction(el)

      // 更新最终的逻辑矩形状态（仅存在 ref 中）
      // el 是从 windowElRef.current 捕获的局部变量，即使此后 ref 被置 null，
      // el 本身仍持有对 DOM 节点的强引用，getBoundingClientRect 调用是安全的
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

  // 每次 handleMouseMove / handleMouseUp 更新时，同步最新引用到 ref
  // 卸载清理 effect 通过读取这两个 ref 保证移除的是最新注册的函数
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

    // 若 ref 为 null（极端情况：元素已卸载但事件仍触发），直接返回
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
        // 清除 inline transform，让 CSS .is-focused 自动接管 GPU 合成层
        el.style.transform = ''
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
