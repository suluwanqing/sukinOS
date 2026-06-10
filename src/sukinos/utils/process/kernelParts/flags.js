export class Flags {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  isSystemApp(pid) {
    return this.#kernel.systemApps.has(pid)
  }

  setDispatch(dispatch) {
    this.#kernel.storeDispatch = dispatch
  }
}

// ─── 代理导出函数 ──────────────────────

export function isSystemApp(kernel, pid) {
  return kernel.flags.isSystemApp(pid)
}

export function setDispatch(kernel, dispatch) {
  kernel.flags.setDispatch(dispatch)
}
