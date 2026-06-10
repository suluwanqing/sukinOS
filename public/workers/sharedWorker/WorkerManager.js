class SharedWorkerManager {
  constructor() {
    this.workers = new Map()
    this.initializing = new Set() // 记录正在初始化的 Worker 路径
    this.listeners = new Map()
    this.messageQueues = new Map()
  }

  // 注册 Worker，增加并发锁
  registerWorker(sliceName, workerPath) {
    if (this.workers.has(sliceName) || this.initializing.has(sliceName)) {
      return // 已经在运行或正在初始化中
    }

    if (typeof SharedWorker === 'undefined') {
      console.warn('当前浏览器环境不支持 SharedWorker')
      return null
    }

    this.initializing.add(sliceName)

    try {
      console.log(`[WorkerManager] 正在准备启动: ${sliceName}`)
      const worker = new SharedWorker(workerPath)
      // 启动端口
      worker.port.start()
      // 监听来自 Worker 的消息
      worker.port.onmessage = event => {
        this.notifyListeners(sliceName, event.data)
      }
      // 监听错误
      worker.port.onmessageerror = err => console.error(`[${sliceName}] 消息解析错误:`, err)
      worker.onerror = err => console.error(`[${sliceName}] Worker 运行时错误:`, err)
      // 存入 Map
      this.workers.set(sliceName, worker)
      this.initializing.delete(sliceName)
      // 处理注册前存入队列的消息
      if (this.messageQueues.has(sliceName)) {
        const queue = this.messageQueues.get(sliceName)
        console.log(`[${sliceName}] 处理积压消息，数量: ${queue.length}`)
        queue.forEach(msg => this.postMessage(sliceName, msg))
        this.messageQueues.delete(sliceName)
      }
      return worker
    } catch (error) {
      this.initializing.delete(sliceName)
      console.error(`[${sliceName}] 注册失败:`, error)
      return null
    }
  }

  // 发送消息，如果 Worker 还没准备好则存入队列
  postMessage(sliceName, message) {
    const worker = this.workers.get(sliceName)
    if (!worker) {
      if (!this.messageQueues.has(sliceName)) {
        this.messageQueues.set(sliceName, [])
        //这个消息积压处理可以考虑更新为hash,减少重复新旧的不必要更新
      }
      this.messageQueues.get(sliceName).push(message)
      return
    }
    try {
      worker.port.postMessage({
        ...message,
        _source: sliceName,
        _timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`[${sliceName}] 消息发送失败:`, error)
    }
  }
  addListener(sliceName, callback) {
    if (!this.listeners.has(sliceName)) {
      this.listeners.set(sliceName, new Set())
    }
    this.listeners.get(sliceName).add(callback)
    return () => this.listeners.get(sliceName).delete(callback)
  }
  notifyListeners(sliceName, data) {
    const sliceListeners = this.listeners.get(sliceName)
    if (sliceListeners) {
      sliceListeners.forEach(cb => cb(data))
    }
  }
  isInitialized(sliceName) {
    return this.workers.has(sliceName) || this.initializing.has(sliceName)
  }
}
export const sharedWorkerManager = new SharedWorkerManager()
