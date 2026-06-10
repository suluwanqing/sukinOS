export class Cache {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  getCachedState(pid) {
    return this.#kernel.commHub.getCachedState(pid)
  }

  clearCachedState(pid) {
    this.#kernel.commHub.clearCachedState(pid)
  }
}

// ─── 代理导出函数 ──────────────────────

export function getCachedState(kernel, pid) {
  return kernel.cache.getCachedState(pid)
}

export function clearCachedState(kernel, pid) {
  kernel.cache.clearCachedState(pid)
}
