import {extInspectZombieFile, extUploadCloud} from '../generateApp'

export class Internals {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  async inspectZombieFile(fileHandle) {
    return extInspectZombieFile(this.#kernel, fileHandle)
  }

  async uploadCloud(data) {
    return extUploadCloud(this.#kernel, data)
  }

  kill(pid) {
    this.#kernel.stopAutoSaveState(pid)
    this.#kernel.stopAutoSaveWindow(pid)
    const p = this.#kernel.processes.get(pid)
    if (p) {
      p.worker.terminate()
      // 增加安全性校验，防止纯前端应用 (worker: false) 在没有 blob url 时执行释放操作导致崩溃
      if (p.url) {
        URL.revokeObjectURL(p.url)
      }
      this.#kernel.processes.delete(pid)
      this.#kernel.commHub.clearProcessSubscriptions(pid) // 进程销毁时同步卸载该沙箱所有的跨端消息订阅
    }
  }

  getProcessApp(pid) {
    //先暂时统一,避免后续需要新的写入比较
    return this.#kernel.processes.get(pid)
  }

  // 队列执行器：串行消费 installQueue，isProcessingQueue 保证同一时刻只有一个排空循环
  async processInstallQueue() {
    if (this.#kernel.isProcessingQueue || this.#kernel.installQueue.length === 0) return
    this.#kernel.isProcessingQueue = true
    while (this.#kernel.installQueue.length > 0) {
      const task = this.#kernel.installQueue.shift()
      try {
        await task()
      } catch (err) {
        console.error('[内核队列] 执行任务失败:', err)
      }
    }
    this.#kernel.isProcessingQueue = false
  }

  enqueueInstallTask(task) {
    this.#kernel.installQueue.push(task)
    this.processInstallQueue()
  }
}

export async function inspectZombieFile(kernel, fileHandle) {
  return kernel.internals.inspectZombieFile(fileHandle)
}

export async function uploadCloud(kernel, data) {
  return kernel.internals.uploadCloud(data)
}

export function kill(kernel, pid) {
  kernel.internals.kill(pid)
}

export function getProcessApp(kernel, pid) {
  return kernel.internals.getProcessApp(pid)
}

export async function processInstallQueue(kernel) {
  return kernel.internals.processInstallQueue()
}

export function enqueueInstallTask(kernel, task) {
  kernel.internals.enqueueInstallTask(task)
}
