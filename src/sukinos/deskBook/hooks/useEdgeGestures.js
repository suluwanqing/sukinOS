import { useRef } from 'react'

// 移动端底部手势：上滑进多任务，轻划回桌面
export function useEdgeGestures({ isMobile, showWindowSwitcher, setShowWindowSwitcher, closeWindowSwitcher, dismissToHome }) {
  const gestureStateRef = useRef(null);

  const handleEdgePointerDown = (e) => {
    if (!isMobile) return;
    e.stopPropagation();
    gestureStateRef.current = { startY: e.clientY, startX: e.clientX, dy: 0, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleEdgePointerMove = (e) => {
    const gesture = gestureStateRef.current;
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    e.stopPropagation();
    gesture.dy = e.clientY - gesture.startY;
  };

  const handleEdgePointerUp = (e) => {
    const gesture = gestureStateRef.current;
    if (!gesture || (e && e.pointerId !== gesture.pointerId)) return;
    e.stopPropagation();
    gestureStateRef.current = null;

    const screenH = window.innerHeight;
    const dy = -gesture.dy;

    const homeThreshold = 20;
    const switcherThreshold = Math.max(70, screenH * 0.09);

    if (dy >= switcherThreshold) {
      setShowWindowSwitcher(true);
    } else if (dy >= homeThreshold) {
      dismissToHome();
    } else if (gesture.dy > 20) {
      if (showWindowSwitcher) {
        dismissToHome();
      } else {
        closeWindowSwitcher();
      }
    }
  };

  return { handleEdgePointerDown, handleEdgePointerMove, handleEdgePointerUp };
}

export default useEdgeGestures
