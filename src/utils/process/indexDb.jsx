export default class IndexDb {
  constructor(cfg) {
    // k是主键
    // 映射配置项 (统一使用大写 Key)
    this.name = cfg.DB_NAME;
    this.store = cfg.STORE_NAME;
    this.keyPath = cfg.KEY_PATH || 'id';
    this.version = cfg.VERSION || 1;
    // 获取索引配置列表
    this.indexes = cfg.INDEXES || [];
    this.db = null;
  }


  /**
   * 打开数据库连接
   * 处理版本升级和索引创建
   */
  async openDB() {
    if (this.db) return;
    return new Promise((resolve) => {
      // 打开数据库，传入配置的版本号
      const req = indexedDB.open(this.name, this.version);
      // 数据库升级/初始化事件 (首次创建或版本增加时触发)
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const tx = e.target.transaction;
        let objectStore;
        // 创建或获取 ObjectStore
        if (!db.objectStoreNames.contains(this.store)) {
          // 如果不存在，创建新的 ObjectStore
          objectStore = db.createObjectStore(this.store, { keyPath: this.keyPath });
        } else {
          // 如果已存在，获取现有 store 的引用 (以便添加新索引)
          objectStore = tx.objectStore(this.store);
        }

        // 动态创建索引
        if (this.indexes && Array.isArray(this.indexes)) {
          this.indexes.forEach(idx => {
            // idx 结构: { name: '索引名', keyPath?: '字段名', unique?: boolean }
            // 检查索引是否已存在
            if (!objectStore.indexNames.contains(idx.name)) {
              // 如果配置中未指定 keyPath，默认使用 name 作为 keyPath
              const keyPath = idx.keyPath || idx.name;
              // 处理 unique 选项，默认为 false
              const options = { unique: !!idx.unique };
              // 创建索引
              objectStore.createIndex(idx.name, keyPath, options);
              console.log(`[IndexDb] Index created: ${idx.name} in ${this.name}`);
            }
          });
        }
      };

      // 连接成功
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };

      // 连接失败
      req.onerror = (e) => console.error("DB Error:", e);
    });
  }

  /**
   * 写入数据d要写入的数据对象
   */
  async putData(d) {
    await this.openDB();
    return this._tx('readwrite', s => s.put(d));
  }

  /**
   * 获取数据
   */
  async getData(k) {
    await this.openDB();
    return this._tx('readonly', s => s.get(k));
  }

  /**
   * 获取所有数据 (GetAll)
   */
  async getAllData() {
    await this.openDB();
    return this._tx('readonly', s => s.getAll());
  }

  /**
   * 删除数据 (Delete)
   */
  async deleteData(k) {
    await this.openDB();
    return this._tx('readwrite', s => s.delete(k));
  }

  /**
   * 更新数据
   * 先读取旧数据，合并后再写入
   * val - 要更新的字段
   */
  async updateData(k, val) {
    const old = await this.getData(k);
    if(old) await this.putData({...old, ...val});
  }

  /**
   * 检查数据库是否已打开
   */
  isOpen() { return !!this.db; }

  /**
   * 内部事务辅助函数
   * m - 模式 'readonly' | 'readwrite'
   * op - 操作回调
   */
  _tx(m, op) {
    return new Promise((resolve, reject) => {
      const t = this.db.transaction(this.store, m);
      const req = op(t.objectStore(this.store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }
}
