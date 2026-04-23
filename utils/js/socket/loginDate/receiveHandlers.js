/**
 * 接收消息的业务分发映射表
 * 键名对应后端返回 JSON 中的 "type" 字段
 */
export const receiveHandlers = {
  // 对应后端的错误回传消息
  error: (data, instance) => {
    instance.log(`服务端错误: ${data.message}`, {type: 'error', useAlert: true})
  },
  notification: (data, instance) => {
    instance.log(`收到通知: ${data.payload}`, {type: 'info'})
    // 这里可以触发一些全局状态更新，比如 Vuex/Pinia 或 React Context
  },
  force_logout: (data, instance) => {
    instance.log('您已被强制下线', {type: 'warning', useAlert: true})
    instance.disconnect() // 主动断开
  },
}

export default receiveHandlers
