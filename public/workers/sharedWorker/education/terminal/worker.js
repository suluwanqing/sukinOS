const connectedPorts = new Set()
const latestMessages = new Map() // 按类型存储最新消息[用于新页面初始化]
const portProcessedMessages = new WeakMap() // 记录每个端口已处理的消息 ID，防止重复
// 需要存储并在新连接时广播的 action 类型 (状态快照)
const STORED_ACTION_TYPES = [
  'education-webcontainer/syncState',
  'education-webcontainer/addPendingWindow',
  'education-webcontainer/destroyTerminal',
]
//最大历史消息快照数量
const MAX_MESSAGE_TYPES = 50
// 检查是否需要持久化此消息
function shouldStoreMessage(data) {
  const innerActionType = data.payload?.action?.type
  return innerActionType && STORED_ACTION_TYPES.includes(innerActionType)
}
// 生成唯一消息 ID
function generateMessageId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
// 向新连接的端口同步历史最新消息
function syncLatestMessagesToNewPort(port) {
  if (latestMessages.size === 0) return
  //const syncStartTime = Date.now()
  let syncCount = 0
  latestMessages.forEach(message => {
    // 检查该端口是否已经处理过此消息
    if (!isMessageProcessedByPort(port, message._id)) {
      port.postMessage({
        ...message,
        _synced: true, // 标记这是同步历史消息
        _syncTimestamp: Date.now(),
      })
      markMessageAsProcessed(port, message._id)
      syncCount++
    }
  })

  // console.log(
  //   `[Terminal Worker] 向新连接同步了 ${syncCount} 条历史消息，耗时 ${Date.now() - syncStartTime}ms`
  // )
}

// 辅助方法：标记和检查
function markMessageAsProcessed(port, messageId) {
  const processed = portProcessedMessages.get(port)
  if (processed) processed.add(messageId)
}
function isMessageProcessedByPort(port, messageId) {
  const processed = portProcessedMessages.get(port)
  return processed ? processed.has(messageId) : false
}
self.addEventListener('connect', event => {
  const port = event.ports[0]
  connectedPorts.add(port)
  portProcessedMessages.set(port, new Set())
  port.start()
  //新连接建立，同步最新历史快照
  syncLatestMessagesToNewPort(port)

  //监听来自页面的消息
  port.addEventListener('message', event => {
    const data = event.data
    // 只处理特定的业务消息
    if (data.type && data.type.startsWith('EDUCATION_TERMINAL')) {
      const messageId = generateMessageId()
      const messageWithId = {
        ...data,
        _id: messageId,
        _timestamp: Date.now(),
        _source: 'shared-worker',
      }
      // 检查是否需要更新全局快照
      if (shouldStoreMessage(data)) {
        latestMessages.set(data.type, messageWithId)
        // 容量清理
        if (latestMessages.size > MAX_MESSAGE_TYPES) {
          const firstKey = latestMessages.keys().next().value
          latestMessages.delete(firstKey)
        }
      }
      // 标记来源端口已处理
      markMessageAsProcessed(port, messageId)
      // 广播给其他所有客户端
      let forwardedCount = 0
      for (const p of connectedPorts) {
        if (p !== port) {
          try {
            p.postMessage(messageWithId)
            markMessageAsProcessed(p, messageId)
            forwardedCount++
          } catch (e) {
            connectedPorts.delete(p) // 清理断开的端口
          }
        }
      }
      // console.log(`[Terminal Worker] 消息 ${data.type} 已转发至 ${forwardedCount} 个客户端`)
    }
  })

  // 离线清理
  port.addEventListener('close', () => {
    connectedPorts.delete(port)
    portProcessedMessages.delete(port)
  })

  port.addEventListener('messageerror', error => {
    // console.error('Terminal Worker 消息错误:', error)
  })
})

// // 定期清理过期消息（每小时执行一次）
// setInterval(() => {
//   const now = Date.now()
//   const maxAge = 24 * 60 * 60 * 1000 // 24小时
//   let cleanedCount = 0

//   for (const [type, msg] of latestMessages) {
//     if (now - msg._timestamp > maxAge) {
//       latestMessages.delete(type)
//       cleanedCount++
//     }
//   }
//   if (cleanedCount > 0) console.log(`[Terminal Worker] 清理了 ${cleanedCount} 条过期消息`)
// }, 60 * 60 * 1000)
