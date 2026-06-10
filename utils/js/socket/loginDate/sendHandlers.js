/**
 * 发送消息的格式化映射表
 * 键名对应业务类型，函数返回格式化后的数据
 */
export const sendHandlers = {
  chat_message: (payload, instance) => {
    return {
      type: 'chat_message',
      payload: payload,
    }
  },
  sync_status: (payload, instance) => {
    return {
      type: 'sync_status',
      payload: payload,
    }
  },
}

export default sendHandlers
