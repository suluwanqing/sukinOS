import wsClient from '../main.js'
import receiveHandlers from './receiveHandlers.js'
import sendHandlers from './sendHandlers.js'
const BASE_WS_URL = 'wss://sukin.top/api/ws/date'
// --- 私有变量，用于存储全局唯一的单例实例 ---
let instance = null
/**
 * 初始化并获取用户专属的 WebSocket 实例 单例模式
 * @param {number|string} userId - 用户ID
 * @param {object} uiCallbacks - 外部 UI 联动回调
 * @returns {wsClient}
 */
export function createWsDate(userId, uiCallbacks = {}) {
  if (!userId) {
    throw new Error('WebSocket 初始化失败：缺少用户 ID')
  }

  const wsUrl = `${BASE_WS_URL}/${userId}`
  // console.log(instance, instance?.config?.url, wsUrl)
  // 检查是否已经存在实例
  if (instance) {
    // 检查现有的实例 URL 是否和要创建的一致
    if (instance.config.url === wsUrl) {
      // console.log('检测到已存在的相同连接，跳过重复初始化')

      // 可选：如果传入了新的回调，更新它（防止页面刷新后回调函数失效）
      if (uiCallbacks.onLog) instance.config.onLog = uiCallbacks.onLog
      if (uiCallbacks.onStatusChange) instance.config.onStatusChange = uiCallbacks.onStatusChange

      return instance
    } else {
      // 如果 ID 变了（比如切换了账号），则先断开并销毁旧实例
      // console.log('检测到用户 ID 变更，正在关闭旧连接并重新初始化...')
      instance.disconnect()
      instance = null
    }
  }

  // 创建新实例
  instance = new wsClient({
    url: wsUrl,
    heartbeatInterval: 30000,
    reconnect: {
      enabled: true,
      maxAttempts: 10,
      initialDelay: 1000,
      backoffFactor: 2,
    },
    sendHandlers: sendHandlers,
    receiveHandlers: receiveHandlers,

    onLog:
      uiCallbacks.onLog ||
      ((msg, type) => {
        // console.log(`[WS ${type.toUpperCase()}]`, msg)
      }),

    onStatusChange:
      uiCallbacks.onStatusChange ||
      ((text, className) => {
        // console.log(`[WS 状态变更]`, text)
      }),
  })
  instance.connect()
  return instance
}

/**
 * 获取当前的WebSocket实例
 */
export function getWSInstance() {
  return instance
}

/**
 * 彻底销毁实例
 */
export function destroyWSInstance() {
  if (instance) {
    instance.disconnect()
    instance = null
  }
}

const loginDateWs = {
  createWsDate,
  destroyWSInstance,
  getWSInstance,
}
export default loginDateWs
