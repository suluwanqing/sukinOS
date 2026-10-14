export class Instance {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  getInstanceDb() {
    return this.#kernel.instanceDb
  }
}

export function getInstanceDb(kernel) {
  return kernel.instance.getInstanceDb()
}
