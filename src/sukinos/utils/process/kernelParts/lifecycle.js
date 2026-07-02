import {generateWorker} from '../generateWorker'
import {processStateAction, initializeState} from '../workerDrive'
import {alert} from '@/component/alert/layout'
import {
  ENV_KEY_NAME,
  ENV_KEY_META_INFO,
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_IS_BUNDLE,
} from '@/sukinos/utils/config'
import {getStore, STORES} from '@/sukinos/utils/_db.js'

// 全局唯一的隐藏沙箱 Iframe 容器引用
let sharedSandboxIframe = null
function getSharedSandboxIframe() {
  if (sharedSandboxIframe) return sharedSandboxIframe
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.id = 'kernel-shared-js-sandbox'
  document.body.appendChild(iframe)
  sharedSandboxIframe = iframe
  return iframe
}

// 缓存方法绑定的弱映射，避免对同一原生方法重复 bind 产生 GC 压力
const boundMethodsCache = new WeakMap()

// 全局共享的进程消息委托机制，避免高频创建消息闭包
export const delegateWorkerMap = new WeakMap()
export function delegatedWorkerMessageHandler(event) {
  const workerInstance = event.currentTarget || this
  const delegate = delegateWorkerMap.get(workerInstance)
  if (delegate) {
    delegate.handle(event.data)
  }
}

/**
 * 虚拟轻量化沙箱
 * 采用 with(sandbox) + Proxy + Shared Iframe
 */
class VirtualWorker {
  constructor(code, pid, iframeWin) {
    this.pid = pid
    this.onmessage = null
    this.terminated = false
    this.appOnMessage = null
    this.pendingStateFrame = null // 用于缓存当前帧待分发的 STATE_UPDATE 状态

    // ======= 资源追踪注册表 =======
    this.activeTimeouts = new Set()
    this.activeIntervals = new Set()
    this.activeRAFFrames = new Set()
    this.attachedEventListeners = [] // 存储结构: { target, type, listener, options }

    // 分配该应用的隔离内存
    const localStore = {}
    const sandboxSelf = {
      postMessage: msg => {
        if (this.onmessage) {
          // 高频状态更新与普通系统事件分流
          // 状态消息通过 requestAnimationFrame 帧对齐进行节流，确保交互渲染顺畅
          if (msg && msg.type === 'STATE_UPDATE') {
            if (this.pendingStateFrame) {
              cancelAnimationFrame(this.pendingStateFrame)
            }
            this.pendingStateFrame = requestAnimationFrame(() => {
              if (!this.terminated && this.onmessage) {
                this.onmessage({data: msg})
              }
            })
            return
          }

          // 其他控制流事件则通过普通微任务 or 宏任务快速投递
          setTimeout(() => {
            if (!this.terminated && this.onmessage) {
              this.onmessage({data: msg})
            }
          }, 0)
        }
      },

      // 拦截并接管定时器，在应用销毁时强制注销，防 CPU 空转
      setTimeout: (handler, timeout, ...args) => {
        const id = setTimeout(() => {
          this.activeTimeouts.delete(id)
          if (typeof handler === 'function') {
            handler(...args)
          }
        }, timeout)
        this.activeTimeouts.add(id)
        return id
      },
      clearTimeout: id => {
        clearTimeout(id)
        this.activeTimeouts.delete(id)
      },

      setInterval: (handler, timeout, ...args) => {
        const id = setInterval(handler, timeout, ...args)
        this.activeIntervals.add(id)
        return id
      },
      clearInterval: id => {
        clearInterval(id)
        this.activeIntervals.delete(id)
      },

      requestAnimationFrame: callback => {
        const id = requestAnimationFrame(timestamp => {
          this.activeRAFFrames.delete(id)
          callback(timestamp)
        })
        this.activeRAFFrames.add(id)
        return id
      },
      cancelAnimationFrame: id => {
        cancelAnimationFrame(id)
        this.activeRAFFrames.delete(id)
      },

      // 拦截并托管全局事件监听器，避免未注销的 resize/mousemove 泄露
      addEventListener: (type, listener, options) => {
        if (type === 'message') {
          this.appOnMessage = listener
          return
        }
        iframeWin.addEventListener(type, listener, options)
        this.attachedEventListeners.push({target: iframeWin, type, listener, options})
      },
      removeEventListener: (type, listener, options) => {
        if (type === 'message') {
          if (this.appOnMessage === listener) {
            this.appOnMessage = null
          }
          return
        }
        iframeWin.removeEventListener(type, listener, options)
        this.attachedEventListeners = this.attachedEventListeners.filter(
          item => !(item.target === iframeWin && item.type === type && item.listener === listener)
        )
      },

      // 兼容某些 app 会调用 Worker 下的同步加载脚本命令
      importScripts: (...urls) => {
        urls.forEach(url => {
          try {
            const xhr = new XMLHttpRequest()
            xhr.open('GET', url, false) // 同步请求
            xhr.send()
            this.execute(xhr.responseText)
          } catch (e) {
            console.error(`[VirtualWorker] 动态脚本加载失败: ${url}`, e)
          }
        })
      },
      location: window.location,
      console: console,
      fetch: fetch.bind(window),
      performance: performance,
    }

    // 独立代理环境，确保各个虚拟 Worker 各自读写独立
    const sandboxSelfProxy = new Proxy(iframeWin, {
      get: (target, prop) => {
        if (prop === 'self' || prop === 'globalThis' || prop === 'window') {
          return sandboxSelfProxy
        }
        if (prop in sandboxSelf) {
          return sandboxSelf[prop]
        }
        if (prop in localStore) {
          return localStore[prop]
        }
        if (prop in target) {
          const val = target[prop]
          if (typeof val === 'function') {
            // 避免绑定构造类（如 Object, Array, Promise 等首字母大写的全局类）
            const isConstructor = /^[A-Z]/.test(prop)
            if (isConstructor) {
              return val
            }
            // 利用 WeakMap 弱引用缓存绑定方法，防止产生频繁的 short-lived GC 对象
            let bound = boundMethodsCache.get(val)
            if (!bound) {
              bound = val.bind(target)
              boundMethodsCache.set(val, bound)
            }
            return bound
          }
          return val
        }
        return undefined
      },
      set: (target, prop, value) => {
        if (prop === 'onmessage') {
          this.appOnMessage = value
          return true
        }
        localStore[prop] = value
        return true
      },
      // with(sandbox) 必配逻辑：强制全部变量查找在此代理内拦截
      has: () => true,
    })

    this.sandboxProxy = sandboxSelfProxy
    this.execute(code)
  }
  execute(code) {
    try {
      // 编译成 with 包含的作用域环境
      const runner = new Function('self', `with(self) { ${code} }`)
      setTimeout(() => {
        if (!this.terminated) {
          runner(this.sandboxProxy)
        }
      }, 0)
    } catch (err) {
      console.error(`[VirtualWorker] [${this.pid}] 执行出错:`, err)
    }
  }
  postMessage(data) {
    if (this.terminated) return
    setTimeout(() => {
      if (this.appOnMessage && !this.terminated) {
        if (typeof this.appOnMessage === 'function') {
          this.appOnMessage({data})
        } else if (this.appOnMessage.handleEvent) {
          this.appOnMessage.handleEvent({data})
        }
      }
    }, 0)
  }

  terminate() {
    this.terminated = true
    this.appOnMessage = null
    this.onmessage = null
    if (this.pendingStateFrame) {
      cancelAnimationFrame(this.pendingStateFrame)
    }
    // ======= 资源清理  =======
    // 清理所有残留的 setTimeout
    for (const id of this.activeTimeouts) {
      clearTimeout(id)
    }
    this.activeTimeouts.clear()
    // 清理所有残留的 setInterval
    for (const id of this.activeIntervals) {
      clearInterval(id)
    }
    this.activeIntervals.clear()
    // 清理所有残留的 requestAnimationFrame
    for (const id of this.activeRAFFrames) {
      cancelAnimationFrame(id)
    }
    this.activeRAFFrames.clear()
    // 注销所有应用生命周期中挂载 to 共享 Window 上的全局监听器
    for (const item of this.attachedEventListeners) {
      try {
        item.target.removeEventListener(item.type, item.listener, item.options)
      } catch (e) {
        // 捕获潜在 of DOM 移除异常
      }
    }
    this.attachedEventListeners = []
  }
}

/**
 * NoWorker
 * 针对 worker: false 应用，在宿主线程模拟 Worker 的通信协议
 */
class NoWorker {
  #kernel

  constructor(pid, kernelInstance, initialState, isBundle) {
    this.pid = pid
    this.#kernel = kernelInstance
    this.onmessage = null
    this.terminated = false
    this.isBundle = isBundle || false

    // 安全获取当前应用的内核元数据，构建完全等价于 Worker 端的 sysConfig
    const app = this.#kernel.getApp(this.pid)
    const resourceId = app?.[ENV_KEY_RESOURCE_ID] || ''
    const appName = app?.[ENV_KEY_NAME] || ''

    this.sysConfig = {
      [ENV_KEY_RESOURCE_ID]: resourceId,
      [ENV_KEY_NAME]: appName,
      [ENV_KEY_IS_BUNDLE]: isBundle,
    }

    // 使用统一的公共状态初始化校准器
    const calibratedState = initializeState(initialState, isBundle)
    this.state = calibratedState

    // 初始化时，如果存在历史持久化状态，同步广播给通信枢纽以填充缓存（注入完整 sysConfig）
    if (calibratedState) {
      setTimeout(() => {
        if (!this.terminated) {
          this.#kernel.commHub.handleMsg(this.pid, {
            type: 'STATE_UPDATE',
            payload: {
              ...calibratedState,
              config: this.sysConfig,
            },
          })
        }
      }, 0)
    }
  }

  postMessage(data) {
    if (this.terminated) return

    // 拦截来自 UI 的 action
    if (data && data.type === 'UI_ACTION') {
      const action = data.payload

      // 如果是直接更新状态的 action，则通过反射链更新内核状态机
      if (action.type === 'STATE_UPDATE' || action.type === 'UPDATE_STATE') {
        const newState = action.payload

        // 采用解构赋值进行增量合并，防止直接赋值导致状态中其它必要变量丢失
        this.state = {...this.state, ...newState}

        this.#kernel.commHub.handleMsg(this.pid, {
          type: 'STATE_UPDATE',
          payload: {
            ...this.state, // 广播合并后的最新状态
            config: this.sysConfig,
          },
        })
      }
      // 如果是其他业务 action，或者需要通过通用路由逻辑更新 (例如 NAVIGATE)
      else {
        const prevState = this.state || {}
        // 调用统一的共享业务动作转换处理器
        const nextState = processStateAction(prevState, action, this.isBundle)

        if (nextState !== prevState) {
          this.state = nextState
          this.#kernel.commHub.handleMsg(this.pid, {
            type: 'STATE_UPDATE',
            payload: {
              ...nextState,
              config: this.sysConfig,
            },
          })
        } else {
          // 若无状态变更，默认反射回沙箱内部供应用局部监听器处理 (ECHO 机制)
          setTimeout(() => {
            if (this.onmessage && !this.terminated) {
              this.onmessage({data: {type: 'ACTION_ECHO', payload: action}})
            }
          }, 0)
        }
      }
    }

    // 兼容 SAVE_STATE 消息（用于在系统卸载/页面卸载前强行持久化状态）
    if (data && data.type === 'SAVE_STATE') {
      const currentState = this.#kernel.getCachedState(this.pid)
      if (currentState) {
        this.#kernel.commHub.saveState(this.pid, currentState)
      }
    }
  }

  terminate() {
    this.terminated = true
    this.onmessage = null
  }
}

export class Lifecycle {
  // 建立私有变量，隐藏内部宿主指针，阻断外部不安全变量穿透
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  /**
   * 启动一个应用进程
   * 这是一个核心的调度方法，它能处理冷启动和从休眠状态恢复两种情况。
   * interactInfo 应该是一个对象对应用户的 reducer 开发处理
   function reducer(state[自动注入], action[App 交互传输的 interactInfo]) {
      switch(action.type) {
        case 'INCREMENT':
          return { ...state, count: state.count + 1 };
        default:
          return state;
      }
    }`;
  **/
  async startProcess({pid, resourceId, interactInfo}) {
    let truthPid = pid
    let truthResourceId = resourceId
    if (!truthPid) {
      //那么这里实际是resourceId,这里为了兼容,处理一下不再过多修改
      truthPid = this.#kernel.getPidByResourceId(resourceId)
    }
    if (!truthResourceId) {
      truthResourceId = this.#kernel.getResourceIdByPid(truthPid)
    }
    const app = this.#kernel.getApp(truthPid)
    if (!app) {
      alert.warning(`[内核] 尝试启动一个不存在的应用，pid: ${truthPid}`)
    }
    // 无论何种情况，都先准备好将要返回的窗口几何信息。
    // 这保证了 API 的调用者总能获得预期的返回值。
    const resource = this.#kernel.getResource(truthResourceId)

    // 记录进程启动前的初始状态，以此判断它是真正的全新启动，还是会话恢复阶段的冷拉起
    const originalStatus = app?.status

    // 进程已在运行 (Worker 实例已存在)
    if (this.#kernel.processes.has(truthPid)) {
      try {
        // 如果应用处于休眠状态，则唤醒它
        if (app.status === 'HIBERNATED') {
          app.status = 'RUNNING'
          if (!app?.isSystemApp) {
            await this.#kernel.sysDb.updateData(app?.[ENV_KEY_NAME], {status: 'RUNNING'})
          }
          if (interactInfo) {
            const p = this.#kernel.processes.get(truthPid)
            this.#kernel.appIntereact({process: p.worker, interactInfo})
          }
          // alert.success(`[内核] 应用 ${app.name} (pid: ${pid}) 已恢复运行。`)
          this.#kernel.emitChange({type: 'APP_STATUS', pid: truthPid, status: 'RUNNING'})
        }
        // 无论之前是 HIBERNATED 还是 RUNNING，都通知 UI 并返回窗口状态
        this.#kernel.commHub.notify(truthPid, 'STATE', this.#kernel.getCachedState(truthPid))
        return {isStart: true}
      } catch (error) {
        return {isStart: false}
      }
    }

    // 进程未运行 (冷启动)
    try {
      const hasWorker = app?.[ENV_KEY_META_INFO]?.worker !== false
      let worker
      let url = null

      if (hasWorker) {
        let workerCode
        if (app?.isSystemApp) {
          // 系统资源一定是不在文件映射中
          if (!resource) throw new Error(`系统资源 '${app?.[ENV_KEY_NAME]}' 未找到!`)
          workerCode = generateWorker(resource)
        } else {
          // 原有的架构是非系统都将进入到本地中。新引入了: 本地同步可选机制。
          // 兼容处理, 处理没有进行本地同步APP, 这个时候认为是进入到了资源缓存中
          // 先检查 app 和 app.handle 是否存在
          if (app && app.handle) {
            if ((await app.handle.queryPermission({mode: 'read'})) !== 'granted') {
              await app.handle.requestPermission({mode: 'read'})
              const file = await app.handle.getFile()
              workerCode = await file.text()
            } else {
              workerCode = generateWorker(resource)
            }
          } else {
            workerCode = generateWorker(resource)
          }
        }

        // 如果系统配置了虚拟沙箱运行机制，则建立 VirtualWorker 执行 JS 代码
        if (this.#kernel.useVirtualWorker) {
          const iframe = getSharedSandboxIframe()
          worker = new VirtualWorker(workerCode, truthPid, iframe.contentWindow)
        } else {
          url = URL.createObjectURL(new Blob([workerCode], {type: 'application/javascript'}))
          worker = new Worker(url, {name: truthPid})
        }
      } else {
        // 纯前端应用自反射虚拟运行实例
        const stateToRestore = app.savedState?.app
        const isBundle = resource?.[ENV_KEY_IS_BUNDLE] || false
        worker = new NoWorker(truthPid, this.#kernel, stateToRestore, isBundle)
      }

      this.#kernel.processes.set(truthPid, {worker, url})

      // 静态委托挂载，削减闭包事件调度器分配开销
      delegateWorkerMap.set(worker, {
        handle: data => this.#kernel.commHub.handleMsg(truthPid, data),
      })
      worker.onmessage = delegatedWorkerMessageHandler

      // 如果是 Worker 模式，发送初始化或恢复状态的消息
      if (hasWorker) {
        const stateToRestore = app.savedState?.app
        worker.postMessage({type: stateToRestore ? 'RESTORE' : 'INIT', payload: stateToRestore})
      }

      if (interactInfo) {
        this.#kernel.appIntereact({process: worker, interactInfo})
      }


      // 确定要写入状态机和数据库的目标状态。
      // 如果该应用启动前的初始状态是 HIBERNATED (会话恢复)，则建立好后台 Worker 实例后应当保持其 HIBERNATED 状态，绝不强行转为 RUNNING
      const targetStatus = originalStatus === 'HIBERNATED' ? 'HIBERNATED' : 'RUNNING'
      app.status = targetStatus

      if (!app.isSystemApp) {
        await this.#kernel.sysDb.updateData(app?.[ENV_KEY_NAME], {status: targetStatus})
      }
      this.#kernel.emitChange({type: 'APP_STATUS', pid: truthPid, status: targetStatus})
      return {isStart: true}
    } catch (e) {
      // console.log(e)
      alert.warning(`[内核] 启动应用 ${app?.[ENV_KEY_NAME]} (pid: ${truthPid})  失败:`, e)
      this.#kernel.kill(truthPid)
      return {isStart: false}
    }
  }

  // 存储这个关于,窗口状态,后续可以考虑多模式处理,是冷启动还是热。主要方案1.适用display全部热启动。方案二:外壳全部display,内层冷启动
  async saveWindowState(pid, windowRect) {
    const app = this.#kernel.getApp(pid)
    if (!app) return

    // 增量修改:使用全新的引用重建 savedState，确保触发浅层比较视图更新，防止引用地址不变造成 UI 监听器失效
    const prevSavedState = app.savedState || {app: null, window: null}
    app.savedState = {
      ...prevSavedState,
      window: windowRect,
    }

    if (!app.isSystemApp) {
      await this.#kernel.sysDb.updateData(app?.[ENV_KEY_NAME], {savedState: app.savedState})
    }
  }

  /**
   * 强制所有正在运行的应用保存其内部状态。
   * 这个接口主要用于页面关闭前（例如在 beforeunload 事件中调用），
   * 以确保所有应用的最新状态都被持久化，从而实现完美的会话恢复。
   */
  forceSaveAllStates() {
    // alert.success('[内核] 正在强制保存所有应用状态...')
    for (const pid of this.#kernel.processes.keys()) {
      const p = this.#kernel.processes.get(pid)
      if (p && p.worker) {
        // 向每个 worker 发送保存状态的指令。
        // 这是一个“即发即忘”的操作，因为 beforeunload 事件的执行时间有限，我们 不等待回复。
        p.worker.postMessage({type: 'SAVE_STATE'})
      }
    }
    // alert.success('[内核] 已向所有活动进程发送保存状态指令。')
  }

  /**
   * 休眠一个应用。
   * 此操作只改变应用的状态标记为 'HIBERNATED'，不会终止Worker进程。
   * Worker会继续在后台运行，保持其内部状态是“热”的。
   */
  async hibernate(pid) {
    const app = this.#kernel.getApp(pid)
    if (app && app.status === 'RUNNING') {
      // 更新内存状态
      app.status = 'HIBERNATED'
      // 如果是用户应用，立即同步到数据库
      if (!app.isSystemApp) {
        // 写入 status 的同时，写入 savedState
        // 这里的 app.savedState 应该是最新的，因为 #handleMsg 里的 STATE_UPDATE 一真在实时更新它
        await this.#kernel.sysDb.updateData(app?.[ENV_KEY_NAME], {
          status: 'HIBERNATED',
          savedState: app.savedState,
        })
      } else {
        //也更新状态,因为我们新增了display模式
        this.#kernel.systemApps.set(pid, {
          ...this.#kernel.systemApps.get(pid),
          status: 'HIBERNATED',
        })
      }
      this.#kernel.emitChange({type: 'APP_STATUS', pid, status: 'HIBERNATED'})
    }
  }

  /**
   * 强制清除应用的持久化运行状态
   */
  async clearAppSavedState(pid) {
    const app = this.#kernel.getApp(pid)
    if (app) {

      // 增量清理：只重置应用的内部业务状态（app），保留窗口的大小、缩放、最大化及位置信息（window）
      const prevSavedState = app.savedState || {app: null, window: null}
      app.savedState = {
        ...prevSavedState,
        app: null, // 只将应用级数据置空，保留 window 配置
      }

      const appName = app[ENV_KEY_NAME] || '未知应用'
      // 数据库更新（非系统应用）
      if (!app.isSystemApp) {
        await this.#kernel.sysDb.updateData(appName, {savedState: app.savedState})
      }
      // console.log(`[内核] 应用 ${appName} (pid: ${pid}) 的持久化状态已被清空。`)
      this.#kernel.emitChange({type: 'APP_STATE_CLEARED', pid})
    }
  }

  /**
   * 强制完全重置一个应用，无视配置直接清空状态并杀死进程
   * 用于用户主动发起的重置操作
   */
  async forceResetApp(pid) {
    // 终止进程
    this.#kernel.kill(pid)
    // 清理缓存
    this.#kernel.clearCachedState(pid)
    // 获取应用信息

    const app = this.#kernel.getApp(pid)
    if (app) {
      const appName = app[ENV_KEY_NAME] || '未知应用'
      // 更新应用状态为已安装
      app.status = 'INSTALLED'
      if (!app.isSystemApp) {
        await this.#kernel.sysDb.updateData(appName, {status: 'INSTALLED'})
      }
      // 无视配置文件，强制清空状态
      await this.clearAppSavedState(pid)
      console.log(`[内核] 应用 ${appName} (pid: ${pid}) 已被彻底重置并强制清空了所有状态。`)
    }
    // 通知状态变更
    this.#kernel.emitChange({type: 'APP_RESET', pid})
  }

  /**
   * 强制关闭一个应用 (与hibernate不同)。
   * 此操作会彻底终止Worker进程，根据配置决定是否清除已保存状态。
   * @param {string|number} pid - 应用进程ID
   */
  async forceKillProcess(pid) {
    // 终止进程
    this.#kernel.kill(pid)
    // 清理缓存
    this.#kernel.clearCachedState(pid)
    const app = this.#kernel.getApp(pid)
    if (app) {
      const appName = app[ENV_KEY_NAME] || '未知应用'
      // 更新应用状态
      app.status = 'INSTALLED'
      if (!app.isSystemApp) {
        await this.#kernel.sysDb.updateData(appName, {status: 'INSTALLED'})
      }
      // 检查是否需要自动清除保存的状态
      const shouldClearState = !app?.[ENV_KEY_META_INFO]?.saveState
      if (shouldClearState) {
        await this.clearAppSavedState(pid)
      }
      console.log(`[内核] 应用 ${appName} (pid: ${pid}) 已被强制关闭，状态已重置。`)
    }
    this.#kernel.emitChange({type: 'APP_STATUS', pid, status: 'INSTALLED'})
  }
  async reStartApp({pid}) {
    // 终止进程
    this.#kernel.kill(pid)
    const result = this.startProcess({pid})
    this.#kernel.emitChange({type: 'APP_RESTART', pid})
    return result
  }
  async forceReStartApp({pid}) {
    // 终止进程
    this.#kernel.kill(pid)
    // 清理缓存
    this.#kernel.clearCachedState(pid)
    const app = this.#kernel.getApp(pid)
    if (app) {
      app.status = 'INSTALLED'
      if (!app.isSystemApp) {
        await this.#kernel.sysDb.updateData(app?.[ENV_KEY_NAME], {status: 'INSTALLED'})
      }
      if (!app?.[ENV_KEY_META_INFO]?.saveState) {
        await this.clearAppSavedState(pid)
      }
      console.log(`[内核] 应用 ${app?.[ENV_KEY_NAME]} (pid: ${pid}) 已被强制关闭，状态已重置。`)
    }
    const result = this.startProcess({pid})
    this.#kernel.emitChange({type: 'APP_RESTART', pid})
    return result
  }

  // --- 系统恢复与进程管理 ---
  async restoreSession() {
    try {
      const allApps = [...this.#kernel.systemApps.values(), ...this.#kernel.userApps.values()]
      const appsToRestore = allApps.filter(
        a =>
          a.status === 'RUNNING' ||
          a.status === 'HIBERNATED' ||
          a?.[ENV_KEY_META_INFO]?.custom?.autoStart === true
      )
      // 由于这个system也介入了自动启动这里不再单独处理
      for (const app of appsToRestore) {
        //加入开机自启的选项
        // new Promise.all([])
        // 异步启动，不阻塞主流程
        this.startProcess({pid: app.pid})
      }
    } catch (err) {
      console.error('[内核] 会话恢复失败:', err)
    }
  }

  //拉起/唤起App
  async evokeApp({pid, from, interactInfo}) {
    const targetApp = this.#kernel.getApp(pid)
    if (!targetApp) {
      alert.failure('唤起失败!App未注册或已删除!')
    }
    const p = this.#kernel.processes.get(pid)
    const newInteractInfo = {...interactInfo, from} //注入from[App]信息
    if (p) {
      this.#kernel.appIntereact({process: p.worker, interactInfo: newInteractInfo})
    } else {
      this.startProcess({pid, interactInfo: newInteractInfo})
    }
  }
}

// 通用沙箱数据清理函数
export const clearAppSandboxData = async app => {
  const pid = app.pid
  const metaInfo = app?.[ENV_KEY_META_INFO]
  const resourceId = app?.[ENV_KEY_RESOURCE_ID]
  const appType = metaInfo?.appType
  const prefix = `pid-${pid}_` // 这里是对应沙箱前缀处理, 见 security.js 里对沙箱的命名规范, 所有存储相关的 key 都应该以这个前缀开头, 以便于清理
  // 清理 localStorage
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      window.localStorage.removeItem(key)
      i--
    }
  }
  // 清理 sessionStorage
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i)
    if (key && key.startsWith(prefix)) {
      window.sessionStorage.removeItem(key)
      i--
    }
  }
  // 清理 indexedDB (沙箱独立数据库)
  if (window.indexedDB && window.indexedDB.databases) {
    try {
      const dbs = await window.indexedDB.databases()
      for (const db of dbs) {
        if (db.name && db.name.startsWith(prefix)) {
          window.indexedDB.deleteDatabase(db.name)
        }
      }
    } catch (e) {
      console.warn('Failed to clear indexedDB for pid:', pid, e)
    }
  }
  // 针对系统应用，清理在公共系统数据库中注册的专属数据表
  if (appType === 'system' && resourceId) {
    try {
      // 遍历 STORES 配置，找出所有表名以当前 resourceId 开头的表
      const systemStores = Object.values(STORES || {}).filter(
        store => store.name && store.name.startsWith(resourceId)
      )

      for (const store of systemStores) {
        try {
          await getStore(store.name).clear()
          console.log(`[DB] 已自动清空系统应用 [${resourceId}] 的数据表: ${store.name}`)
        } catch (e) {
          console.warn(`[DB] 清空系统应用数据表 [${store.name}] 失败:`, e)
        }
      }
    } catch (e) {
      console.warn('[DB] 匹配系统应用数据表失败:', e)
    }
  }

  // 后续: 针对特定系统应用的独立宿主存储清理
  // 后续: 若应用在虚拟文件系统中建立了专属目录/节点 [通常以 resourceId 命名]，尝试将其一并清空
}

// ─── 代理导出函数──────────────────────

export async function startProcess(kernel, params) {
  return kernel.lifecycle.startProcess(params)
}

export async function saveWindowState(kernel, pid, windowRect) {
  return kernel.lifecycle.saveWindowState(pid, windowRect)
}

export function forceSaveAllStates(kernel) {
  kernel.lifecycle.forceSaveAllStates()
}

export async function hibernate(kernel, pid) {
  return kernel.lifecycle.hibernate(pid)
}

export async function clearAppSavedState(kernel, pid) {
  return kernel.lifecycle.clearAppSavedState(pid)
}

export async function forceResetApp(kernel, pid) {
  return kernel.lifecycle.forceResetApp(pid)
}

export async function forceKillProcess(kernel, pid) {
  return kernel.lifecycle.forceKillProcess(pid)
}

export async function reStartApp(kernel, params) {
  return kernel.lifecycle.reStartApp(params)
}

export async function forceReStartApp(kernel, params) {
  return kernel.lifecycle.forceReStartApp(params)
}

export async function restoreSession(kernel) {
  return kernel.lifecycle.restoreSession()
}

export async function evokeApp(kernel, params) {
  return kernel.lifecycle.evokeApp(params)
}
