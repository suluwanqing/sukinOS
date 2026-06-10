import { useState, useMemo, useEffect, memo } from 'react'
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
// 组件现在接收 initialRect
const ProcessWindow = ({ app, exposeState, kernel, pid, fileName, onClose, onKill, windowSize, initialRect, zIndex,
  onFocus, isDisplay, isShow, reStartApp, forceReStartApp, generateAppSetting, renderRef, ref,
  showWindowSwitcher, isSelected
}) => {
  const { state, dispatch } = useProcessBridge(pid);
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
    // 开启 singleIframe (共享单实例) 或 useVirtualWorker (主线程虚拟沙箱) 时，均视为桥接/非物理 Iframe 隔离
    const useBridgeMode = (generateAppSetting?.singleIframe || generateAppSetting?.useVirtualWorker || false) && !isParasitism;
    return !isParasitism && !useBridgeMode;
  }, [resource, generateAppSetting]);

  // 将从 props 接收到的 initialRect 传递给 useWindowInteraction hook，并传递物理沙箱标识
  // Hook 内部现在直接操作 DOM
  const { windowElRef, handleMouseDown, setMaximized, getCurrentRect } = useWindowInteraction({
    winSize: resource?.[ENV_KEY_META_INFO]?.custom?.isFullScreen ? windowSize : initialRect,
    allowResize: resource?.[ENV_KEY_META_INFO]?.custom?.allowResize || true,
    isIframeMode: isPhysicalSandbox
  })
  const handleCompound‌MouseDown = (e,type) => {
    onFocus(pid)
    handleMouseDown(e,type)
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
    { id: 'close', icon: <CloseIcon fontSize='small' />, onClick: () => onKill(pid) },
  ].filter(Boolean), [exposeState, showState, isMaximized, handleClose, toggleMaximize, onKill]);

  const resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

  const renderResizeHandles = () => {
    return resizeHandles.map(dir => (
      <div
        key={dir}
        className={[style[bem.e('resize-handle')], style[bem.em('resize-handle', dir)]].join(' ')}
        onMouseDown={(e) => handleCompound‌MouseDown(e, dir)}
      />
    ))
  };

  return (
    <div
      ref={windowElRef}
      className={[
        style[bem.b()],
        customConfig.hideHeaderHover ? 'is-hide-header-hover' : '',
        /* 介入 BEM 控制显隐。调度模式下强制屏蔽 display:none */
        style[bem.is('display', !showWindowSwitcher && isDisplay && (!isShow))],
        style[bem.is('active', showWindowSwitcher ? isSelected : isShow)],
        /* 挂载预制类 */
        showWindowSwitcher && (isSelected ? 'sukin-ubuntu-preview-mode' : 'sukin-ubuntu-hidden-mode')
      ].join(' ')}
      onMouseDown={() => onFocus && onFocus(pid)}
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
      }}
    >
      {/* 绝对定位在顶部最外侧，不占空间，不影响宽高，必须作为 header 的紧邻前置兄弟节点以供 CSS 的 '+' 选择器捕获 */}
      {customConfig.hideHeaderHover && (
        <div className={style[bem.e('hover-trigger')]} />
      )}

      {/* 标题栏 */}
      <div
        className={style[bem.e('header')]}
        onMouseDown={(e) => handleCompound‌MouseDown(e, 'drag')}
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
            onKill={onKill}
            ref={renderRef}
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
    prevProps.app === nextProps.app &&
    prevProps.zIndex === nextProps.zIndex &&
    prevProps.isShow === nextProps.isShow &&
    prevProps.isDisplay === nextProps.isDisplay &&
    prevProps.exposeState === nextProps.exposeState &&
    prevProps.initialRect === nextProps.initialRect &&
    prevProps.onFocus === nextProps.onFocus &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onKill === nextProps.onKill &&
    prevProps.reStartApp === nextProps.reStartApp &&
    prevProps.forceReStartApp === nextProps.forceReStartApp &&
    prevProps.showWindowSwitcher === nextProps.showWindowSwitcher &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.generateAppSetting === nextProps.generateAppSetting
  );
};

export default memo(ProcessWindow, memoEqual);
