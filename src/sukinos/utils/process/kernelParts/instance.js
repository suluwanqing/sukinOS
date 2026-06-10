export class Instance {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  getInstanceDb() {
    return this.#kernel.instanceDb
  }
}

// ─── 代理导出函数 ──────────────────────

export function getInstanceDb(kernel) {
  return kernel.instance.getInstanceDb()
}
