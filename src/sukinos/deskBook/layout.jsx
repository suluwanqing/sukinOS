import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import StatusBar from "./statusBar/layout"
import Shortcut from "./shortcut/layout"
import ProcessWindow from "./window/layout"
import useKernel from "@/sukinos/hooks/useKernel"
import { WindowSize, SUKIN_EXT, SUKIN_PRE, ENV_KEY_META_INFO, ENV_KEY_NAME, ENV_KEY_RESOURCE_ID } from "@/sukinos/utils/config"
import Boot from "./boot/layout"
import ContextMenu from "@/component/contextMenu/layout.jsx"
import { selectorSetting, selectGenerateApp } from "../store"
import { useDispatch, useSelector } from 'react-redux'
import usePersonalization from "@/sukinos/hooks/usePersonalization"
import { confirm } from '@/component/confirm/layout'
import { alert } from "@/component/alert/layout"
import CustomApp from "./customApp/layout"
import VfsImage from '@/sukinos/middleware/VfsImage.jsx'

// 创建 BEM 命名空间
const bem = createNamespace('deskbook')
// 桌面网格常量
const CELL_SIZE = 100; // 对应CSS中的尺寸 (px)
const GAP_SIZE = 10;   // 对应CSS中的gap, 和padding计算 (px)

function DeskBook() {
  // --- 初始化 Hooks ---
  const dispatch = useDispatch()
  const { refreshConfig } = usePersonalization(); // 个性化配置 Hook

  // --- 内核状态与方法 ---
  const {
    apps, isReady, loading, bootSystem, startApp, hibernateApp, kernel,
    runningApps, hibernatedApps, blockEdApps,
    reStartApp, forceReStartApp
  } = useKernel();

  // --- Redux 状态选择器 ---
  const setting = useSelector(selectorSetting)
  const generateAppSetting = useSelector(selectGenerateApp)

  // --- 核心显示逻辑 ---
  // 使用 useRef 维护应用的先来后到顺序（PID列表），提升用户体验，保证窗口和状态栏顺序稳定
  const runningOrderRef = useRef([]);

  // isRunningApps 包含所有符合当前"运行"定义规则的应用，用于全量调度预览和窗口渲染
  const isRunningApps = useMemo(() => {
    // 根据 setting.isDisplay 的定义过滤出当前的活跃应用
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
    // 按照维护好的稳定的 PID 顺序，重新映射回真实的 app 对象数据
    const appMap = new Map(activeApps.map(a => [a.pid, a]));
    return runningOrderRef.current.map(pid => appMap.get(pid)).filter(Boolean);
  }, [apps, setting?.isDisplay]);


  // --- 窗口层级状态 ---
  const [zOrders, setZOrders] = useState({});
  const [maxZ, setMaxZ] = useState(10);

  // --- DOM 引用 ---
  const mainContainerRef = useRef(null) // 主容器引用
  const viewRef = useRef(null)         // 桌面视图引用

  // --- UI 状态管理 ---
  const [showDisplay, setShowDisplay] = useState({})   // 控制窗口显示隐藏
  const [statusBarOpen, setStatusBarOpen] = useState(false) // 状态栏开启状态
  const [currentFocus, setCurrentFocus] = useState(null)    // 当前焦点 PID

  // --- 网格布局与图标排列状态 ---
  const [gridSize, setGridSize] = useState({ rows: 0, cols: 0 }); // 动态行列数
  const [appPositions, setAppPositions] = useState({}); // 存储 PID 到 "row-col" 的坐标映射
  const [dragOverCell, setDragOverCell] = useState(null); // 当前拖拽悬停的格子坐标 "row-col"

  // --- 应用编辑状态 ---
  const [editingApp, setEditingApp] = useState(null);

  // --- Ubuntu 调度中心 (Window Switcher) 相关状态 ---
  const [showWindowSwitcher, setShowWindowSwitcher] = useState(false); // 切换器显示隐藏
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);    // 切换器中选中的索引

  // ---对应用进行层级排序，确保最高层级（即当前正在使用）的应用在 Switcher 中排在最前面 ---
  const sortedRunningApps = useMemo(() => {
    return [...isRunningApps].sort((a, b) => {
      // 优先判断焦点应用排在第一位
      if (currentFocus === a.pid) return -1;
      if (currentFocus === b.pid) return 1;

      // 其次根据 z-index 排序，降序排列（大的在前）
      const zA = zOrders[a.pid] || 0;
      const zB = zOrders[b.pid] || 0;
      return zB - zA;
    });
  }, [isRunningApps, zOrders, currentFocus]);

  // --- 窗口引用搜集器 ---
  // 使用 Ref 和 pid 作为键搜集每个 ProcessWindow 的 DOM 引用，用于 switcher 动画效果
  const windowRefsMap = useRef(new Map());

  // 设置窗口 ref 的函数
  const setWindowRef = (pid) => (ref) => {
    if (ref) windowRefsMap.current.set(pid, ref);
    else windowRefsMap.current.delete(pid);
  };

  // --- 样式注入：Ubuntu 调度中心所需的电影感预览效果 ---
  useEffect(() => {
    if (!document.getElementById('sukin-ubuntu-switcher-styles')) {
      const styleNode = document.createElement('style');
      styleNode.id = 'sukin-ubuntu-switcher-styles';
      styleNode.innerHTML = `
        .sukin-ubuntu-preview-mode {
           position: fixed !important;
           top: 50% !important;
           left: 50% !important;
           display: flex !important;
           /* 核心：应用电影镜头缩放曲线 */
           transform: translate(-50%, -50%) scale(0.78) !important;
           z-index: 1800000 !important;
           box-shadow: 0 60px 180px rgba(0,0,0,0.9) !important;
           border-radius: 16px !important;
           pointer-events: none !important;
           opacity: 1 !important;
           filter: none !important;
           transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .sukin-ubuntu-hidden-mode {
           display: none !important;
        }
      `;
      document.head.appendChild(styleNode);
    }
  }, []);

  // --- 窗口交互处理函数 ---

  // 处理窗口聚焦与层级提升
  const handleFocus = (pid) => {
    if (zOrders[pid] === maxZ) return
    const newMax = maxZ + 1;
    setMaxZ(newMax);
    setZOrders(prev => ({ ...prev, [pid]: newMax }))
    setCurrentFocus(pid)
  };

  // 启动应用
  const handleStartApp = (pid) => {
    handleFocus(pid);
    startApp({ pid });
  };

  // 关闭或休眠应用
  const handleColseApp = (pid) => {
    kernel.hibernate(pid);
    // 清理 zIndex
    setZOrders(prev => {
      const newOrders = { ...prev }
      delete newOrders[pid]
      return newOrders
    })
    // 清理当前焦点
    setCurrentFocus(prev => (prev === pid ? null : prev))
    // 如果设置了显示已安装应用，则更新显示状态
    if (setting?.isDisplay || false) {
      setShowDisplay({ ...showDisplay, [pid]: false })
    }
  }

  // --- 窗口切换器(Switcher) 逻辑控制 ---
  // 关闭窗口切换器并重置所有窗口样式
  const closeWindowSwitcher = () => {
    setShowWindowSwitcher(false);
    setSelectedWindowIndex(0);
    windowRefsMap.current.forEach((winRef) => {
      if (winRef) {
        winRef.classList.remove('sukin-ubuntu-preview-mode');
        winRef.classList.remove('sukin-ubuntu-hidden-mode');
      }
    });
  };

  // 确认选择切换器中的某个窗口
  const handleSelectWindow = (index) => {
    // 必须根据排序后的数组来获取 targetApp
    const targetApp = sortedRunningApps[index];
    if (targetApp) {
      handleStartApp(targetApp.pid);
      closeWindowSwitcher();
    }
  };

  // 创建一个 stateRef 存储所有最新状态，避免闭包陷阱和重新绑定监听器导致的失效
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
      setStatusBarOpen,
      apps,
      gridSize,
      autoArrangeApps,
      setAppPositions,
      refreshConfig
    };
  });

  // 全局键盘事件监听：处理 Ctrl+Alt+C (调度中心) 和 Ctrl+Alt+O (状态栏)
  const handleGlobalKeyDown = useCallback((event) => {
    // 通过 ref 提取所有最新状态
    const {
      showWindowSwitcher, sortedRunningApps, selectedWindowIndex,
      handleStartApp, closeWindowSwitcher, setShowWindowSwitcher,
      setSelectedWindowIndex, setStatusBarOpen
    } = stateRef.current;

    //使用 event.code 物理键值，避免 Alt + C 输出特殊字符造成匹配失败
    const code = event.code;

    // 拦截 F5 和 Ctrl+R 执行自定义软刷新，并在执行前进行弹窗确认
    if (code === 'F5' || (event.ctrlKey && code === 'KeyR')) {
      event.preventDefault();
      event.stopPropagation();
      confirm.show({
        title: '系统刷新',
        content: '是否执行系统界面和配置项的刷新？(此操作不会关闭您正在运行的应用)。',
        onConfirm: () => {
          const { apps, gridSize, autoArrangeApps, setAppPositions, refreshConfig } = stateRef.current;
          if (apps && autoArrangeApps && setAppPositions && refreshConfig) {
            setAppPositions(autoArrangeApps(apps, {}, gridSize.rows, gridSize.cols));
            refreshConfig();
            alert.success('系统桌面及配置已刷新');
          }
        }
      });
      return;
    }

    // Toggle 切换器开启与关闭 (Ctrl+Alt+C)
    if (event.ctrlKey && event.altKey && code === 'KeyC') {
      event.preventDefault();
      event.stopPropagation();
      if (showWindowSwitcher) {
        closeWindowSwitcher();
      } else {
         if (sortedRunningApps.length === 0) return;
         setShowWindowSwitcher(true);
         // 排序后，索引0一定是层级最高的(即当前活动窗口)
         setSelectedWindowIndex(0);
      }
      return;
    }

    // 切换器开启后的导航逻辑
    if (showWindowSwitcher) {
      const count = sortedRunningApps.length;
      // Alt + C 快速轮询切换
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

    // 状态栏显隐切换 (Ctrl+Alt+O)
    if (event.ctrlKey && event.altKey && code === 'KeyO') {
      event.preventDefault();
      event.stopPropagation();
      setStatusBarOpen(prev => {
        const newStatus = !prev;
        localStorage.setItem("deskbook-show-status", JSON.stringify(newStatus));
        return newStatus;
      });
    }
  }, []); // 空依赖，确保不会因为重渲染导致监听器丢失事件

  // 解决焦点丢失与鼠标位置造成的按键拦截失效问题
  useEffect(() => {
    // 捕获阶段绑定原生键盘事件
    window.addEventListener('keydown', handleGlobalKeyDown, true);

    // Iframe / 跨域应用焦点丢失处理机制
    // 当用户的鼠标点进了应用（特别是 iframe）内部时，顶级 window 会失去键盘焦点。
    // 为了防止快捷键失效，可通过此消息管道从 App 内部向外推送快捷键。
    const handleIframeMessage = (e) => {
      // App 内部代码需要配合发送消息，例如：
      // window.parent.postMessage({ type: 'SUKIN_GLOBAL_KEY', eventPayload: { ctrlKey: true, altKey: true, code: 'KeyC' } }, '*');
      if (e.data && e.data.type === 'SUKIN_GLOBAL_KEY') {
        const payload = e.data.eventPayload || {};
        // 伪造 event 对象，赋予空的 preventDefault 和 stopPropagation 以防调用报错
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

  // --- 桌面网格与拖拽排列逻辑 ---

  // 自动排列未分配位置的应用
  const autoArrangeApps = useCallback((currentApps, currentPositions, maxRows, maxCols) => {
    const newPositions = { ...currentPositions };
    const usedPositions = new Set(Object.values(newPositions));
    // 过滤出需要显示在桌面的图标 (hasShortcut)
    const shortcuts = currentApps.filter(item => item?.[ENV_KEY_META_INFO]?.custom?.hasShortcut);
    let currentRow = 0;
    let currentCol = 0;

    shortcuts.forEach(app => {
      if (!newPositions[app.pid]) {
        // 寻找下一个空余格子
        while (usedPositions.has(`${currentRow}-${currentCol}`)) {
            currentCol++;
            if (currentCol >= maxCols) {
                currentCol = 0;
                currentRow++;
            }
        }
        // 检查是否超出网格边界
        if (currentRow < maxRows) {
            const posKey = `${currentRow}-${currentCol}`;
            newPositions[app.pid] = posKey;
            usedPositions.add(posKey);
        }
      }
    });
    return newPositions;
  }, []);

  // 监听容器大小变化，动态计算行列数
  useEffect(() => {
    if (!isReady || !mainContainerRef.current) return;
    let resizeTimer;
    const calculateGrid = () => {
      if (mainContainerRef.current) {
        const width = mainContainerRef.current.clientWidth - 40; // 减去 padding
        const height = mainContainerRef.current.clientHeight - 40;
        const cols = Math.max(1, Math.floor(width / (CELL_SIZE + GAP_SIZE)));
        const rows = Math.max(1, Math.floor(height / (CELL_SIZE + GAP_SIZE)));
        setGridSize(prev => (prev.rows === rows && prev.cols === cols) ? prev : { rows, cols });
      }
    };
    calculateGrid();
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(calculateGrid, 200);
    });
    observer.observe(mainContainerRef.current);
    return () => {
        observer.disconnect();
        clearTimeout(resizeTimer);
    };
  }, [isReady]);

  // 当 App 列表或网格大小变化时，同步应用位置
  useEffect(() => {
    if (!isReady || gridSize.cols === 0) return;
    // 加载持久化位置
    const savedLayout = JSON.parse(localStorage.getItem('deskbook-layout-positions') || '{}');
    setAppPositions(prev => {
        const basePositions = Object.keys(prev).length > 0 ? prev : savedLayout;
        const currentAppPids = new Set(apps.map(a => a.pid));
        const validPositions = {};

        Object.keys(basePositions).forEach(pid => {
            if(!currentAppPids.has(pid)) return; // 移除已卸载的应用位置
            const pos = basePositions[pid];
            if (pos) {
                const [r, c] = pos.split('-').map(Number);
                // 响应式检查：如果窗口缩放导致原位置越界，则标记为待重新分配
                if (r < gridSize.rows && c < gridSize.cols) {
                    validPositions[pid] = pos;
                }
            }
        });
        return autoArrangeApps(apps, validPositions, gridSize.rows, gridSize.cols);
    });
  }, [apps, isReady, gridSize.cols, gridSize.rows, autoArrangeApps]);

  // --- 拖拽事件处理 ---
  const handleDragStart = (e, pid) => {
    e.dataTransfer.setData("text/plain", pid);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const posKey = `${row}-${col}`;
    if (dragOverCell !== posKey) setDragOverCell(posKey);
  };
  const handleDragLeave = () => setDragOverCell(null);
  const handleDrop = (e, targetRow, targetCol) => {
    e.preventDefault();
    setDragOverCell(null);
    const sourcePid = e.dataTransfer.getData("text/plain");
    const targetKey = `${targetRow}-${targetCol}`;
    if (!sourcePid) return;

    setAppPositions(prev => {
        const newPositions = { ...prev };
        // 查找目标位置是否已有应用，如果有则进行交换
        const targetPid = Object.keys(newPositions).find(pid => newPositions[pid] === targetKey);
        if (targetPid && targetPid !== sourcePid) {
            const sourceKey = newPositions[sourcePid];
            newPositions[sourcePid] = targetKey;
            newPositions[targetPid] = sourceKey;
        } else {
            newPositions[sourcePid] = targetKey;
        }
        return newPositions;
    });
  };

  // --- 桌面右键菜单项 ---
  const deskBookMenuItems = [
    {
      id: 'refresh',
      label: '刷新布局',
      onClick: () => {
        setAppPositions(autoArrangeApps(apps, {}, gridSize.rows, gridSize.cols));
        refreshConfig();
      }
    },
    { type: 'divider' },
  ]

  // --- 图标右键菜单项 ---
  const shortcutMenus = [
    {
      id: 'delete', label: '删除',
      onClick: async (metaInfo) => {
          confirm.show({
              title: '确认删除',
              content: '您确定要删除该App？删除后将无法恢复。',
              onConfirm: async () => {
                  await kernel.deleteApp({pid:metaInfo.pid, resourceId:metaInfo?.[ENV_KEY_RESOURCE_ID]})
              }
          });
      }
    },
    {
      id: 'edit', label: '编辑',
      onClick: (metaInfo) => setEditingApp(metaInfo)
    },
  ]


  // 保存布局位置到本地存储
  const handleUnload = () => {
    localStorage.setItem('deskbook-layout-positions', JSON.stringify(appPositions));
  }

  const handleBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = "确定离开当前页面吗？";
    return e.returnValue;
  };


  // 当系统 Ready 且主容器 Ref 挂载后，强制刷新配置以应用壁纸
  useEffect(() => {
    if (isReady && mainContainerRef.current) {
        // 延迟一帧确保 DOM 属性已在浏览器中完全生效
        requestAnimationFrame(() => {
            refreshConfig();
        });
    }
  }, [isReady, refreshConfig]);

  useEffect(() => {
    const initStatus = {};
    apps.forEach(item => { initStatus[item.pid] = true });
    kernel.setDispatch(dispatch);
    setShowDisplay(initStatus);

    const statusBar = localStorage.getItem('deskbook-show-status') || 'true';
    setStatusBarOpen(JSON.parse(statusBar));

    window.addEventListener('beforeunload', handleBeforeUnload);
    // 监听 pagehide 替代弃用的 unload 以避免 Permissions policy violation
    window.addEventListener('pagehide', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleUnload);
    }
  }, [dispatch, kernel, apps]);

  useEffect(() => {
    const displayMap = {};
    apps.forEach((app) => {
      displayMap[app.pid] = app.status === 'RUNNING';
    });
    setShowDisplay(displayMap);
  }, [apps]);

  // 资源自定义配置更新处理
  const handleCustomUpdate = async (newCustomConfig) => {
    if (!editingApp) return;
    try {
      const updatedApp = await kernel.updateResourceCustom({
        resourceId: editingApp?.[ENV_KEY_RESOURCE_ID],
        custom: newCustomConfig
      });
      if (updatedApp) setEditingApp({ ...updatedApp });
    } catch (err) {
      // console.error("更新配置失败:", err);
    }
  }

  //系统启动状态检查
  if (!isReady) {
    return <Boot boot={bootSystem} loading={loading} />
  }

  // 渲染桌面图标网格
  const renderGridCells = () => {
    const cells = [];
    const shortcuts = apps.filter(item => item?.[ENV_KEY_META_INFO]?.custom?.hasShortcut);
    const posToAppMap = {};
    Object.keys(appPositions).forEach(pid => {
        posToAppMap[appPositions[pid]] = shortcuts.find(app => app.pid === pid);
    });

    for (let r = 0; r < gridSize.rows; r++) {
      for (let c = 0; c < gridSize.cols; c++) {
        const posKey = `${r}-${c}`;
        const app = posToAppMap[posKey];
        const isHovered = dragOverCell === posKey;
        cells.push(
          <div
            key={posKey}
            className={[style[bem.e('grid-cell')], style[bem.is('grid-cell-hover', isHovered)]].join(' ')}
            style={{ gridArea: `${r + 1} / ${c + 1} / span 1 / span 1` }}
            onDragOver={(e) => handleDragOver(e, r, c)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, r, c)}
          >
            {app && (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, app.pid)}
                onClick={() => handleStartApp(app.pid)}
                className={style[bem.e('shortcut-container')]}
              >
                <ContextMenu menuItems={shortcutMenus} metaInfo={app}>
                  <Shortcut app={{
                    label: app?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '')?.replace(SUKIN_PRE, ''),
                    ...app
                  }} />
                </ContextMenu>
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  // 渲染窗口切换器调度中心 (Portal 到 body)
  const renderWindowSwitcher = () => {
    if (!showWindowSwitcher) return null;
    return createPortal(
      <>
        {/* 全屏透明遮罩层：点击确认并推入选中的应用 */}
        <div
          onClick={() => handleSelectWindow(selectedWindowIndex)}
          className={style[bem.e('fullscreen')]}
        />
        {/* 调度中心顶部导航图标栏 */}
        <div
          className={style[bem.e('switcher-container')]}
        >
          {/* 渲染时使用经过 Z-Index 排序后的 sortedRunningApps 保证最高在前 */}
          {sortedRunningApps.map((app, index) => {
            const isSelected = selectedWindowIndex === index;
            return (
              <div
                key={app.pid}
                onClick={(e) => { e.stopPropagation(); handleSelectWindow(index); }}
                onMouseEnter={() => setSelectedWindowIndex(index)}
                className={[style[bem.e('switcher-item')],style[bem.is('switchericon-selected',isSelected )]].join(' ')}
              >
                <VfsImage app={app} className={style[bem.e('switch-icon')]} />
              </div>
            );
          })}
        </div>
      </>,
      document.body
    );
  };


  return (
        <>
        <div
          className={style[bem.b()]}
          ref={mainContainerRef}
          id='sukin-os'
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          {/* 桌面主体区域 */}
          <ContextMenu menuItems={deskBookMenuItems}>
            <div
                className={style[bem.e('view')]}
                ref={viewRef}
                onMouseDown={(e) => {
                  // 点击桌面空白处时强制抢夺焦点。
                  // 防止之前鼠标点过内部的 iframe、输入框，导致焦点遗失，引发快捷键无响应。
                  if (e.target === viewRef.current && mainContainerRef.current) {
                    mainContainerRef.current.focus();
                  }
                }}
                style={{
                    gridTemplateColumns: `repeat(${gridSize.cols}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${gridSize.rows}, ${CELL_SIZE}px)`,
                    /* 激活切换器时背景虚化 */
                    filter: showWindowSwitcher ? 'blur(18px) brightness(0.55)' : 'none',
                    transition: 'filter 0.4s ease'
                }}
            >
              {renderGridCells()}
            </div>
          </ContextMenu>

          {/* 渲染正在运行的窗口进程 [保留原始 isRunningApps 渲染保证DOM结构稳定不重排] */}
          {isRunningApps.map((app, index) => {
            // 判断当前窗口是否在调度器中被选中 [通过pid比对避免DOM循序错乱]
            const isSelected = sortedRunningApps[selectedWindowIndex]?.pid === app.pid;
            return (
              <ProcessWindow
                key={app.pid}
                ref={setWindowRef(app.pid)} // 绑定 Ref 到 Map 中
                kernel={kernel}
                pid={app.pid}
                fileName={app?.[ENV_KEY_NAME] || ''}
                initialIndex={index}
                zIndex={zOrders[app.pid] || 10}
                onFocus={() => handleFocus(app.pid)}
                onClose={() => handleColseApp(app.pid)}
                onKill={() => kernel.forceKillProcess(app.pid)}
                initialRect={app.savedState?.window || app?.[ENV_KEY_META_INFO]?.initialSize || WindowSize}
                windowSize={WindowSize}
                isDisplay={setting?.isDisplay || false}
                isShow={showDisplay[app.pid]}
                exposeState={app?.[ENV_KEY_META_INFO]?.exposeState}
                reStartApp={() => reStartApp({ pid: app.pid })}
                forceReStartApp={() => forceReStartApp({ pid: app.pid })}
                generateAppSetting={generateAppSetting}
                app={app}
                /* 传递切换器状态给窗口以应用 sukin-ubuntu 预览样式 */
                showWindowSwitcher={showWindowSwitcher}
                isSelected={isSelected}
              />
            )
          })}


          {/* 编辑 App 配置的 Overlay */}
          {editingApp && (
            <div className={style[bem.e('overlay')]} onClick={() => setEditingApp(null)}>
              <div onClick={(e) => e.stopPropagation()}>
                <CustomApp
                    initialCustom={editingApp?.[ENV_KEY_META_INFO]?.custom}
                    onUpdateConfig={handleCustomUpdate}
                    onClose={() => setEditingApp(null)}
                    editingAppName={editingApp?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '')}
                  />
              </div>
            </div>
          )}

          {/* 窗口切换调度中心入口 */}
          {renderWindowSwitcher()}
        </div>

      {/* 状态栏 */}
      { statusBarOpen && <StatusBar
        blockEdApps={blockEdApps}
        startApp={handleStartApp}
        hibernateApp={handleColseApp}
        // runningApps={runningApps}
        // hibernatedApps={hibernatedApps}
        currentFocus={currentFocus}
        onFocus={handleFocus}
        className={style[bem.is('status-close', !statusBarOpen)]}
        isRunningApps={isRunningApps}
      />
      }

    </>
  );
}

export default React.memo(DeskBook);
