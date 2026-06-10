// 获取资源,因为都是加载到内存里的
export class ResourceAccess {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  getResource(resourceId) {
    return this.#kernel.resourceCache[resourceId]
  }
}

// ─── 代理导出函数──────────────────────

export function getResource(kernel, resourceId) {
  return kernel.resourceAccess.getResource(resourceId)
}
