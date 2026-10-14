export default class IndexDb {
  constructor(cfg) {
    // 映射配置项 (统一使用大写 Key)
    this.name = cfg.DB_NAME
    this.store = cfg.STORE_NAME
    this.keyPath = cfg.KEY_PATH || 'id'
    this.version = cfg.VERSION || 1
    this.indexes = cfg.INDEXES || []
    this.db = null
  }


  /**
   * 建立连接：版本升级与索引补建都在 onupgradeneeded 内完成
   */
  async openDB() {
    if (this.db && !this.db.closed) return this.db
    this.db = null

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, this.version)
      // 数据库升级/初始化事件 (首次创建或版本增加时触发)
      req.onupgradeneeded = (e) => {
        const db = e.target.result
        const tx = e.target.transaction
        let objectStore
        if (!db.objectStoreNames.contains(this.store)) {
          objectStore = db.createObjectStore(this.store, { keyPath: this.keyPath })
        } else {
          // 如果已存在，获取现有 store 的引用 (以便添加新索引)
          objectStore = tx.objectStore(this.store)
        }

        if (this.indexes && Array.isArray(this.indexes)) {
          this.indexes.forEach(idx => {
            // idx 结构: { name: '索引名', keyPath?: '字段名', unique?: boolean }
            if (!objectStore.indexNames.contains(idx.name)) {
              const keyPath = idx.keyPath || idx.name
              const options = { unique: !!idx.unique }
              objectStore.createIndex(idx.name, keyPath, options)
              console.log(`[IndexDb] Index created: ${idx.name} in ${this.name}`)
            }
          })
        }
      }

      req.onsuccess = () => {
        this.db = req.result
        // 监听数据库意外关闭和版本变更
        this.db.onclose = () => { this.db = null }
        this.db.onversionchange = () => { this.db.close(); this.db = null }
        resolve(this.db)
      }

      req.onerror = (e) => {
        console.error("DB Error:", e)
        reject(e.target.error)
      }

      req.onblocked = () => {
        console.warn(`[IndexDb] Database ${this.name} is blocked`)
      }
    })
  }

  /** 写入整条记录（同 key 直接覆盖） */
  async putData(d) {
    await this.openDB()
    return this.#tx('readwrite', s => s.put(d))
  }

  async getData(k) {
    await this.openDB()
    return this.#tx('readonly', s => s.get(k))
  }

  async getAllData() {
    await this.openDB()
    return this.#tx('readonly', s => s.getAll())
  }

  async deleteData(k) {
    await this.openDB()
    return this.#tx('readwrite', s => s.delete(k))
  }

  /** 先读旧数据、浅合并后再写入 */
  async updateData(k, val) {
    const old = await this.getData(k)
    if(old) await this.putData({...old, ...val})
  }

  isOpen() { return !!this.db && !this.db.closed }

  /** 关闭数据库连接（用户切换时使用） */
  async closeDB() {
    if (this.db && !this.db.closed) {
      this.db.close()
      this.db = null
    }
  }


    async clearAll() {
      await this.openDB()
      return this.#tx('readwrite', s => s.clear())
    }


  /** 事务辅助：op 拿到 objectStore，resolve 请求的 result */

  #tx(m, op) {
    return new Promise((resolve, reject) => {
      const t = this.db.transaction(this.store, m)
      const req = op(t.objectStore(this.store))
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }
}
