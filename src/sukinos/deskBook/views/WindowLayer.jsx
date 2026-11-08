import { createPortal } from 'react-dom'
import ProcessWindow from "../window/layout"
import AdaptiveWindowPlaceholder from "../AdaptivePlaceholder"
import { HostKeepAlive } from "@/sukinos/components/KeepAliveViewport"
import { WindowSize, ENV_KEY_META_INFO, ENV_KEY_NAME } from "@/sukinos/utils/config"

// 不包 memo：HostKeepAlive 每次都收到新的 render 闭包，包住只会误导后续维护
function WindowLayer({
  isRunningApps, activeWindowPids, deferredZOrders, deferredCurrentFocus,
  sortedRunningApps, selectedWindowIndex, showWindowSwitcher, isMobile,
  kernel, showDisplay, setting, generateAppSetting, reStartApp, forceReStartApp,
  onFocus, onClose, onKill, getWindowSlot
}) {
  return (
    <HostKeepAlive
      apps={isRunningApps}
      activePids={activeWindowPids}
      renderPlaceholder={(app) => (
        <AdaptiveWindowPlaceholder
          key={app.pid}
          pid={app.pid}
          app={app}
          zIndex={deferredZOrders[app.pid] || 10}
        />
      )}
      renderWindow={(app) => {
        // 通过 pid 比对判断选中项，避免 DOM 顺序错乱
        const isSelected = sortedRunningApps[selectedWindowIndex]?.pid === app.pid;
        const index = isRunningApps.findIndex(a => a.pid === app.pid);
        const slot = getWindowSlot(app.pid);

        return createPortal(
          <ProcessWindow
            kernel={kernel}
            pid={app.pid}
            fileName={app?.[ENV_KEY_NAME] || ''}
            initialIndex={index}
            zIndex={deferredZOrders[app.pid] || 10}
            onFocus={onFocus}
            onClose={onClose}
            onKill={onKill}
            initialRect={app.savedState?.window || app?.[ENV_KEY_META_INFO]?.initialSize || WindowSize}
            windowSize={WindowSize}
            isDisplay={setting?.isDisplay || false}
            isShow={showDisplay[app.pid]}
            // 移动端调度器里所有窗口都是卡片预览，不叠加焦点合成层
            isFocused={showWindowSwitcher && isMobile ? false : deferredCurrentFocus === app.pid}
            exposeState={app?.[ENV_KEY_META_INFO]?.exposeState}
            reStartApp={reStartApp}
            forceReStartApp={forceReStartApp}
            generateAppSetting={generateAppSetting}
            app={app}
            showWindowSwitcher={showWindowSwitcher}
            isSelected={isSelected}
          />,
          slot,
          app.pid
        )
      }}
    />
  )
}

export default WindowLayer
