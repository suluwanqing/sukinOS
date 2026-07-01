import { useState, useMemo, useEffect, memo, useCallback } from 'react'
import { createNamespace } from '/utils/js/classcreate'
import { useWindowInteraction } from '@/sukinos/hooks/useWindowInteraction'
import useProcessBridge from '@/sukinos/hooks/useProcessBridge'
import DynamicRenderer from './process/layout'
import CloseIcon from '@mui/icons-material/Close'
import CodeIcon from '@mui/icons-material/Code'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule'
import style from "./style.module.css"
import { ENV_KEY_RESOURCE_ID, ENV_KEY_NAME, ENV_KEY_META_INFO } from '@/sukinos/utils/config'
import VfsImage from '@/sukinos/middleware/VfsImage/main.jsx'

const bem = createNamespace('window')
const ScreenIcon = ({ isMaximized }) => {
  return isMaximized ? <FullscreenExitIcon fontSize='small' /> : <FullscreenIcon fontSize='small' />
}

// 会话级别进程挂载跟踪器
// 记录已经完成了首次冷启动的进程 PID，即使组件由于挂起被卸载，此状态依然持久保留。
const launchedProcesses = new Set();

// 组件现在接收 initialRect
const ProcessWindow = ({ app, exposeState, kernel, pid, fileName, onClose, onKill, windowSize, initialRect, zIndex,
  onFocus, isDisplay, isShow, reStartApp, forceReStartApp, generateAppSetting, renderRef, ref,
  showWindowSwitcher, isSelected, isFocused
}) => {
  const custom = useMemo(() => app?.[ENV_KEY_META_INFO]?.custom || {}, [app]);
  const { state, dispatch } = useProcessBridge(pid, {
    isVisible: isShow,
    backgroundSleep: custom.backgroundSleep === true
  });
  const resource = (kernel && state?.config?.[ENV_KEY_RESOURCE_ID]) ? kernel.getResource(state.config[ENV_KEY_RESOURCE_ID]) : null

  // 提取自定义参数
  const customConfig = useMemo(() => {
    const configFromApp = app?.[ENV_KEY_META_INFO]?.custom?.hideHeaderHover;
    const configFromResource = resource?.[ENV_KEY_META_INFO]?.custom?.hideHeaderHover;
    return {
      hideHeaderHover: configFromApp ?? configFromResource ?? false
    }
  }, [app, resource]);

  // 检测是否为物理沙箱模式（非寄生且非桥接模式）
  const isPhysicalSandbox = useMemo(() => {
    const isParasitism = resource?.[ENV_KEY_META_INFO]?.isParasitism === true;
    // 开启 singleIframe (共享单实例) 或 useVirtualWorker (主线程虚拟沙箱) 时，均视为 bridge 隔离
    const useBridgeMode = (generateAppSetting?.singleIframe || generateAppSetting?.useVirtualWorker || false) && !isParasitism;
    return !isParasitism && !useBridgeMode;
  }, [resource, generateAppSetting]);

  //判定冷热启动与恢复布局
  // 检查当前进程在本次前端交互生命周期中是否为首次渲染
  const isFirstLaunch = useMemo(() => {
    if (!launchedProcesses.has(pid)) {
      launchedProcesses.add(pid);
      return true;
    }
    return false;
  }, [pid]);

  // 检查是否包含上一次会话保存下来的窗口几何信息
  const hasSavedWindow = !!app?.savedState?.window;

  // 统一的关闭/杀死进程处理器，彻底关闭时清理 Set 缓存，使得下一次启动可以重新触发 isFullScreen
  const handleKillProcess = useCallback((targetPid) => {
    // 这里需要清除内存缓存
    launchedProcesses.delete(targetPid);
    onKill(targetPid);
  }, [onKill]);

  //空坐标回退
  const calculatedWinSize = useMemo(() => {
    // 首次且无历史存档且配置全屏，则采用全屏尺寸；否则采用传入的 initialRect
    const targetSize = (isFirstLaunch && !hasSavedWindow && resource?.[ENV_KEY_META_INFO]?.custom?.isFullScreen)
      ? windowSize
      : initialRect;

    // 安全回退：如果由于状态同步覆盖原因，导致算出来的目标坐标为 null/undefined，
    // 则强制降级使用标准的 windowSize 兜底，防止窗口折叠、崩溃或缩成一个不可见的小点。
    return targetSize || windowSize;
  }, [isFirstLaunch, hasSavedWindow, resource, windowSize, initialRect]);

  // 将计算后的安全尺寸传递给窗口交互 Hook
  const { windowElRef, handleMouseDown, setMaximized, getCurrentRect } = useWindowInteraction({
    winSize: calculatedWinSize,
    allowResize: resource?.[ENV_KEY_META_INFO]?.custom?.allowResize || true,
    isIframeMode: isPhysicalSandbox
  })
  const handleCompoundMouseDown = (e, type) => {
    onFocus(pid)
    handleMouseDown(e, type)
  }

  // 非焦点窗口边缘 resize 聚焦优先：基于鼠标位置计算缩放方向
  const EDGE_SIZE = 8
  const handleEdgeMouseDown = (e) => {
    if (isFocused || !windowElRef.current) return
    e.stopPropagation()
    const rect = windowElRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const onLeft = x < EDGE_SIZE
    const onRight = x > rect.width - EDGE_SIZE
    const onTop = y < EDGE_SIZE
    const onBottom = y > rect.height - EDGE_SIZE

    let dir = null
    if (onTop && onLeft) dir = 'nw'
    else if (onTop && onRight) dir = 'ne'
    else if (onBottom && onLeft) dir = 'sw'
    else if (onBottom && onRight) dir = 'se'
    else if (onTop) dir = 'n'
    else if (onBottom) dir = 's'
    else if (onLeft) dir = 'w'
    else if (onRight) dir = 'e'

    if (dir) {
      onFocus(pid)
      handleMouseDown(e, dir)
    }
  }
  // 将内部的 DOM 引用，向外暴露给父组件 DeskBook 传入的 ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') ref(windowElRef.current);
      else ref.current = windowElRef.current;
    }
  }, [ref, windowElRef]);
  // 注意这个逻辑就是确保了,系统APP绝不是只是根据metaInfo获取的,这里是直接从系统注册表加载出来的，我们的metaInfo.appType只是做一个标记。
  const isSystemApp = useMemo(() => kernel ? kernel.isSystemApp(pid) : false, [kernel, pid]);
  const headerHeight = 28//header，还是比较重要。主要就是涉及高度问题
  const name = state?.config?.[ENV_KEY_NAME] || fileName.replace('.sukin-worker.js', '')
  const iconUrl = resource?.[ENV_KEY_META_INFO]?.icon;
  const [showState, setShowState] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const toggleMaximize = () => {
    const nextMaximizedState = !isMaximized
    setMaximized(nextMaximizedState)
    setIsMaximized(nextMaximizedState)
  };

  // 仅在组件首次挂载时聚焦，处理会话恢复等边界场景
  // 不再依赖 state 变化触发聚焦，避免 App 内部状态更新引发 DeskBook 全局重渲染
  useEffect(() => {
    onFocus(pid)
  }, [])

  const handleClose = () => {
    if (windowElRef.current) {
      const currentRect = getCurrentRect()
      kernel.saveWindowState(pid, currentRect).then(() => {
        onClose(pid)
      });
    } else {
      onClose(pid);
    }
  };


  const headerFuncs = useMemo(() => [
    ...(exposeState ? [{ id: 'state', icon: <CodeIcon fontSize='small' />, onClick: () => setShowState(!showState) }] : []),
    { id: 'back', icon: <HorizontalRuleIcon fontSize='small' />, onClick: handleClose },
    { id: 'window', icon: <ScreenIcon isMaximized={isMaximized} />, onClick: toggleMaximize },
    { id: 'close', icon: <CloseIcon fontSize='small' />, onClick: () => handleKillProcess(pid) },
  ].filter(Boolean), [exposeState, showState, isMaximized, handleClose, toggleMaximize, handleKillProcess, pid]);

  const resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

  const renderResizeHandles = () => {
    // 仅焦点窗口渲染 8 个可视缩放手柄，减少非活动窗口的 GPU 合成层和 DOM 节点数
    if (!isFocused) return null
    return resizeHandles.map(dir => (
      <div
        key={dir}
        className={[style[bem.e('resize-handle')], style[bem.em('resize-handle', dir)]].join(' ')}
        onMouseDown={(e) => handleCompoundMouseDown(e, dir)}
      />
    ))
  };

  return (
    <div
      ref={windowElRef}
      className={[
        style[bem.b()],
        customConfig.hideHeaderHover ? 'is-hide-header-hover' : '',
        /* BEM 控制活性显隐 */
        style[bem.is('active', showWindowSwitcher ? isSelected : isShow)],
        /* BEM 控制焦点，GPU 合成层分配依据 */
        style[bem.is('focused', isFocused)],
        /* 挂载预制类 */
        showWindowSwitcher && (isSelected ? 'sukin-ubuntu-preview-mode' : 'sukin-ubuntu-hidden-mode')
      ].join(' ')}
      onMouseDown={(e) => {
        // 非焦点窗口边缘点击触发聚焦优先 resize
        handleEdgeMouseDown(e)
        if (!e.defaultPrevented) onFocus && onFocus(pid)
      }}
      data-header-height={headerHeight}
      style={{
        position: 'absolute',
        zIndex: zIndex || 10,
        /* 内联样式强制 display 解决空白，同时应用 will-change 优化电影感缩放动画性能 */
        display: showWindowSwitcher ? (isSelected ? 'flex' : 'none') : undefined,
        /*
           对于非活动后台静默窗口，启用 content-visibility: hidden 挂起渲染更新
           这可以在保留 iframe 内存状态（不重载）的前提下，完全免除隐藏窗口的 GPU 绘制与排版开销
        */
        contentVisibility: (!showWindowSwitcher && !isShow) ? 'hidden' : 'auto',
        containIntrinsicSize: (!showWindowSwitcher && !isShow) ? '500px 400px' : undefined,
      }}
    >
      {/* 绝对定位在顶部最外侧，不占空间，不影响宽高，必须作为 header 的紧邻前置兄弟节点以供 CSS 的 '+' 选择器捕获 */}
      {customConfig.hideHeaderHover && (
        <div className={style[bem.e('hover-trigger')]} />
      )}

      {/* 标题栏 */}
      <div
        className={style[bem.e('header')]}
        onMouseDown={(e) => handleCompoundMouseDown(e, 'drag')}
        onDoubleClick={toggleMaximize}
        /* 调度模式下彻底移除 Header 干扰 */
        style={{ display: showWindowSwitcher ? 'none' : 'flex' }}
      >
        {iconUrl && <VfsImage app={app} className={style[bem.e('icon')]} />}
        <span className={style[bem.e('name')]}>{name}</span>
        <div className={style[bem.e('actions')]} onMouseDown={e => e.stopPropagation()}>
          {headerFuncs.map((item) => (
            <span key={item.id} onClick={(e) => { e.stopPropagation(); item.onClick(); }}>
              {item.icon}
            </span>
          ))}
        </div>
      </div>

      <div className={style[bem.e('content')]}>
        {state ? (
          <DynamicRenderer
            key={pid}
            generateAppSetting={generateAppSetting}
            resource={resource}
            isSystemApp={isSystemApp}
            state={state}
            dispatch={dispatch}
            pid={pid}
            onFocus={onFocus}
            forceReStartApp={forceReStartApp}
            reStartApp={reStartApp}
            onKill={handleKillProcess}
            ref={renderRef}
            isVisible={isShow}
          />
        ) : (
          /* 挂起状态的降级预览 */
          <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
              <VfsImage app={app} />
          </div>
        )}
      </div>

      {!showWindowSwitcher && renderResizeHandles()}
      {showState && (
        <div className={style[bem.e('state-panel')]}>
          <div className={style[bem.e('state-header')]}>
            <span>进程状态数据</span>
            <button onClick={() => setShowState(false)} className={style[bem.e('state-close')]}>×</button>
          </div>
          <pre className={style[bem.e('state-content')]}>{JSON.stringify(state, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

const memoEqual = (prevProps, nextProps) => {
  return (
    prevProps.pid === nextProps.pid &&
    prevProps.zIndex === nextProps.zIndex &&
    prevProps.isShow === nextProps.isShow &&
    prevProps.isDisplay === nextProps.isDisplay &&
    prevProps.exposeState === nextProps.exposeState &&
    prevProps.showWindowSwitcher === nextProps.showWindowSwitcher &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFocused === nextProps.isFocused
  );
};

export default memo(ProcessWindow, memoEqual);
