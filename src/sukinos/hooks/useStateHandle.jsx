import { useState} from "react"
import { DB_INSTANCE_ID } from "@/sukinos/utils/config"
import kernel from "@/sukinos/utils/process/kernel"
export const useStateHandle = () => {
  const [stateInstance, setStateInstance] = useState(null)
  const [systemDirHandle, setSystemDirHandle] = useState(null)
  // 获取数据库实例
  const getInstance = async () => {
    try {
      const dbInstance = await kernel.getInstanceDb()
      if (!dbInstance) {
        throw new Error("数据库实例不存在")
      }
      //更新 React 状态
      setStateInstance(dbInstance)
      // 必须返回这个实例，供调用链中的下一个函数直接使用，避免闭包问题
      return dbInstance
    } catch (error) {
      console.error("初始化DB失败", error)
      throw error
    }
  }

  // 获取系统目录句柄实例
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
        console.log("数据库中未找到已保存的目录句柄")
        return null
      }
      //句柄已经拿到
      setSystemDirHandle(data.dirHandle)
      return data.dirHandle
    } catch (error) {
      console.error("获取系统句柄失败:", error)
      // 这里不throw error，而是返回null保留占位拓展
      return null
    }
  }

  //确保持久化文件夹也无法持久化，刷新就没了[这个是为了允许随时更新Handle]
  const saveSystemDirHandle = async (handle) => {
    try {
      let db = stateInstance
      if (!db) db = await getInstance()
      if (!db) throw new Error("数据库未就绪")
      // 构造存储对象
      const payload = {
        id: DB_INSTANCE_ID,
        dirHandle: handle,
        updatedAt: Date.now()
      }
      await db.setData(payload)
      console.log("句柄已持久化到IndexedDB")
      setSystemDirHandle(handle) // 更新本地状态
      return true
    } catch (error) {
      console.error("保存句柄失败", error)
      throw error
    }
  }
  // 初始化所有实例
  const initialize = async () => {
    try {
      await getSystemDirHandleInstance()
    } catch (e) {
      console.error("Hook初始化失败", e)
    }
  }

  return {
    // 状态
    stateInstance,
    systemDirHandle,

    // 方法
    getInstance,
    getSystemDirHandleInstance,
    saveSystemDirHandle,
    initialize,

    // 状态标识
    hasInstance: !!stateInstance,
    hasSystemDirHandle: !!systemDirHandle,
    instanceReady: !!stateInstance && !!systemDirHandle
  }
}

export default useStateHandle
