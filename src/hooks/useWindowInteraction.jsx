import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
export const useWindowInteraction = (initialState, SAFE_DRAG_AREA = 40) => {
  // SAFE_DRAG_AREA:安全阈值,避免dom拖出屏幕[包括dom宽/高] ,initialState{x,y,w,h}初始相对坐标和宽高需要和dom对应,优先级高于css
  const windowElRef = useRef(null);
  const [rect, setRect] = useState(initialState);
  const actionType = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startRect = useRef({ ...initialState });
  const beforeMaximizeRect = useRef(null);

  //  在组件挂载时，用初始状态设置一次 DOM 元素的样式
  useEffect(() => {
    if (windowElRef.current) {
      windowElRef.current.style.left = `${initialState.x}px`;
      windowElRef.current.style.top = `${initialState.y}px`;
      windowElRef.current.style.width = `${initialState.w}px`;
      windowElRef.current.style.height = `${initialState.h}px`;
    }
  }, [initialState.x, initialState.y, initialState.w, initialState.h]); // 依赖项确保初始状态变化时能更新

  const handleMouseMove = useCallback((e) => {
    if (!actionType.current || !windowElRef.current) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    const { x, y, w, h } = startRect.current;
    // 在这里，我们直接修改 DOM 元素的 style，而不是调用 setRect。
    // 这绕过了 React 的渲染流程，实现了原生级别的拖拽性能。
    const el = windowElRef.current;

    switch (actionType.current) {
      case 'drag': { // 使用块级作用域以定义新变量
        //在这里添加边界检测逻辑

        // 计算理论上的新位置
        let newX = x + deltaX;
        let newY = y + deltaY;

        //  获取视口（viewport）的尺寸
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;

        // 限制新位置在安全范围内
        // 限制上边界：窗口的 top 不能小于 0
        newY = Math.max(0, newY);
        // 限制下边界：窗口的 top 不能让标题栏移出下边界
        newY = Math.min(newY, viewportH - SAFE_DRAG_AREA);
        // 限制左边界：窗口的 left 不能让窗口右侧的可操作区域完全移出左边界
        newX = Math.max(newX, -(w - SAFE_DRAG_AREA));
        // 限制右边界：窗口的 left 不能让窗口左侧的可操作区域完全移出右边界
        newX = Math.min(newX, viewportW - SAFE_DRAG_AREA);

        // 应用被限制后的新位置
        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
        break;
      }

      case 'e':
        el.style.width = `${Math.max(MIN_WIDTH, w + deltaX)}px`;
        break;

      case 'w': {
        const newW = Math.max(MIN_WIDTH, w - deltaX);
        el.style.width = `${newW}px`;
        el.style.left = `${x + w - newW}px`;
        break;
      }

      case 's':
        el.style.height = `${Math.max(MIN_HEIGHT, h + deltaY)}px`;
        break;

      case 'n': {
        const newH = Math.max(MIN_HEIGHT, h - deltaY);
        el.style.height = `${newH}px`;
        el.style.top = `${y + h - newH}px`;
        break;
      }

      case 'se':
        el.style.width = `${Math.max(MIN_WIDTH, w + deltaX)}px`;
        el.style.height = `${Math.max(MIN_HEIGHT, h + deltaY)}px`;
        break;

      case 'sw': {
        const newW = Math.max(MIN_WIDTH, w - deltaX);
        el.style.width = `${newW}px`;
        el.style.left = `${x + w - newW}px`;
        el.style.height = `${Math.max(MIN_HEIGHT, h + deltaY)}px`;
        break;
      }

      case 'ne': {
        el.style.width = `${Math.max(MIN_WIDTH, w + deltaX)}px`;
        const newH = Math.max(MIN_HEIGHT, h - deltaY);
        el.style.height = `${newH}px`;
        el.style.top = `${y + h - newH}px`;
        break;
      }

      case 'nw': {
        const newW = Math.max(MIN_WIDTH, w - deltaX);
        el.style.width = `${newW}px`;
        el.style.left = `${x + w - newW}px`;
        const newH = Math.max(MIN_HEIGHT, h - deltaY);
        el.style.height = `${newH}px`;
        el.style.top = `${y + h - newH}px`;
        break;
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (windowElRef.current) {
      // 交互结束时，从 DOM 元素读取最终的几何信息，
      // 并调用 setRect 一次，将状态同步回 React。
      const finalRect = windowElRef.current.getBoundingClientRect();
      setRect({
        x: finalRect.left,
        y: finalRect.top,
        w: finalRect.width,
        h: finalRect.height,
      });
    }

    actionType.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);


  const handleMouseDown = (e, type) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    actionType.current = type;
    startPos.current = { x: e.clientX, y: e.clientY };

    // [优化]保存交互开始时的 rect 状态时，直接从 DOM 读取
    // 这可以防止在 resize 之后立即 drag 时，由于 rect state 尚未更新导致的位置跳动问题。
    if (windowElRef.current) {
      const currentDOMRect = windowElRef.current.getBoundingClientRect();
      startRect.current = {
        x: currentDOMRect.left,
        y: currentDOMRect.top,
        w: currentDOMRect.width,
        h: currentDOMRect.height,
      };
    } else {
      startRect.current = { ...rect };
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true }); // 使用 passive 提升滚动性能
    document.addEventListener('mouseup', handleMouseUp);
  };

  const setMaximized = (isMaximizing) => {
    if (isMaximizing) {
      // 保存当前状态
      beforeMaximizeRect.current = { ...rect };

      // 计算新状态并更新 React state
      //是window的总高度
      const maximizedRect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight};
      setRect(maximizedRect);

      // 同时直接更新 DOM，确保立即生效
      if (windowElRef.current) {
        windowElRef.current.style.left = `${maximizedRect.x}px`;
        windowElRef.current.style.top = `${maximizedRect.y}px`;
        windowElRef.current.style.width = `${maximizedRect.w}px`;
        windowElRef.current.style.height = `${maximizedRect.h}px`;
      }
    } else {
      // 获取要恢复的状态
      const restoredRect = beforeMaximizeRect.current || initialState;

      // 更新 React state
      setRect(restoredRect);

      // 同时直接更新 DOM
      if (windowElRef.current) {
        windowElRef.current.style.left = `${restoredRect.x}px`;
        windowElRef.current.style.top = `${restoredRect.y}px`;
        windowElRef.current.style.width = `${restoredRect.w}px`;
        windowElRef.current.style.height = `${restoredRect.h}px`;
      }
    }
  };

  return {
    windowElRef, // 返回 ref 给组件绑定
    handleMouseDown,
    setMaximized
  };
};
