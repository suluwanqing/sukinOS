import {alert} from '@/component/alert/layout'

export class Messaging {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  emitChange(info) {
    this.#kernel.commHub.emitChange(info)
  }

  notify(pid, type, data) {
    this.#kernel.commHub.notify(pid, type, data)
  }

  async handleMsg(pid, msg) {
    await this.#kernel.commHub.handleMsg(pid, msg)
  }

  systemSwitch(processEntry, payload) {
    const {method, args} = payload
    switch (method) {
      case 'UPLOAD_RESOURCE': {
        this.#kernel
          .uploadResource(args)
          .then(() =>
            processEntry.worker.postMessage({
              type: 'UI_ACTION',
              payload: {type: 'MSG', payload: '应用安装成功！'},
            })
          )
          .catch(e =>
            processEntry.worker.postMessage({
              type: 'UI_ACTION',
              payload: {type: 'MSG', payload: `错误: ${e.message}`},
            })
          )
        break
      }
    // case 'LOGIN': {
    //    if (this.login(args.userId, args.userName)) {
    //     p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: this.currentUser } })
    //   }
    //   break
    // }
    // case 'LOGOUT': {
    //   this.logout();
    //   p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: null } })
    //   break
    // }
      default: {
        alert.warning('未找到对应处理器!')
        break
      }
    }
  }

  notSystemSwitch(payload) {
    const {method} = payload
    switch (method) {
      default: {
        alert.warning('未找到对应处理器!')
        break
      }
    }
  }

  dispatch(pid, action) {
    //实际还是UI触发只是会区分给kernel还是worker
    const p = this.#kernel.processes.get(pid)
    const isSystem = this.#kernel.isSystemApp(pid)
    if (!p) return
    if (action.type === 'KERNEL_CALL' && action.payload) {
      //区分系统和非系统 应用处理器
      isSystem ? this.systemSwitch(p, action.payload) : this.notSystemSwitch(action.payload)
      return
    }
    //非内核事件,转发给对应的worker进程
    p.worker.postMessage({type: 'UI_ACTION', payload: action})
  }

  subscribeApp(pid, cb) {
    return this.#kernel.commHub.subscribeApp(pid, cb)
  }

  subscribeSystem(cb) {
    return this.#kernel.commHub.subscribeSystem(cb)
  }

  subscribe(topic, cb) {
    return this.#kernel.commHub.subscribe(topic, cb)
  }

  publish(topic, payload) {
    return this.#kernel.commHub.publish(topic, payload)
  }

  appIntereact(process, interactInfo) {
    process.postMessage({type: 'APP_INTERACT', payload: interactInfo})
  }
}

// ─── 代理导出函数 ──────────────────────

export function emitChange(kernel, info) {
  kernel.messaging.emitChange(info)
}

export function notify(kernel, pid, type, data) {
  kernel.messaging.notify(pid, type, data)
}

export async function handleMsg(kernel, pid, msg) {
  await kernel.messaging.handleMsg(pid, msg)
}

export function systemSwitch(kernel, processEntry, payload) {
  kernel.messaging.systemSwitch(processEntry, payload)
}

export function notSystemSwitch(kernel, payload) {
  kernel.messaging.notSystemSwitch(payload)
}

export function dispatch(kernel, pid, action) {
  kernel.messaging.dispatch(pid, action)
}

//订阅App行为,这是指自身
export function subscribeApp(kernel, pid, cb) {
  return kernel.messaging.subscribeApp(pid, cb)
}
//订阅系统行为,这是固定的消息类型
export function subscribeSystem(kernel, cb) {
  return kernel.messaging.subscribeSystem(cb)
}
// 向内核通信枢纽订阅指定主题消息的委托函数[kernel,app都可]
export function subscribe(kernel, topic, cb) {
  return kernel.messaging.subscribe(topic, cb)
}
// 向内核通信枢纽发布指定主题消息的委托函数[kernel,app都可]
export function publish(kernel, topic, payload) {
  return kernel.messaging.publish(topic, payload)
}
//App间交互
export function appIntereact(kernel, {process, interactInfo}) {
  kernel.messaging.appIntereact(process, interactInfo)
}
