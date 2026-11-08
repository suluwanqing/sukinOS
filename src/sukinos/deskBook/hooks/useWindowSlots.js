import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

// 窗口挂载槽：平时挂在窗口层，移动端调度器打开时由卡片搬进预览位，
// 让标题与真实窗口同处一个盒子；moveBefore 搬迁保留 iframe 运行状态
export function useWindowSlots(isRunningApps) {
  const windowLayerRef = useRef(null);
  const windowSlotsRef = useRef(new Map());

  const getWindowSlot = useCallback((pid) => {
    let slot = windowSlotsRef.current.get(pid);
    if (!slot) {
      slot = document.createElement('div');
      slot.style.display = 'contents';
      windowSlotsRef.current.set(pid, slot);
    }
    const layer = windowLayerRef.current;
    if (layer && !slot.isConnected) layer.appendChild(slot);
    return slot;
  }, []);

  const releaseWindowSlot = useCallback((pid) => {
    const slot = windowSlotsRef.current.get(pid);
    const layer = windowLayerRef.current;
    if (!slot || !layer) return;
    slot.style.cssText = '';
    slot.style.display = 'contents';
    if (slot.parentNode === layer) return;
    if (slot.isConnected && typeof layer.moveBefore === 'function') {
      try { layer.moveBefore(slot, null); return } catch (e) { /* 降级 appendChild */ }
    }
    layer.appendChild(slot);
  }, []);

  // 进程退出后清理挂载槽
  useEffect(() => {
    const alive = new Set(isRunningApps.map((app) => app.pid));
    windowSlotsRef.current.forEach((slot, pid) => {
      if (alive.has(pid)) return;
      windowSlotsRef.current.delete(pid);
      slot.remove();
    });
  }, [isRunningApps]);

  // 首帧 commit 后窗口层 ref 才就位，补挂一次
  useLayoutEffect(() => {
    const layer = windowLayerRef.current;
    if (!layer) return;
    windowSlotsRef.current.forEach((slot) => {
      if (!slot.isConnected) layer.appendChild(slot);
    });
  });

  return { windowLayerRef, windowSlotsRef, getWindowSlot, releaseWindowSlot };
}

export default useWindowSlots
