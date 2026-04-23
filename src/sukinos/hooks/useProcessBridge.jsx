import { useState, useEffect, useCallback } from "react"
import kernel from "@/sukinos/utils/process/kernel"

export const useProcessBridge = (pid) => {
  const [state, setState] = useState(null)
  //后续可用于拓展运行时,注入合并state
  const getMergedState = useCallback((processPrivateState) => {
    // 获取内核当前的各类应用集合
    const systemApps = [...kernel.systemApps.values()]
    const userApps = [...kernel.userApps.values()]
    const allApps = [...systemApps, ...userApps]
    return {
      ...(processPrivateState || {}), // 保留进程原本的私有状态::state
      // 泵入全局系统信息
      systemApps: allApps,
      runningApps: allApps.filter(app => app.status === 'RUNNING'),
      hibernatedApps: allApps.filter(app => app.status === 'HIBERNATED'),
      blockEdApps: kernel.getBlockEdApps()
    }
  }, [])

  useEffect(() => {
    if (!pid) return
    // 订阅应用自身 Worker 发出的状态变化
    const unsubscribeApp = kernel.subscribeApp(pid, (msg) => {
      if (msg.type === 'STATE') {
        // 当 Worker 更新私有状态时，合并系统信息后同步给 UI
        setState(getMergedState(msg.payload))
      }
    })
    // 订阅内核全局事件 (sys_change),但是应该尽量减少或者精确化,因为这个容易渲染阻塞导致任务丢弃,导致流程有问题
    // 当有应用安装、卸载、启动、休眠、删除时，内核会触发此事件
    // const unsubscribeSystem = kernel.subscribeSystem(() => {
    //   // 强制触发重绘，并合并最新的系统应用列表
    //   setState(current => getMergedState(current))
    // })

    return () => {
      unsubscribeApp()
      // unsubscribeSystem()
    }
  }, [pid, getMergedState])

  const dispatch = useCallback((action) => kernel.dispatch(pid, action), [pid])
  return { state, dispatch }
}

export default useProcessBridge
