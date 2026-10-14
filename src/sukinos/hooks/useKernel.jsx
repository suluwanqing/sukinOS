import { useState, useEffect, useCallback } from "react"
import kernel from "@/sukinos/utils/process/kernel"
import { selectFileSystemConfig, selectorUserInfo, selectGenerateApp } from '@/sukinos/store';
import { useSelector } from "react-redux";
import { ENV_KEY_META_INFO } from "@/sukinos/utils/config";

export const useKernel = () => {
  const fileSystemConfig = useSelector(selectFileSystemConfig)
  const userInfo = useSelector(selectorUserInfo)
  const generateAppConfig = useSelector(selectGenerateApp)
  // kernel.dirHandle 存在就算就绪
  const checkIsKernelReady = () => !!kernel.dirHandle;
  // 挂载时不主动调 bootSystem：每次启动都重跑文件句柄处理，开销大；isReady 的初值直接读真实状态即可
  const [apps, setApps] = useState([])
  const [isReady, setIsReady] = useState(checkIsKernelReady())
  const [loading, setLoading] = useState(false)
  const [runningApps, setRunnigApps] = useState([])
  const [hibernatedApps, setHibernatedApps] = useState([])
  const [blockEdApps, setBlockEdApps] = useState([])
  const [userApps, setUserApps] = useState([])

  const refreshAppStatus = useCallback(() => {
    const running = kernel.getRunningApps()
    setRunnigApps(running)
    const hibernated = kernel.getHibernatedApps()
    setHibernatedApps(hibernated)
    const blockEd = kernel.getBlockEdApps()
    setBlockEdApps(blockEd)
    const user = kernel.getInstalledApps()
    setUserApps(user)
  }, []);

  const updateAppsByPid = useCallback((pid, updater) => {
    setApps(prev => {
      const index = prev.findIndex(app => app.pid === pid)
      if (index < 0) return prev
      const next = [...prev]
      const updated = updater(next[index])
      if (updated === next[index]) return prev
      next[index] = updated
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    const list = await kernel.getApps()
    setApps(list)
    refreshAppStatus()
  }, [refreshAppStatus])

  const applyDelta = useCallback((change) => {
    if (!change || !change.type) {
      refresh()
      return
    }

    switch (change.type) {
      case 'APP_STATUS': {
        updateAppsByPid(change.pid, (app) => {
          if (!app || app.status === change.status) return app
          const kernelApp = kernel.getApp(change.pid)
          return {
            ...app,
            status: change.status,
            isRunning: change.status === 'RUNNING',
            savedState: kernelApp?.savedState ?? app.savedState,
          }
        })
        refreshAppStatus()
        return
      }
      case 'APP_META': {
        updateAppsByPid(change.pid, (app) => {
          if (!app) return app
          const nextMeta = change.meta || app[ENV_KEY_META_INFO]
          if (nextMeta === app[ENV_KEY_META_INFO]) return app
          return { ...app, [ENV_KEY_META_INFO]: nextMeta }
        })
        refreshAppStatus()
        return
      }
      case 'APP_REGISTRY':
      default:
        setIsReady(checkIsKernelReady())
        refresh()
    }
  }, [refresh, refreshAppStatus, updateAppsByPid])

  const bootSystem = async (config) => {
    setLoading(true)
    const status = await kernel.init({user:userInfo,config})
    setIsReady(status)
    if (status) {
      refresh()
    }
    setLoading(false)
  }

  useEffect(() => {
    // 不再用 if (!isReady) return 拦订阅：初值可能是 false，之后 kernel 变好了也要能跟上
    const unsub = kernel.subscribeSystem((detail) => {
      applyDelta(detail)
    })

    // 如果内核已经是就绪状态，进来先刷一次
    if (checkIsKernelReady()) {
      refresh();
    }

    return () => { unsub() }
  }, [refresh, applyDelta])

  const reinit = useCallback(async (userId) => {
    setLoading(true)
    await kernel.reinit(userId)
    setIsReady(true)
    await refresh()
    setLoading(false)
  }, [refresh])

  return {
    kernel,
    apps,
    isReady, // 由订阅与 refresh 保持同步，不再只靠 bootSystem
    loading,
    bootSystem: () => bootSystem({
      isPrivate: fileSystemConfig?.isPrivate || true,
      useVirtualWorker: generateAppConfig?.useVirtualWorker || false
    }),
    reinit,
    running: [...runningApps, ...hibernatedApps],
    runningApps,
    hibernatedApps,
    blockEdApps,
    userApps,
    startApp: (args) => kernel.startProcess({ ...args }),
    hibernateApp: (pid) => kernel.hibernate(pid),
    deleteApp: (args) => kernel.deleteApp({ ...args }),
    reStartApp: (args) => kernel.reStartApp({ pid: args.pid }),
    forceReStartApp: (args) => kernel.forceReStartApp({ pid: args.pid })
  }
}

export default useKernel;
