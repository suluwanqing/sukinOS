import React,{ useEffect, useRef, useState ,useCallback} from 'react';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import StatusBar from "./statusBar/layout";
import Shortcut from "./shortcut/layout";
import ProcessWindow from "./window/layout";
import useKernel from "@/hooks/useKernel";
import { WindowSize,SUKIN_EXT,SUKIN_PRE } from "@/utils/config"
import Boot from "./boot/layout"
import ContextMenu from "@/component/contextMenu/layout.jsx"
import {selectorSeting} from "@/store"
import { useSelector } from 'react-redux';
import useAuth from "@/hooks/useAuth"
import {alert} from "@/component/alert/layout"
const bem = createNamespace('deskbook');
function DeskBook() {
  const userInfo=useAuth()
  const { apps, isReady, loading, bootSystem, startApp, hibernateApp,kernel, running, runningApps, hibernatedApps ,blockEdApps} = useKernel();
  const seting = useSelector(selectorSeting)
  const isRunningApps = seting?.isDisplay||false ? apps.filter(a => a.status !== "INSTALLED")
    : apps.filter(a => a.status === "RUNNING")
  const [zOrders, setZOrders] = useState({});
  const [maxZ, setMaxZ] = useState(10);
  const mainContainerRef = useRef(null)
  const [showDisplay, setShowDisplay] = useState({})
  const [statusBarOpen,setStatusBarOpen]=useState(false)
  const handleFocus = (pid) => {
    if (zOrders[pid] === maxZ) return;
    const newMax = maxZ + 1;
    setMaxZ(newMax);
    setZOrders(prev => ({ ...prev, [pid]: newMax }));
  };
  const handleStartApp = (pid) => {
    handleFocus(pid);
    startApp(pid);
  };
  const shortcutMenus = [
    {
        id: 'copy',
        label: '删除',
        icon: '',
        onClick: async (metaInfo) => {
          await kernel.deleteApp(metaInfo.pid,metaInfo.resourceId)
    }
    },
    {
        id: 'edit',
        label: '编辑',
        icon: '',
        onClick: (metaInfo) => {
        console.log('执行编辑操作');
      }
    },
  ]
   const handleToggleStatusBar = useCallback((event) => {
    if (event.ctrlKey && event.key === 'o' && event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      setStatusBarOpen(prev => {
        const newStatus = !prev;
        localStorage.setItem("deskbook-show-status", JSON.stringify(newStatus));
        return newStatus;
      });
    }
  }, []);
   const handleUnload = () => {
       kernel.forceSaveAllStates()
    }
    const handleBeforeUnload = (e) => {
          e.preventDefault()
          //其次就是这个必须要在dom完全加载完毕才会生效
          e.returnValue = "确定离开当前页面吗？"
          return e.returnValue;
    };
  useEffect(() => {
    alert.success("欢迎回来!")
    const initStatus = {}
    apps.forEach(item => {
        initStatus[item.pid]=true
    });
    setShowDisplay(initStatus)
    const statusBar = localStorage.getItem('deskbook-show-status')
    setStatusBarOpen(JSON.parse(statusBar))
     if (mainContainerRef.current) {
       window.addEventListener('beforeunload', handleBeforeUnload);
       window.addEventListener('unload',handleUnload)
     }
      window.addEventListener('keydown', handleToggleStatusBar);
     //这里有问题啊,就是在这个reload事件下无法操作或者周期了,似乎由于js直接死亡导致不会再执行了
       return () => {
         handleUnload()
         window.removeEventListener('keydown',handleToggleStatusBar)
         window.removeEventListener('beforeunload', handleBeforeUnload);
         window.removeEventListener('unload',handleUnload)
     }
  }, []);
  useEffect(() => {
    const showDisplay = {}
    apps.forEach((app) => {//这里的关键是避免无限循环渲染,app是始终是最根源
      if (app.status !== 'RUNNING') {
        showDisplay[app.pid] = false
      } else {
        showDisplay[app.pid]=true
      }
    })
    setShowDisplay(showDisplay)
  }, [apps]);
  if (!isReady) {
    return <Boot boot={bootSystem} loading={loading} />
  }
  const handleColseApp = (pid) => {
    kernel.hibernate(pid)
    if (seting?.isDisplay || false) {
        setShowDisplay({ ...showDisplay, [pid]: false })
    }
  }
  return (
    <div className={style[bem.b()]} ref={mainContainerRef }>
      <div className={style[bem.e('view')]}>
        {/* 如果有快捷方式再注入 */}
        {apps.filter((item)=>item.metaInfo?.custom?.hasShortcut).map((item) => (
          <div
            key={item.pid}
            onClick={() => handleStartApp(item.pid)}
            className={style[bem.e('shortcut-container')]}
          >
          <ContextMenu
              menuItems={shortcutMenus}
              metaInfo={item}
            >
            <Shortcut app={{
              label: item.name.replace(SUKIN_EXT,'').replace(SUKIN_PRE,''),
              ...item
            }} />
        </ContextMenu>
          </div>
        ))}
      </div>

      {isRunningApps.map((app, index) => {
        return (
          <ProcessWindow
            key={app.pid}
            kernel={kernel}
            pid={app.pid}
            fileName={app.name}
            initialIndex={index}
            zIndex={zOrders[app.pid] || 10}
            onFocus={handleFocus}
            onClose={() => handleColseApp(app.pid)}
            onKill={() => kernel.forceKillProcess(app.pid)}
            initialRect={app.savedState?.window || app.metaInfo.initialSize || WindowSize}
            windowSize={WindowSize}
            isDisplay={seting?.isDisplay || false}
            isShow={showDisplay[app.pid]}
            exposeState={app.metaInfo?.exposeState}
        />
          //这个dom是放的总高度即设备
      )
      })}
      <div className={[style[bem.e('status')],style[bem.is('status-close',!statusBarOpen)]].join(' ')}>
        {<StatusBar blockEdApps={blockEdApps} startApp={handleStartApp} hibernateApp={hibernateApp} runningApps={runningApps} hibernatedApps={hibernatedApps} />}
      </div>
    </div>
  );
}

export default React.memo(DeskBook);
