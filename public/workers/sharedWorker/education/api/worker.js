const connectedPorts = new Set()
const latestMessages = new Map()
const portProcessedMessages = new WeakMap()
const STORED_ACTION_TYPES = ['education-apislice/syncState']
self.onconnect = event => {
  const port = event.ports[0]
  connectedPorts.add(port)
  portProcessedMessages.set(port, new Set())
  port.start()
  // 同步历史状态给新连接的页面
  syncHistory(port)
  port.onmessage = event => {
    const data = event.data
    if (!data.type || !data.type.startsWith('EDUCATION_API_SYNC')) return
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const enrichedData = {...data, _id: messageId, _source: 'shared-worker'}
    // 如果符合条件，更新最新状态快照
    if (shouldStore(data)) {
      latestMessages.set(data.type, enrichedData)
    }
    // 广播给其他所有端口
    portProcessedMessages.get(port).add(messageId)
    broadcast(port, enrichedData)
  }
  port.onmessageerror = () => {
    console.error('Worker 端口通信错误')
  }
}
function shouldStore(data) {
  const actionType = data.payload?.action?.type
  return actionType && STORED_ACTION_TYPES.includes(actionType)
}
function broadcast(senderPort, message) {
  for (const port of connectedPorts) {
    if (port !== senderPort) {
      try {
        port.postMessage(message)
        const processed = portProcessedMessages.get(port)
        if (processed) processed.add(message._id)
      } catch (e) {
        connectedPorts.delete(port) // 清理失效端口
      }
    }
  }
}
function syncHistory(port) {
  if (latestMessages.size === 0) return
  latestMessages.forEach(msg => {
    port.postMessage({...msg, _synced: true})
  })
}

// // 定期清理垃圾连接和过期快照
// setInterval(() => {
//   const now = Date.now()
//   for (const [type, msg] of latestMessages) {
//     if (now - msg._timestamp > 3600000) {
//       // 1小时过期
//       latestMessages.delete(type)
//     }
//   }
// }, 60000)
