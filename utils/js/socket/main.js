import {alert} from '@/component/alert/layout'

/**
 * wsClient 类
 *
 * 职责说明：
 * 1. 负责底层 WebSocket 物理连接的管理（开启、关闭、异常处理）。
 * 2. 维护心跳机制，确保连接活跃。
 * 3. 实现基于指数退避算法（Exponential Backoff）的自动重连。
 * 4. 提供发送与接收的“处理器映射（Handlers）”机制，实现业务逻辑与通信协议的解耦。
 * 5. 通过回调函数（onLog, onStatusChange）将状态反馈给外部 UI，不直接操作 DOM。
 */
class wsClient {
  /**
   * 构造函数
   * @param {object} config - 配置对象
   * @param {string} config.url - 完整的 WebSocket URL (必填，如: ws://localhost:8080/ws)
   * @param {number} [config.heartbeatInterval=30000] - 心跳发送频率，单位毫秒 (ms)
   * @param {object} [config.reconnect] - 重连策略配置
   * @param {boolean} [config.reconnect.enabled=true] - 是否开启断线自动重连
   * @param {number} [config.reconnect.maxAttempts=5] - 最大重连尝试次数
   * @param {number} [config.reconnect.initialDelay=1000] - 首次重连的延迟时间 (ms)
   * @param {number} [config.reconnect.backoffFactor=2] - 指数增长因子（每次重连延迟翻倍）
   * @param {object} [config.sendHandlers={}] - 发送消息的映射表。键名为消息类型，值为函数 (payload, instance) => formattedData
   * @param {object} [config.receiveHandlers={}] - 接收消息的映射表。根据消息中的 type 字段分发，值为函数 (data, instance) => void
   * @param {function} [config.onLog] - 日志回调函数。用于外部 UI 渲染日志列表: (fullMessage, type, url) => void
   * @param {function} [config.onStatusChange] - 状态变更回调。用于更新 UI 状态文字: (text, className, url) => void
   */
  constructor(config) {
    // 合并配置项，确保重连策略有默认值
    this.config = {
      url: '',
      heartbeatInterval: 30000,
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        initialDelay: 1000,
        backoffFactor: 2,
      },
      ...config,
    }

    // 初始化核心状态属性
    this.websocket = null // WebSocket 原生实例
    this.heartbeatIntervalId = null // 心跳定时器 ID
    this.reconnectTimeoutId = null // 重连延时定时器 ID
    this.reconnectAttempts = 0 // 当前已重连次数
    this.manualDisconnect = false // 标记位：是否为用户主动点击断开

    // 挂载业务逻辑处理器
    this.sendHandlers = config.sendHandlers || {}
    this.receiveHandlers = config.receiveHandlers || {}

    // 强制绑定上下文，确保在异步事件回调中 this 指向实例
    this.connect = this.connect.bind(this)
    this.disconnect = this.disconnect.bind(this)
  }

  // --- 外部反馈与日志系统 ---

  /**
   * 统一日志处理器 (类内部所有消息的唯一输出口)
   * @param {string} message - 核心消息文本
   * @param {object} options - 反馈配置
   * @param {string} [options.type='info'] - 消息级别: 'success' | 'failure' | 'warning' | 'dark' | 'info'
   * @param {boolean} [options.useAlert=false] - 是否同步触发全局 Alert 组件弹窗
   * @param {object} [options.alertOpts] - 传递给 Alert 组件的配置项 (如 duration)
   */
  log(message, {type = 'info', useAlert = false, alertOpts = {}} = {}) {
    const url = this.config.url
    const typeTag = type.toUpperCase()
    // 格式化日志内容，包含级别标记和当前 URL
    const fullMessage = `[${typeTag}] ${message} (URL: ${url})`

    // 触发外部传入的日志回调，以便 UI 层更新日志面板
    if (typeof this.config.onLog === 'function') {
      this.config.onLog(fullMessage, type, url)
    }

    // 在开发控制台打印
    // console.log(fullMessage)

    // 如果标记了 useAlert，则通过外部导入的 alert 模块弹出提示
    if (useAlert && alert) {
      const methodMap = {
        info: 'dark',
        failure: 'failure',
        error: 'failure',
        success: 'success',
        warning: 'warning',
        dark: 'dark',
      }
      const method = methodMap[type] || 'dark'

      if (typeof alert[method] === 'function') {
        alert[method](message, {
          duration: alertOpts.duration || 1500,
          multiLine: alertOpts.multiLine || false,
        })
      }
    }
  }

  /**
   * 内部状态更新工具
   * @param {string} text - 状态描述文字
   * @param {string} className - 用于 UI 的样式类名
   */
  _updateStatus(text, className) {
    if (typeof this.config.onStatusChange === 'function') {
      this.config.onStatusChange(text, className, this.config.url)
    }
  }

  // --- 物理连接控制 ---

  /**
   * 建立 WebSocket 连接
   * 使用配置中指定的 URL，并根据当前状态判断是否允许开启。
   */
  connect() {
    // 防止重复连接
    if (this.websocket) return

    const url = this.config.url
    // 校验 URL 合法性
    if (!url || !/^(ws|wss):\/\//i.test(url)) {
      this.log('连接指令拒绝: URL 格式不正确或为空', {type: 'failure', useAlert: true})
      return
    }

    // 重置标记位
    this.manualDisconnect = false
    // 只有非自动重连状态下，才重置重连计数
    if (!this.reconnectTimeoutId) this.reconnectAttempts = 0

    this.log('正在发起 WebSocket 连接请求', {type: 'info'})
    this._updateStatus('正在连接', 'status-connecting')

    try {
      this.websocket = new WebSocket(url)
      this._bindWebSocketEvents()
    } catch (error) {
      this.log(`物理链路异常: ${error.message}`, {type: 'failure', useAlert: true})
      this._updateStatus('连接失败', 'status-error')
    }
  }

  /**
   * 主动断开连接
   * 用户发起断开后，系统将不会再进行自动重连。
   */
  disconnect() {
    this.manualDisconnect = true
    this._stopReconnectTimer() // 停止正在等待的重连任务
    if (this.websocket) {
      this.log('用户发起主动关闭请求', {type: 'dark', useAlert: true})
      this.websocket.close(1000) // 1000 表示正常关闭
    }
  }

  // --- 数据发送与传输 ---

  /**
   * 业务级发送消息
   * @param {string} type - 对应 sendHandlers 中的键名，用于查找格式化逻辑
   * @param {*} payload - 业务原始数据
   */
  send(type, payload) {
    // 检查连接是否可用
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.log('发送失败: 当前 WebSocket 未处于连接状态', {type: 'failure', useAlert: true})
      return
    }

    const handler = this.sendHandlers[type]

    // 如果没有配置 Handler，则尝试直接发送原始数据
    if (typeof handler !== 'function') {
      this._transmit(payload, 'RAW_DATA')
      return
    }

    try {
      // 执行处理器，将 instance (this) 传入以便 Handler 内部访问配置
      const formatted = handler(payload, this)
      this._transmit(formatted, type)
    } catch (error) {
      this.log(`发送处理器 [${type}] 执行异常: ${error.message}`, {type: 'failure', useAlert: true})
    }
  }

  /**
   * 内部物理发送方法
   * 负责将数据序列化并推向网络层。
   */
  _transmit(data, typeName) {
    const rawData = typeof data === 'string' ? data : JSON.stringify(data)
    this.websocket.send(rawData)
    this.log(`数据已发送 [类型: ${typeName}]: ${rawData}`, {type: 'info'})
  }

  // --- WebSocket 事件监听 ---

  /**
   * 内部方法：绑定原生事件
   */
  _bindWebSocketEvents() {
    /** 连接开启 */
    this.websocket.onopen = () => {
      this.log('WebSocket 连接成功开启', {type: 'success', useAlert: true})
      this._updateStatus('已连接', 'status-connected')
      this.reconnectAttempts = 0 // 连接成功，清空重连计数
      this._stopReconnectTimer()
      this._startHeartbeat() // 开启心跳
    }

    /** 收到消息 */
    this.websocket.onmessage = event => {
      let parsedData
      try {
        parsedData = JSON.parse(event.data)
      } catch (e) {
        // 非 JSON 数据处理
        this.log(`收到非 JSON 数据: ${event.data}`, {type: 'info'})
        if (event.data === 'ping') this.websocket.send('pong')
        return
      }

      // 业务分发逻辑：根据消息包中的 type 寻找对应的 receiveHandler
      const msgType = parsedData.type
      const handler = this.receiveHandlers[msgType]

      if (typeof handler === 'function') {
        try {
          handler(parsedData, this)
        } catch (error) {
          this.log(`接收处理器 [${msgType}] 执行报错: ${error.message}`, {type: 'failure'})
        }
      } else {
        this.log(`收到业务 JSON 数据: ${event.data}`, {type: 'info'})
      }
    }

    /** 连接关闭 */
    this.websocket.onclose = event => {
      this._cleanup() // 清理定时器
      const isManual = this.manualDisconnect

      this.log(`连接通道已关闭 (代码: ${event.code})`, {
        type: isManual ? 'info' : 'warning',
        useAlert: isManual, // 只有用户主动关闭时弹出提示
      })

      // 判断是否需要自动重连
      if (this.config.reconnect.enabled && !isManual) {
        this._attemptReconnect()
      } else {
        this._updateStatus('已断开', 'status-disconnected')
      }
    }

    /** 连接报错 */
    this.websocket.onerror = (e) => {
      console.log(e)
      this.log('WebSocket 链路发生底层 Error', {type: 'failure', useAlert: true})
    }
  }

  // --- 自动化维护机制 (重连 & 心跳) ---

  /**
   * 指数退避重连算法实现
   * 每次重连失败后，下一次尝试的等待时间会按照指数增长，减轻服务器压力。
   */
  _attemptReconnect() {
    const {maxAttempts, initialDelay, backoffFactor} = this.config.reconnect

    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++
      // 计算本次延迟时间: initialDelay * (backoffFactor ^ (attempts - 1))
      const delay = initialDelay * Math.pow(backoffFactor, this.reconnectAttempts - 1)

      this.log(`触发重连机制: 将在 ${delay / 1000}s 后进行第 ${this.reconnectAttempts} 次尝试`, {
        type: 'warning',
      })
      this._updateStatus(`正在重连...`, 'status-connecting')

      // 设置定时重连任务
      this.reconnectTimeoutId = setTimeout(() => this.connect(), delay)
    } else {
      this.log('自动重连失败: 已达到最大尝试次数限制', {type: 'failure', useAlert: true})
      this._updateStatus('断开连接', 'status-disconnected')
    }
  }

  /**
   * 资源清理
   */
  _cleanup() {
    this._stopHeartbeat()
    this.websocket = null
  }

  /**
   * 开启客户端心跳
   * 定期向服务端发送微包，防止 NAT 超时导致连接被动断开。
   */
  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatIntervalId = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        // 发送标准心跳包格式
        this.websocket.send(JSON.stringify({type: 'heartbeat', ts: Date.now()}))
      }
    }, this.config.heartbeatInterval)
  }

  /** 停止心跳计时器 */
  _stopHeartbeat() {
    clearInterval(this.heartbeatIntervalId)
    this.heartbeatIntervalId = null
  }

  /** 停止重连计时器 */
  _stopReconnectTimer() {
    clearTimeout(this.reconnectTimeoutId)
    this.reconnectTimeoutId = null
  }
}

export default wsClient
/**
 * --- 示例演示：如何在 React/JS 项目中使用 ---
 */

// const wsManager = new wsClient({
//   // 1. 配置 URL (解耦后的最简配置)
//   url: 'ws://127.0.0.1:8001/ws/device_log_tester',

//   // 2. 外部日志联动：由外部决定日志如何存储或展示
//   onLog: (msg, type) => {
//     // 例如在 React 状态中追加日志记录
//     // setLogs(prev => [...prev, { content: msg, level: type }]);
//   },

//   // 3. 状态联动
//   onStatusChange: (text, cls) => {
//     // 更新 UI 顶部的状态条文本
//   },

//   // 4. 发送处理器：处理业务数据格式化
//   sendHandlers: {
//     'chat': (text) => ({ type: 'MESSAGE', body: text })
//   },

//   // 5. 接收处理器：处理服务端下发的消息
//   receiveHandlers: {
//     'FORCE_LOGOUT': (data, instance) => {
//       instance.log(`服务器强制你退出: ${data.reason}`, { type: 'failure', useAlert: true });
//       instance.disconnect();
//     }
//   }
// });

// // 启动连接
// wsManager.connect();
