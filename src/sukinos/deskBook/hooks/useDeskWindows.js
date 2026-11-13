import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

// 运行中窗口的完整状态机：先来后到顺序、层级与焦点、LRU 休眠、调度中心选择
export function useDeskWindows({ apps, setting, kernel, startApp, isMobile, personalConfig, generateAppSetting }) {
  // 使用 ref 维护应用的先来后到顺序（PID 列表），保证窗口和状态栏顺序稳定
  const runningOrderRef = useRef([]);

  // 包含所有符合当前"运行"定义的应用，用于全量调度预览和窗口渲染
  const isRunningApps = useMemo(() => {
    const activeApps = apps.filter(a => a.status !== "INSTALLED")

    const activePids = new Set(activeApps.map(a => a.pid));
    // 从历史顺序中移除已经不再"运行"的应用
    runningOrderRef.current = runningOrderRef.current.filter(pid => activePids.has(pid));

    // 将新加入的"运行"应用追加到末尾（先来后到原则）
    const existingPids = new Set(runningOrderRef.current);
    activeApps.forEach(app => {
      if (!existingPids.has(app.pid)) {
        runningOrderRef.current.push(app.pid);
      }
    });
    // 按照维护好的稳定 PID 顺序，重新映射回真实的 app 对象
    const appMap = new Map(activeApps.map(a => [a.pid, a]));
    return runningOrderRef.current.map(pid => appMap.get(pid)).filter(Boolean);
  }, [apps, setting?.isDisplay]);

  const [zOrders, setZOrders] = useState({});
  const [maxZ, setMaxZ] = useState(10);
  const [currentFocus, setCurrentFocus] = useState(null);

  const showDisplay = useMemo(() => {
    const displayMap = {};
    apps.forEach((app) => {
      displayMap[app.pid] = app.status === 'RUNNING';
    });
    return displayMap;
  }, [apps]);

  // --- 调度中心 ---
  const [showWindowSwitcher, setShowWindowSwitcher] = useState(false);
  const [switcherFromBack, setSwitcherFromBack] = useState(false);
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);

  // 调度中心打开期间所有运行窗口都算可见
  const activeWindowPids = useMemo(() => {
    const pids = new Set();
    isRunningApps.forEach((app) => {
      if (showDisplay[app.pid] || showWindowSwitcher) pids.add(app.pid);
    });
    return pids;
  }, [isRunningApps, showDisplay, showWindowSwitcher]);

  // 焦点应用排最前，其余按 z-index 降序
  const sortedRunningApps = useMemo(() => {
    return [...isRunningApps].sort((a, b) => {
      if (currentFocus === a.pid) return -1;
      if (currentFocus === b.pid) return 1;

      const zA = zOrders[a.pid] || 0;
      const zB = zOrders[b.pid] || 0;
      return zB - zA;
    });
  }, [isRunningApps, zOrders, currentFocus]);

  // 非焦点窗口的层级/焦点更新可以延迟
  const deferredZOrders = useDeferredValue(zOrders);
  const deferredCurrentFocus = useDeferredValue(currentFocus);

  // 使用 ref 追踪动态值，使回调引用稳定，避免子组件因回调引用变化触发重渲染
  const maxZRef = useRef(maxZ);
  const settingRef = useRef(setting);
  const zOrdersRef = useRef(zOrders);
  useEffect(() => { maxZRef.current = maxZ; }, [maxZ]);
  useEffect(() => { settingRef.current = setting; }, [setting]);
  useEffect(() => { zOrdersRef.current = zOrders; }, [zOrders]);

  const handleFocus = useCallback((pid) => {
    if (!pid) return;
    setCurrentFocus(pid);
    if (zOrdersRef.current[pid] === maxZRef.current) return;
    const newMax = maxZRef.current + 1;
    maxZRef.current = newMax;
    zOrdersRef.current = { ...zOrdersRef.current, [pid]: newMax };
    setMaxZ(newMax);
    setZOrders(prev => ({ ...prev, [pid]: newMax }));
  }, []);

  // 内核激活/App 主动请求的前置意图
  useEffect(() => {
    return kernel.subscribeSystem((change) => {
      if (change?.type === 'APP_FOCUS' && change.pid) handleFocus(change.pid);
    });
  }, [kernel, handleFocus]);

  const handleStartApp = useCallback((pid) => {
    // 聚焦交给内核成功启动后发出的 APP_FOCUS，被强更拦截时不会把窗口提到前台
    startApp({ pid });

    if (isMobile && personalConfig?.mobileImmersive) {
      try {
        const docEl = document.documentElement;
        const requestFullscreen = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
        if (requestFullscreen && !document.fullscreenElement) {
          requestFullscreen.call(docEl).catch(err => {});
        }
      } catch (e) { }
    }
  }, [startApp, isMobile, personalConfig?.mobileImmersive]);

  const handleColseApp = useCallback((pid) => {
    kernel.hibernate(pid);
    setZOrders(prev => {
      const newOrders = { ...prev }
      delete newOrders[pid]
      return newOrders
    })
    setCurrentFocus(prev => (prev === pid ? null : prev))
  }, [kernel])

  const handleForceKill = useCallback((pid) => {
    kernel.forceKillProcess(pid);
    setZOrders(prev => {
      const newOrders = { ...prev }
      delete newOrders[pid]
      return newOrders
    })
    setCurrentFocus(prev => (prev === pid ? null : prev))
  }, [kernel])

  // --- LRU 自动休眠：超过上限时休眠最久未用的非焦点窗口 ---
  useEffect(() => {
    const maxWindows = generateAppSetting?.maxWindows ?? personalConfig?.maxWindows ?? 10;
    const workerLRUEnabled = generateAppSetting?.workerLRU !== false && personalConfig?.workerLRU !== false;
    if (!maxWindows || !workerLRUEnabled || !currentFocus) return;

    const visibleWindows = isRunningApps.filter(a => showDisplay[a.pid]);
    if (visibleWindows.length <= maxWindows) return;

    // 按 zOrders 升序排列（最旧的在前），保留焦点窗口
    const toHibernate = [...visibleWindows]
      .filter(a => a.pid !== currentFocus)
      .sort((a, b) => (zOrders[a.pid] || 0) - (zOrders[b.pid] || 0))
      .slice(0, visibleWindows.length - maxWindows);

    toHibernate.forEach(app => {
      // hibernate 仅改变状态标记，Worker 继续后台运行保持热状态
      kernel.hibernate(app.pid);
      setZOrders(prev => {
        const next = { ...prev };
        delete next[app.pid];
        return next;
      });
    });
  }, [isRunningApps, currentFocus, showDisplay, zOrders, generateAppSetting, personalConfig, kernel]);

  const closeWindowSwitcher = () => {
    setShowWindowSwitcher(false);
    setSwitcherFromBack(false);
    setSelectedWindowIndex(0);
  };


  const openSwitcherForBack = useCallback(() => {
    setSwitcherFromBack(true);
    setSelectedWindowIndex(0);
    setShowWindowSwitcher(true);
  }, []);

  const handleMobileDismissToHome = useCallback(() => {
    isRunningApps.forEach((app) => {
      if (app.status === 'RUNNING') {
        kernel.hibernate(app.pid);
      }
    });
    setCurrentFocus(null);
    closeWindowSwitcher();
  }, [isRunningApps, kernel]);

  // 必须按排序后的数组取目标窗口
  const handleSelectWindow = (index) => {
    const targetApp = sortedRunningApps[index];
    if (targetApp) {
      handleStartApp(targetApp.pid);
      closeWindowSwitcher();
    }
  };

  const handleSwitcherAppSelect = (pid) => {
    handleStartApp(pid);
    closeWindowSwitcher();
  };

  return {
    isRunningApps,
    showDisplay,
    activeWindowPids,
    sortedRunningApps,
    deferredZOrders,
    deferredCurrentFocus,
    currentFocus,
    showWindowSwitcher,
    switcherFromBack,
    selectedWindowIndex,
    setSelectedWindowIndex,
    setShowWindowSwitcher,
    handleFocus,
    handleStartApp,
    handleColseApp,
    handleForceKill,
    closeWindowSwitcher,
    openSwitcherForBack,
    handleMobileDismissToHome,
    handleSelectWindow,
    handleSwitcherAppSelect,
  };
}

export default useDeskWindows
