import { useCallback, useEffect, useRef } from 'react'
import { confirm } from '@/component/confirm/layout'
import { alert } from '@/component/alert/layout'

// 全局快捷键：Ctrl+R 软刷新、Ctrl+Alt+C 调度中心、Ctrl+Alt+O 状态栏
export function useDeskShortcuts({
  isMobile,
  showWindowSwitcher, sortedRunningApps, selectedWindowIndex,
  handleStartApp, closeWindowSwitcher,
  setShowWindowSwitcher, setSelectedWindowIndex,
  refreshDeskLayout, handleMobileDismissToHome, toggleStatusBar
}) {
  // 监听器只绑定一次，通过 ref 读取最新状态，避免闭包陷阱
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = {
      showWindowSwitcher,
      sortedRunningApps,
      selectedWindowIndex,
      handleStartApp,
      closeWindowSwitcher,
      setShowWindowSwitcher,
      setSelectedWindowIndex,
      isMobile,
      refreshDeskLayout,
      handleMobileDismissToHome,
      toggleStatusBar,
    };
  });

  const handleGlobalKeyDown = useCallback((event) => {
    const {
      showWindowSwitcher, sortedRunningApps, selectedWindowIndex,
      handleStartApp, closeWindowSwitcher, setShowWindowSwitcher,
      setSelectedWindowIndex
    } = stateRef.current;

    // 使用 event.code 物理键值，避免 Alt + C 输出特殊字符造成匹配失败
    const code = event.code;

    if (event.ctrlKey && code === 'KeyR') {
      event.preventDefault();
      event.stopPropagation();
      confirm.show({
        title: '系统刷新',
        content: '是否执行系统界面和配置项的刷新？(此操作不会关闭您正在运行的应用)。',
        onConfirm: () => {
          const { refreshDeskLayout } = stateRef.current;
          if (refreshDeskLayout) {
            refreshDeskLayout();
            alert.success('系统桌面及配置已刷新');
          }
        }
      });
      return;
    }

    if (event.ctrlKey && event.altKey && code === 'KeyC') {
      event.preventDefault();
      event.stopPropagation();
      if (showWindowSwitcher) {
        closeWindowSwitcher();
      } else {
        if (sortedRunningApps.length === 0) return;
        setShowWindowSwitcher(true);
        // 排序后索引 0 即当前活动窗口
        setSelectedWindowIndex(0);
      }
      return;
    }

    if (showWindowSwitcher) {
      const count = sortedRunningApps.length;
      if (event.altKey && !event.ctrlKey && code === 'KeyC') {
        event.preventDefault();
        setSelectedWindowIndex((selectedWindowIndex + 1) % count);
        return;
      }
      if (code === 'Tab' || code === 'ArrowRight') {
        event.preventDefault();
        setSelectedWindowIndex((selectedWindowIndex + 1) % count);
      } else if (code === 'ArrowLeft') {
        event.preventDefault();
        setSelectedWindowIndex((selectedWindowIndex - 1 + count) % count);
      } else if (code === 'Enter') {
        event.preventDefault();
        const targetApp = sortedRunningApps[selectedWindowIndex];
        if (targetApp) {
          handleStartApp(targetApp.pid);
          closeWindowSwitcher();
        }
      } else if (code === 'Escape') {
        event.preventDefault();
        closeWindowSwitcher();
      }
    }

    if (event.ctrlKey && event.altKey && code === 'KeyO') {
      event.preventDefault();
      event.stopPropagation();

      if (stateRef.current.isMobile) return;
      stateRef.current.toggleStatusBar();
    }
  }, []);

  // 捕获阶段监听，解决 iframe 焦点丢失导致的按键拦截失效
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown, true);

    const handleIframeMessage = (e) => {
      if (e.data && e.data.type === 'SUKIN_GLOBAL_KEY') {
        const payload = e.data.eventPayload || {};
        const simulatedEvent = {
          ctrlKey: payload.ctrlKey,
          altKey: payload.altKey,
          code: payload.code,
          preventDefault: () => {},
          stopPropagation: () => {}
        };
        handleGlobalKeyDown(simulatedEvent);
      }
    };
    window.addEventListener('message', handleIframeMessage);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [handleGlobalKeyDown]);
}

export default useDeskShortcuts
