import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import StatusBar from "./statusBar/layout"
import WindowSwitcher from "./switcher/layout"
import DesktopGrid from "./views/DesktopGrid"
import MobilePagingGrid from "./views/MobilePagingGrid"
import WindowLayer from "./views/WindowLayer"
import AppEditOverlay from "./views/AppEditOverlay"
import FloatingBall from "./floatingBall/layout"
import { CELL_SIZE, MOBILE_CELL_SIZE, MOBILE_GAP_SIZE, MOBILE_PADDING } from "./constants"
import useKernel from "@/sukinos/hooks/useKernel"
import { ENV_KEY_RESOURCE_ID } from "@/sukinos/utils/config"
import Boot from "./boot/layout"
import ContextMenu from "@/component/contextMenu/layout"
import { selectorSetting, selectGenerateApp, sukinOsActions } from "../store"
import { useDispatch, useSelector } from 'react-redux'
import usePersonalization from "@/sukinos/hooks/usePersonalization"
import { confirm } from '@/component/confirm/layout'
import useDeskWindows from "./hooks/useDeskWindows"
import useDeskGrid from "./hooks/useDeskGrid"
import useDeskShortcuts from "./hooks/useDeskShortcuts"
import useEdgeGestures from "./hooks/useEdgeGestures"
import useWindowSlots from "./hooks/useWindowSlots"
import useBeforeUnload from "./hooks/useBeforeUnload"
import { useViewportMode } from "@/sukinos/hooks/useViewportMode"

const bem = createNamespace('deskbook')

function DeskBook() {
  // --- 初始化 Hooks ---
  const dispatch = useDispatch()
  const { refreshConfig, config: personalConfig } = usePersonalization(); // 个性化配置 Hook
  const { isMobile, isTouch } = useViewportMode();

  // --- 内核状态与方法 ---
  const {
    apps, isReady, loading, bootSystem, startApp, kernel,
    blockEdApps, reStartApp, forceReStartApp
  } = useKernel();

  // --- Redux 状态选择器 ---
  const setting = useSelector(selectorSetting)
  const generateAppSetting = useSelector(selectGenerateApp)

  // --- 窗口与调度 ---
  const {
    isRunningApps, showDisplay, activeWindowPids, sortedRunningApps,
    deferredZOrders, deferredCurrentFocus, currentFocus,
    showWindowSwitcher, switcherFromBack, selectedWindowIndex, setSelectedWindowIndex, setShowWindowSwitcher,
    handleFocus, handleStartApp, handleColseApp, handleForceKill,
    closeWindowSwitcher, openSwitcherForBack, handleMobileDismissToHome, handleSelectWindow, handleSwitcherAppSelect
  } = useDeskWindows({ apps, setting, kernel, startApp, isMobile, personalConfig, generateAppSetting });

  // --- DOM 引用 ---
  const mainContainerRef = useRef(null) // 主容器引用
  const viewRef = useRef(null)         // 桌面视图引用

  // --- 图标网格 ---
  const {
    gridSize, dragOverCell, displayPositions,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    refreshDeskLayout, handleUnload
  } = useDeskGrid({ apps, isReady, isMobile, kernel, refreshConfig, mainContainerRef, viewRef });
  useBeforeUnload(handleUnload);

  // --- UI 状态管理 ---
  const [statusBarOpen, setStatusBarOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('deskbook-show-status') ?? 'true')
    } catch {
      return true
    }
  })
  const toggleStatusBar = useCallback(() => {
    setStatusBarOpen(prev => {
      const newStatus = !prev;
      localStorage.setItem("deskbook-show-status", JSON.stringify(newStatus));
      return newStatus;
    });
  }, [])

  // --- 应用编辑状态 ---
  const [editingApp, setEditingApp] = useState(null);

  const { windowLayerRef, windowSlotsRef, getWindowSlot, releaseWindowSlot } = useWindowSlots(isRunningApps);

  useDeskShortcuts({
    isMobile,
    showWindowSwitcher, sortedRunningApps, selectedWindowIndex,
    handleStartApp, closeWindowSwitcher,
    setShowWindowSwitcher, setSelectedWindowIndex,
    refreshDeskLayout, handleMobileDismissToHome, toggleStatusBar
  });

  // --- 桌面右键菜单项 ---
  const deskBookMenuItems = [
    {
      id: 'refresh',
      label: '刷新布局',
      onClick: () => {
        refreshDeskLayout();
      }
    },
    { type: 'divider' },
  ]

  // --- 图标右键菜单项（桌面图标与状态栏共用同一份） ---
  const shortcutMenus = useMemo(() => [
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
  ], [kernel])

  // 当系统 Ready 且主容器 Ref 挂载后，强制刷新配置以应用壁纸
  useEffect(() => {
    if (isReady && mainContainerRef.current) {
        // 延迟一帧确保 DOM 属性已在浏览器中完全生效
        requestAnimationFrame(() => {
            refreshConfig();
        });
    }
  }, [isReady, refreshConfig]);

  // 管理运行程序和分配内核 Dispatch
  useEffect(() => {
    kernel.setDispatch(dispatch);
  }, [dispatch, kernel]);

  // 强制更新被内核拦截时，直接引导去商店定位该应用
  const forceQueueRef = useRef([])
  const forceActiveRef = useRef(null)
  const updatePromptRef = useRef(false)
  const openStoreForUpdate = useCallback((keyword, resourceId) => {
    dispatch(sukinOsActions.requestStoreSearch({ keyword: keyword || '', resourceId: resourceId || '' }));
    const storePid = kernel.getPidByResourceId('sys-store');
    if (storePid) {
      kernel.activate({ pid: storePid, reason: 'user' });
    }
  }, [dispatch, kernel]);
  const openStoreUpdates = useCallback(() => {
    dispatch(sukinOsActions.requestStoreSearch({ nav: 'update' }));
    const storePid = kernel.getPidByResourceId('sys-store');
    if (storePid) {
      kernel.activate({ pid: storePid, reason: 'user' });
    }
  }, [dispatch, kernel]);

  // 多个应用同时被强更拦截时逐个提示，不堆叠弹窗也不漏提示
  const flushForcePrompt = useCallback(() => {
    if (forceActiveRef.current || forceQueueRef.current.length === 0) return;
    const change = forceQueueRef.current.shift();
    forceActiveRef.current = change;
    // 等当前弹窗卸载后再弹下一个，避免 confirm 内部单例互相覆盖
    const close = () => {
      forceActiveRef.current = null;
      setTimeout(flushForcePrompt, 0);
    };
    confirm.show({
      title: '需要更新',
      content: `「${change.appName || '该应用'}」已发布强制更新 V${change.version}，更新后才能继续使用。`,
      confirmText: '前往更新',
      cancelText: '稍后',
      onConfirm: () => {
        openStoreForUpdate(change.appName, change.resourceId);
        close();
      },
      onCancel: close
    });
  }, [openStoreForUpdate]);

  useEffect(() => {
    return kernel.subscribeSystem((change) => {
      if (change?.type === 'APP_FORCE_UPDATE' && change.resourceId) {
        const queued = [forceActiveRef.current, ...forceQueueRef.current];
        if (queued.some(item => item?.resourceId === change.resourceId)) return;
        forceQueueRef.current.push(change);
        flushForcePrompt();
        return;
      }
      if (change?.type === 'APP_UPDATE_AVAILABLE') {
        const updates = change.updates || [];
        if (!updates.length || updatePromptRef.current) return;
        updatePromptRef.current = true;
        const names = updates.slice(0, 2).map(item => `「${item.appName || item.resourceId}」`).join('、');
        const label = updates.length > 2 ? `${names} 等 ${updates.length} 个应用` : names;
        confirm.show({
          title: '发现应用更新',
          content: `${label}有可用更新，可前往商店更新页查看。`,
          confirmText: '前往更新',
          cancelText: '稍后',
          onConfirm: () => {
            updatePromptRef.current = false;
            openStoreUpdates();
          },
          onCancel: () => {
            updatePromptRef.current = false;
          }
        });
      }
    });
  }, [kernel, flushForcePrompt, openStoreUpdates]);

  // 桌面档：启动/聚焦 APP 时自动隐藏状态栏
  useEffect(() => {
    if (isMobile) return;
    if (!personalConfig?.autoHideStatusBar || !currentFocus) return;
    setStatusBarOpen(false);
  }, [currentFocus, personalConfig?.autoHideStatusBar, isMobile]);

  // 窗口铺满到安全区，状态栏只是浮层
  const statusBarVisible = !isMobile && statusBarOpen;

  const floatingBallEnabled = isMobile && !!personalConfig?.mobileFloatingBall;
  useEffect(() => {
    if (!floatingBallEnabled) return;
    const root = document.documentElement;
    root.style.setProperty('--su-gesture-band', '0px');
    root.style.setProperty('--su-gesture-bottom', 'var(--su-safe-bottom)');
    return () => {
      root.style.removeProperty('--su-gesture-band');
      root.style.removeProperty('--su-gesture-bottom');
    };
  }, [floatingBallEnabled]);

  // --- 移动端底部手势：轻划回桌面，上滑进多任务 ---
  const { handleEdgePointerDown, handleEdgePointerMove, handleEdgePointerUp } = useEdgeGestures({
    isMobile,
    showWindowSwitcher,
    setShowWindowSwitcher,
    closeWindowSwitcher,
    dismissToHome: handleMobileDismissToHome
  });

  // 系统启动状态检查
  if (!isReady) {
    return <Boot boot={bootSystem} loading={loading} />
  }

  const cellSize = isMobile ? MOBILE_CELL_SIZE : CELL_SIZE;

  return (
        <>
        <div
          className={style[bem.b()]}
          ref={mainContainerRef}
          id='sukin-os'
          tabIndex={-1}
          style={{ outline: 'none' }}
        >
          {/* 独立的防干扰背景容器。React因为这个div没有子节点，所以永远不会去清理它的内部，防止视频背景被刷掉 */}
        <div id="su-os-bg-layer" className={style[bem.e('bg-layer')]} style={{
          position: 'absolute',
          willChange: 'transform',
          transform: 'translateZ(0)',
          top: -1, left: -1, width: 'calc(100% + 2px)', height: 'calc(100% + 2px)', zIndex: -1, pointerEvents: 'none', overflow: 'hidden'
        }}></div>
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
                    gridTemplateColumns: isMobile ? '1fr' : `repeat(${gridSize.cols}, ${cellSize}px)`,
                    gridTemplateRows: isMobile ? '1fr' : `repeat(${gridSize.rows}, ${cellSize}px)`,
                    justifyContent: 'center',
                    alignContent: 'start',
                    /* 激活切换器时背景虚化 */
                    filter: showWindowSwitcher ? 'blur(8px) brightness(0.65)' : 'none',
                    ...(isMobile ? {
                        '--custom-deskbook-padding': `${MOBILE_PADDING}px`,
                        '--custom-deskbook-grid-gap': `${MOBILE_GAP_SIZE}px`,
                    } : {}),
                }}
            >
              {isMobile ? (
                <MobilePagingGrid
                  apps={apps}
                  displayPositions={displayPositions}
                  gridSize={gridSize}
                  shortcutMenus={shortcutMenus}
                  mobileWallpaperScroll={personalConfig?.mobileWallpaperScroll}
                  onStartApp={handleStartApp}
                />
              ) : (
                <DesktopGrid
                  apps={apps}
                  displayPositions={displayPositions}
                  gridSize={gridSize}
                  dragOverCell={dragOverCell}
                  isTouch={isTouch}
                  shortcutMenus={shortcutMenus}
                  onStartApp={handleStartApp}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              )}
            </div>
          </ContextMenu>

          {/* 窗口挂载层：不占布局，槽节点由卡片搬走 */}
          <div ref={windowLayerRef} id="su-window-layer" style={{ display: 'contents' }} />

          {/* 渲染正在运行的窗口进程 — 宿主进程级视口保活 */}
          <WindowLayer
            isRunningApps={isRunningApps}
            activeWindowPids={activeWindowPids}
            deferredZOrders={deferredZOrders}
            deferredCurrentFocus={deferredCurrentFocus}
            sortedRunningApps={sortedRunningApps}
            selectedWindowIndex={selectedWindowIndex}
            showWindowSwitcher={showWindowSwitcher}
            isMobile={isMobile}
            kernel={kernel}
            showDisplay={showDisplay}
            setting={setting}
            generateAppSetting={generateAppSetting}
            reStartApp={reStartApp}
            forceReStartApp={forceReStartApp}
            onFocus={handleFocus}
            onClose={handleColseApp}
            onKill={handleForceKill}
            getWindowSlot={getWindowSlot}
          />

          {/* 编辑 App 配置的 Overlay */}
          {editingApp && (
            <AppEditOverlay
              app={editingApp}
              kernel={kernel}
              onChange={(updatedApp) => setEditingApp({ ...updatedApp })}
              onClose={() => setEditingApp(null)}
            />
          )}

          {/* 窗口切换调度中心入口 */}
          <WindowSwitcher
            showWindowSwitcher={showWindowSwitcher}
            isMobile={isMobile}
            sortedRunningApps={sortedRunningApps}
            selectedWindowIndex={selectedWindowIndex}
            onSelect={handleSelectWindow}
            onHoverIndex={setSelectedWindowIndex}
            onSelectApp={handleSwitcherAppSelect}
            onDismissAll={switcherFromBack ? closeWindowSwitcher : handleMobileDismissToHome}
            onForceKill={handleForceKill}
            windowSlotsRef={windowSlotsRef}
            onReleaseSlot={releaseWindowSlot}
          />

          {floatingBallEnabled && (
            <FloatingBall
              apps={apps}
              currentFocus={currentFocus}
              isRunningApps={isRunningApps}
              showWindowSwitcher={showWindowSwitcher}
              kernel={kernel}
              ballSize={personalConfig?.mobileFloatingBallSize}
              ballOpacity={personalConfig?.mobileFloatingBallOpacity}
              ballColor={personalConfig?.mobileFloatingBallColor}
              ballTextColor={personalConfig?.mobileFloatingBallTextColor}
              ballIconOnly={!!personalConfig?.mobileFloatingBallIconOnly}
              onStartApp={handleStartApp}
              onOpenSwitcher={openSwitcherForBack}
              onHome={handleMobileDismissToHome}
            />
          )}


          {isMobile && !floatingBallEnabled && !showWindowSwitcher && (
            <div
              role="button"
              tabIndex={0}
              aria-label="底部沉浸式手势感应区"
              className={style[bem.e('status-edge')]}
              onPointerDown={handleEdgePointerDown}
              onPointerMove={handleEdgePointerMove}
              onPointerUp={handleEdgePointerUp}
              onPointerCancel={handleEdgePointerUp}
            />
          )}
        </div>

      {statusBarVisible && <StatusBar
        blockEdApps={blockEdApps}
        startApp={handleStartApp}
        hibernateApp={handleColseApp}
        currentFocus={currentFocus}
        onFocus={handleFocus}
        isRunningApps={isRunningApps}
        contextMenuItems={shortcutMenus}
      />}

    </>
  );
}

export default React.memo(DeskBook);
