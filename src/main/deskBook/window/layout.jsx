import React,{ useState, useMemo, useEffect } from 'react';
import { createNamespace } from '@/utils/js/classcreate';
import { useWindowInteraction } from '@/hooks/useWindowInteraction';
import useProcessBridge from '@/hooks/useProcessBridge';
import DynamicRenderer from './process/layout';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import style from "./style.module.css";

const bem = createNamespace('window');
const ScreenIcon = ({ isMaximized }) => {
  return isMaximized ? <FullscreenExitIcon fontSize='small' /> : <FullscreenIcon fontSize='small' />;
}

// 组件现在接收 initialRect
const ProcessWindow = ({ exposeState,kernel, pid, fileName, onClose, onKill, windowSize, initialRect, zIndex,
  onFocus,isDisplay,isShow
}) => {
  const { state, dispatch } = useProcessBridge(pid);
  const resource = (kernel && state?.config?.resourceId) ? kernel.getResource(state.config.resourceId) : null;
  //将从 props 接收到的 initialRect 传递给 useWindowInteraction hook
  const { windowElRef, handleMouseDown, setMaximized } = useWindowInteraction(initialRect)
  const isSystemApp = useMemo(() => {
    return kernel ? kernel.isSystemApp(pid) : false;
  }, [kernel, pid]);
  const headerHeight=28  //header，还是比较重要的。主要就是涉及高度问题
  const name = state?.config?.name || fileName.replace('.sukin-worker.js', '');
  const iconUrl = resource?.metaInfo?.icon;
  const [showState, setShowState] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const toggleMaximize = () => {
    const nextMaximizedState = !isMaximized;
    setMaximized(nextMaximizedState);
    setIsMaximized(nextMaximizedState);
  };

  // onClose (挂起) 按钮的逻辑
  const handleClose = () => {
    if (windowElRef.current) {
        const finalRect = windowElRef.current.getBoundingClientRect();
        const rectToSave = {
            x: finalRect.left,
            y: finalRect.top,
            w: finalRect.width,
            h: finalRect.height
      };
        kernel.saveWindowState(pid, rectToSave).then(() => {
            onClose();
        });
    } else {
        // 如果ref不存在，直接调用onClose
        onClose();
    }
  };
const headerFuncs = [
  ...(exposeState ? [
    { id: 'state', icon: <CodeIcon fontSize='small' />, onClick: () => setShowState(!showState) }
  ] : []),
  { id: 'back', icon: <HorizontalRuleIcon fontSize='small' />, onClick: handleClose },
  { id: 'window', icon: <ScreenIcon isMaximized={isMaximized} />, onClick: toggleMaximize },
  { id: 'close', icon: <CloseIcon fontSize='small' />, onClick: onKill },
].filter(Boolean);
  const resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  return (
    <div
      ref={windowElRef}
      className={[style[bem.b()], style[bem.is('display', isDisplay&&(!isShow))], style[bem.is('active', isShow)] ].join(' ')}
      onMouseDown={() => onFocus && onFocus(pid)}
      data-header-height={headerHeight}
      style={{
        position: 'absolute',
        zIndex: zIndex || 10,
        // 移除transition以避免恢复状态时出现动画
        // transition: isMaximized ? 'none' : 'width 0.2s ease-out, height 0.2s ease-out',
      }}
    >
      <div
        className={style[bem.e('header')]}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
              onDoubleClick={toggleMaximize}
      >
        {iconUrl && <img src={iconUrl} alt="icon" className={style[bem.e('icon')]} />}
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
            resource={resource}
            isSystemApp={isSystemApp}
            state={state}
            dispatch={dispatch}
            pid={pid}
          />
        ) : <div>加载中...</div>}
      </div>

      {resizeHandles.map(dir => (
        <div
          key={dir}
          className={[style[bem.e('resize-handle')], style[bem.em('resize-handle', dir)]].join(' ')}
          onMouseDown={(e) => handleMouseDown(e, dir)}
        />
      ))}

      {showState && (
        <div className={style[bem.e('state-panel')]}>
          <div className={style[bem.e('state-header')]}>
            <span>进程状态数据</span>
            <button onClick={() => setShowState(false)} className={style[bem.e('state-close')]}>
              ×
            </button>
          </div>
          <pre className={style[bem.e('state-content')]}>{JSON.stringify(state, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProcessWindow);
