// CommHub 通信枢纽：集中处理 Worker <-> UI 的消息分发、状态缓存与系统事件
// 当前是进程内轻量内存版（EventTarget + Map），不做独立 Worker 隔离
export default class CommHub {
  constructor({ onSaveState, sendToWorker }) {
    this.onSaveState = onSaveState
    this.sendToWorker = sendToWorker
    this.eventBus = new EventTarget()
    this.subscribers = new Map()
    this.stateCache = new Map()
    // 消息主题[Topic]全局订阅者注册表
    this.topicSubscribers = new Map()
    // 跟踪每个活动进程[Worke]独立建立的消息主题订阅，用于进程注销时集中清理
    this.processSubscriptions = new Map() // 结构: pid -> Map(topic -> unsubscribeFn)
  }

  emitChange(detail) {
    this.eventBus.dispatchEvent(new CustomEvent('sys_change', { detail }))
  }

  notify(pid, type, data) {
    this.subscribers.get(pid)?.forEach(cb => cb({ type, payload: data }))
  }

  getCachedState(pid) {
    return this.stateCache.get(pid)
  }

  clearCachedState(pid) {
    this.stateCache.delete(pid)
  }

  async handleMsg(pid, msg) {
    if (msg.type === 'STATE_UPDATE') {
      this.stateCache.set(pid, msg.payload)
      this.notify(pid, 'STATE', msg.payload)
      return
    }

    if (msg.type === 'SAVE_STATE') {
      if (typeof this.onSaveState === 'function') {
        await this.onSaveState(pid, msg.payload)
      }
      return
    }

    // 处理 App 跨沙箱向系统发布指定主题消息
    if (msg.type === 'PUBLISH_TOPIC') {
      const { topic, data } = msg.payload || {}
      if (topic) {
        this.publish(topic, data)
      }
      return
    }

    // 处理 App 跨沙箱向系统订阅指定主题消息
    if (msg.type === 'SUBSCRIBE_TOPIC') {
      const { topic } = msg.payload || {}
      if (topic) {
        if (!this.processSubscriptions.has(pid)) {
          this.processSubscriptions.set(pid, new Map())
        }
        const pSubs = this.processSubscriptions.get(pid)
        if (!pSubs.has(topic)) {
          // 在主机端订阅该主题，并将收到的消息转发给 Worker 进程
          const unsubscribe = this.subscribe(topic, (data) => {
            if (typeof this.sendToWorker === 'function') {
              this.sendToWorker(pid, {
                type: 'TOPIC_MESSAGE',
                payload: { topic, data }
              })
            }
          })
          pSubs.set(topic, unsubscribe)
        }
      }
      return
    }

    // 处理 App 跨沙箱取消订阅指定主题消息
    if (msg.type === 'UNSUBSCRIBE_TOPIC') {
      const { topic } = msg.payload || {}
      const pSubs = this.processSubscriptions.get(pid)
      if (pSubs && pSubs.has(topic)) {
        const unsubscribe = pSubs.get(topic)
        if (typeof unsubscribe === 'function') unsubscribe()
        pSubs.delete(topic)
      }
      return
    }
  }

  // 订阅单个进程状态变化,实际是APP自身订阅状态更新
  subscribeApp(pid, cb) {
    if (!this.subscribers.has(pid)) this.subscribers.set(pid, new Set())
    this.subscribers.get(pid).add(cb)
    const cached = this.stateCache.get(pid)
    if (cached) cb({ type: 'STATE', payload: cached })
    return () => this.subscribers.get(pid)?.delete(cb)
  }

  // 订阅系统级变更事件,如资源更新、安装等全局事件
  subscribeSystem(cb) {
    const handler = (event) => cb(event?.detail)
    this.eventBus.addEventListener('sys_change', handler)
    return () => {
      this.eventBus.removeEventListener('sys_change', handler)
    }
  }

  // 订阅指定主题；返回取消订阅句柄，由调用方（或 processSubscriptions）负责在生命周期结束时调用
  subscribe(topic, cb) {
    if (!this.topicSubscribers.has(topic)) {
      this.topicSubscribers.set(topic, new Set())
    }
    this.topicSubscribers.get(topic).add(cb)

    return () => {
      const set = this.topicSubscribers.get(topic)
      if (set) {
        set.delete(cb)
        if (set.size === 0) {
          this.topicSubscribers.delete(topic)
        }
      }
    }
  }

  // 发布指定主题的消息
  publish(topic, payload) {
    this.topicSubscribers.get(topic)?.forEach(cb => {
      try {
        cb(payload)
      } catch (err) {
        console.error(`[CommHub] 执行消息主题 [${topic}] 的回调时发生异常:`, err)
      }
    })
  }

  // 释放并清理指定进程（Worker）建立的所有主题订阅，防内存泄漏
  clearProcessSubscriptions(pid) {
    const pSubs = this.processSubscriptions.get(pid)
    if (pSubs) {
      for (const unsubscribe of pSubs.values()) {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
      this.processSubscriptions.delete(pid)
    }
  }

  // 清空所有缓存与订阅（kernel reset 时彻底清理）
  clearAll() {
    for (const pSubs of this.processSubscriptions.values()) {
      for (const unsubscribe of pSubs.values()) {
        if (typeof unsubscribe === 'function') unsubscribe()
      }
    }
    this.processSubscriptions.clear()
    this.subscribers.clear()
    this.stateCache.clear()
    this.topicSubscribers.clear()
  }
}
