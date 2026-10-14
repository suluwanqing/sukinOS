import { useState} from "react"
import { DB_INSTANCE_ID } from "@/sukinos/utils/config"
import { alert } from '@/component/alert/layout'
import kernel from "@/sukinos/utils/process/kernel"
export const useStateHandle = () => {
  const [stateInstance, setStateInstance] = useState(null)
  const [systemDirHandle, setSystemDirHandle] = useState(null)
  const getInstance = async () => {
    try {
      const dbInstance = await kernel.getInstanceDb()
      if (!dbInstance) {
        throw new Error("数据库实例不存在")
      }
      setStateInstance(dbInstance)
      // 必须返回这个实例，供调用链中的下一个函数直接使用，避免闭包问题
      return dbInstance
    } catch (error) {
      console.error("初始化DB失败", error)
      throw error
    }
  }

  const getSystemDirHandleInstance = async () => {
    try {
      let db = stateInstance
      if (!db) {
        db = await getInstance()
      }
      if (!db) {
        throw new Error("无法获取数据库实例，无法读取目录句柄")
      }
      const data = await db.getData(DB_INSTANCE_ID)
      if (!data || !data.dirHandle) {
        alert.failure("未找到已保存的目录句柄，请先在系统切换隐私模式,执行挂载!")
        return null
      }
      setSystemDirHandle(data.dirHandle)
      return data.dirHandle
    } catch (error) {
      console.error("获取系统句柄失败:", error)
      // 这里不throw error，而是返回null保留占位拓展
      return null
    }
  }

  // 句柄跨刷新不可持久化，所以每次都覆写同一条记录，方便随时更新
  const saveSystemDirHandle = async (handle) => {
    try {
      let db = stateInstance
      if (!db) db = await getInstance()
      if (!db) throw new Error("数据库未就绪")
      const payload = {
        id: DB_INSTANCE_ID,
        dirHandle: handle,
        updatedAt: Date.now()
      }
      await db.setData(payload)
      console.log("句柄已持久化到IndexedDB")
      setSystemDirHandle(handle)
      return true
    } catch (error) {
      console.error("保存句柄失败", error)
      throw error
    }
  }
  const initialize = async () => {
    try {
      await getSystemDirHandleInstance()
    } catch (e) {
      console.error("Hook初始化失败", e)
    }
  }

  return {
    stateInstance,
    systemDirHandle,

    getInstance,
    getSystemDirHandleInstance,
    saveSystemDirHandle,
    initialize,

    hasInstance: !!stateInstance,
    hasSystemDirHandle: !!systemDirHandle,
    instanceReady: !!stateInstance && !!systemDirHandle
  }
}

export default useStateHandle
