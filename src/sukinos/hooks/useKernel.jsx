import { useState, useEffect, useCallback } from "react"
import kernel from "@/sukinos/utils/process/kernel"
import { selectFileSystemConfig,selectorUserInfo} from '@/sukinos/store';
import { useSelector } from "react-redux";

export const useKernel = () => {
  const fileSystemConfig = useSelector(selectFileSystemConfig)
  const userInfo=useSelector(selectorUserInfo)
  // 初始化时直接检查内核是否已经就绪
  // 如果 kernel 已经有 dirHandle 或者已经初始化过，我们就认为它是 ready 的
  const checkIsKernelReady = () => !!kernel.dirHandle;
  /*
    旧版本的问题在于每次都是isReady初始化都是false,但是没有执行bootSystem去更新/获取返回kernel的状态，去更新
    只有执行bootSystem才会更新状态,而手动调用肯定会有开销主要是,每次启动会触发文件句柄处理
  */
  const [apps, setApps] = useState([])
  const [isReady, setIsReady] = useState(checkIsKernelReady()) // 初始值改为真实检查
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

  const refresh = useCallback(async () => {
    const list = await kernel.getApps()
    setApps(list)
    refreshAppStatus()
  }, [refreshAppStatus])

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
    // 即使初始化时 isReady 是 false，如果之后 kernel 变好了，也要能跟进
    // 这里取消 if (!isReady) return，改为在 refresh 里判断，或者由外部 bootSystem 驱动

    // 如果已经 ready 或者检测到 ready，则订阅
    const unsub = kernel.subscribeSystem(() => {
      console.log("[useKernel] 内核状态变化，刷新 UI...");
      refresh();
    })

    // 如果内核已经是就绪状态，进来先刷一次
    if (checkIsKernelReady()) {
      refresh();
    }

    return () => { unsub() }
  }, [refresh])

  return {
    kernel,
    apps,
    isReady, // 现在的 isReady 会随着 refresh 自动保持同步,而不是bootSystem
    loading,
    bootSystem: () => bootSystem({ isPrivate: fileSystemConfig?.isPrivate || true }),
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

export default useKernel
