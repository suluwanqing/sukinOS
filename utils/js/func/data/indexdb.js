class indexDb {
  constructor(params) {
    //indexDb是懒加载,这里呢我们也是只有真正开始使用的时候才会开始是否需要开启
    if (!params || typeof params !== 'object') {
      throw new Error('无效参数：必须提供配置对象')
    }

    // 验证必要参数
    const requiredParams = ['dbName', 'cacheTableName', 'keyPath']
    for (const param of requiredParams) {
      if (!params[param]) {
        throw new Error(`缺少必要参数：${param}`)
      }
    }

    this.dbName = params.dbName //数据库名
    this.autoIncrement = params.autoIncrement || false
    //主键是否自增,只有zhujian才能有这个配置.[但注意如果你显式传输主键且配置了的化是使用传输的,且他的自增不会受到传输的类型影响]
    this.cacheTableName = params.cacheTableName //分区表名
    this.keyPath = params.keyPath //这是主键,必需是唯一的
    this.indexs = params.indexs || []
    this.db = null
    this.indexedDB = this._getIndexedDB()
    this._isOpen = false
    this.autoTimestamp = params.autoTimestamp !== false // 默认开启自动时间戳
    this.autoTimestampPre = params.autoTimestampPre || '' //如果传输了它将作为自增数据前缀
    this.timestampField = params.timestampField || 'lastUpdate' // 时间戳字段名
  }

  // 私有方法：获取兼容的 indexedDB 实例
  _getIndexedDB() {
    // 1. 浏览器环境
    if (typeof window !== 'undefined' && window.indexedDB) {
      return window.indexedDB
    }
    // 2. Web Worker 环境
    else if (typeof self !== 'undefined' && self.indexedDB) {
      return self.indexedDB
    }
    // // 3. Node.js 环境（使用 fake-indexeddb）
    // else if (typeof require !== 'undefined') {
    //   try {
    //     const fakeIndexedDB = require('fake-indexeddb')
    //     if (!global.IDBKeyRange) {
    //       global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange')
    //     }
    //     return fakeIndexedDB
    //   } catch (e) {
    //     console.warn('未安装 fake-indexeddb。请运行：npm install fake-indexeddb')
    //     return null
    //   }
    // }
    return null
  }

  // 检查是否支持 IndexedDB
  isSupported() {
    return !!this.indexedDB
  }

  // 检查数据库是否已打开
  isOpen() {
    return this._isOpen && this.db
  }

  // 打开或创建数据库
  async openDB() {
    if (!this.isSupported()) {
      throw new Error('当前环境不支持 IndexedDB')
    }

    if (this.isOpen()) {
      console.warn('数据库已经打开')
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = this.indexedDB.open(this.dbName, 1)

      request.onerror = event => {
        const error = event.target.error
        console.error('数据库打开错误：', error)
        reject(new Error(`打开数据库失败：${error.message}`))
      }

      request.onblocked = () => {
        console.warn('数据库打开被阻塞')
        reject(new Error('数据库打开被阻塞（可能有其他连接打开）'))
      }

      request.onsuccess = event => {
        this.db = event.target.result
        this._isOpen = true

        this.db.onclose = () => {
          this._isOpen = false
          console.log('数据库连接已关闭')
        }

        this.db.onversionchange = () => {
          console.log('检测到数据库版本变更')
          this.db.close()
          this._isOpen = false
        }

        resolve(this.db)
      }

      request.onupgradeneeded = event => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this.cacheTableName)) {
          try {
            const objectStore = db.createObjectStore(this.cacheTableName, {
              keyPath: this.keyPath,
              autoIncrement: this.autoIncrement,
            })

            this.indexs.forEach(index => {
              if (index.name && typeof index.name === 'string') {
                objectStore.createIndex(index.name, index.path || index.name, {
                  unique: !!index.unique,
                })
              }
            })

            // 如果启用了自动时间戳，确保时间戳字段有索引
            if (
              this.autoTimestamp &&
              !this.indexs.some(
                index =>
                  index.name === this.timestampField ||
                  (index.path && index.path === this.timestampField)
              )
            ) {
              objectStore.createIndex(this.timestampField, this.timestampField, {
                unique: false,
              })
            }

            console.log('对象存储和索引创建成功')
          } catch (e) {
            console.error('创建对象存储时出错：', e)
            event.target.transaction.abort()
            reject(e)
          }
        }
      }
    })
  }

  // 私有方法：自动添加时间戳
  _addTimestamp(data, isUpdate = false) {
    if (!this.autoTimestamp) {
      return data
    }

    const timestamp = new Date()

    if (isUpdate) {
      // 更新操作，只设置更新时间
      return {
        ...data,
        [this.timestampField]: this.autoTimestampPre + String(timestamp),
      }
    } else {
      // 新增操作，设置创建时间和更新时间
      return {
        ...data,
        [this.timestampField]: this.autoTimestampPre + String(timestamp),
      }
    }
  }

  // 添加或更新数据
  async putData(data) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    if (!data || typeof data !== 'object') {
      throw new Error('无效数据：必须是一个对象')
    }

    if (!data[this.keyPath]) {
      throw new Error(`数据必须包含 keyPath 属性：${this.keyPath}`)
    }

    // 自动添加时间戳
    const dataWithTimestamp = this._addTimestamp(data)

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readwrite') //表示创建事务,权限是read和write但是只能操作这一张表
      const objectStore = transaction.objectStore(this.cacheTableName)
      const request = objectStore.put(dataWithTimestamp)

      request.onerror = event => {
        const error = event.target.error
        console.error('数据保存错误：', error)
        reject(new Error(`保存数据失败：${error.message}`))
      }

      transaction.oncomplete = () => {
        resolve(dataWithTimestamp[this.keyPath])
      }

      transaction.onerror = event => {
        const error = event.target.error
        console.error('事务错误：', error)
        reject(new Error(`事务失败：${error.message}`))
      }
    })
  }

  // 批量添加数据
  async putAllData(items) {
    if (!Array.isArray(items)) {
      throw new Error('项目必须是一个数组')
    }

    const results = []
    for (const item of items) {
      try {
        const result = await this.putData(item)
        results.push(result)
      } catch (e) {
        console.error(`保存键为 ${item[this.keyPath]} 的项目失败：`, e)
        throw e
      }
    }
    return results
  }

  // 根据主键获取数据
  async getData(key) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readonly')
      const objectStore = transaction.objectStore(this.cacheTableName)
      const request = objectStore.get(key)

      request.onerror = event => {
        const error = event.target.error
        console.error('数据获取错误：', error)
        reject(new Error(`获取数据失败：${error.message}`))
      }

      request.onsuccess = event => {
        resolve(event.target.result || null)
      }
    })
  }

  // 根据索引获取数据
  async getDataByIndex(indexName, value) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    if (!indexName || typeof indexName !== 'string') {
      throw new Error('无效的索引名称')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readonly')
      const objectStore = transaction.objectStore(this.cacheTableName)

      if (!objectStore.indexNames.contains(indexName)) {
        reject(new Error(`索引 ${indexName} 不存在`))
        return
      }

      const index = objectStore.index(indexName)
      const request = index.get(value)

      request.onerror = event => {
        const error = event.target.error
        console.error('通过索引获取数据错误：', error)
        reject(new Error(`通过索引获取数据失败：${error.message}`))
      }

      request.onsuccess = event => {
        resolve(event.target.result || null)
      }
    })
  }

  // 获取所有数据
  async getAllData() {
    if (!this.isOpen()) {
      await this.openDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readonly')
      const objectStore = transaction.objectStore(this.cacheTableName)
      const request = objectStore.getAll()

      request.onerror = event => {
        const error = event.target.error
        console.error('获取所有数据错误：', error)
        reject(new Error(`获取所有数据失败：${error.message}`))
      }

      request.onsuccess = event => {
        resolve(event.target.result || [])
      }
    })
  }

  // 根据索引,获取所有匹配数据
  async getAllDataByIndex(indexName, value) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    if (!indexName || typeof indexName !== 'string') {
      throw new Error('无效的索引名称')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readonly')
      const objectStore = transaction.objectStore(this.cacheTableName)

      if (!objectStore.indexNames.contains(indexName)) {
        reject(new Error(`索引 ${indexName} 不存在`))
        return
      }

      const index = objectStore.index(indexName)
      const request = index.getAll(value)

      request.onerror = event => {
        const error = event.target.error
        console.error('通过索引获取所有数据错误：', error)
        reject(new Error(`通过索引获取所有数据失败：${error.message}`))
      }

      request.onsuccess = event => {
        resolve(event.target.result || [])
      }
    })
  }

  //根据主键删除数据
  async deleteData(key) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readwrite')
      const objectStore = transaction.objectStore(this.cacheTableName)
      const request = objectStore.delete(key)

      request.onerror = event => {
        const error = event.target.error
        console.error('数据删除错误：', error)
        reject(new Error(`删除数据失败：${error.message}`))
      }

      transaction.oncomplete = () => {
        resolve(true)
      }

      transaction.onerror = event => {
        const error = event.target.error
        console.error('事务错误：', error)
        reject(new Error(`事务失败：${error.message}`))
      }
    })
  }

  // 清空对象存储
  async clearStore() {
    if (!this.isOpen()) {
      await this.openDB()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readwrite')
      const objectStore = transaction.objectStore(this.cacheTableName)
      const request = objectStore.clear()

      request.onerror = event => {
        const error = event.target.error
        reject(new Error(`清空存储失败：${error.message}`))
      }

      transaction.oncomplete = () => {
        resolve(true)
      }

      transaction.onerror = event => {
        const error = event.target.error
        reject(new Error(`事务失败：${error.message}`))
      }
    })
  }

  // 更新[仍然是主键和对象]数据
  async updateData(key, updates) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    if (!key) {
      throw new Error('无效的键：必须提供有效的键')
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      throw new Error('无效的更新：必须提供包含更新的非空对象')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readwrite')
      const objectStore = transaction.objectStore(this.cacheTableName)

      const getRequest = objectStore.get(key)

      getRequest.onerror = event => {
        const error = event.target.error
        reject(new Error(`获取数据失败：${error.message}`))
      }

      getRequest.onsuccess = event => {
        const existingData = event.target.result

        if (!existingData) {
          reject(new Error(`未找到数据：${key}`))
          return
        }

        // 自动添加更新时间戳
        const updatedData = this._addTimestamp(
          {
            ...existingData,
            ...updates,
          },
          true
        )

        const putRequest = objectStore.put(updatedData)

        putRequest.onerror = event => {
          const error = event.target.error
          reject(new Error(`更新数据失败：${error.message}`))
        }

        putRequest.onsuccess = () => {
          resolve(true)
        }
      }

      transaction.onerror = event => {
        const error = event.target.error
        reject(new Error(`事务失败：${error.message}`))
      }
    })
  }

  // 关闭数据库
  closeDB() {
    if (this.isOpen()) {
      this.db.close()
      this._isOpen = false
      console.log('数据库已关闭')
    }
  }

  // 删除数据库
  async deleteDB() {
    this.closeDB()

    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('当前环境不支持 IndexedDB'))
        return
      }

      const request = this.indexedDB.deleteDatabase(this.dbName)

      request.onerror = event => {
        const error = event.target.error
        console.error('删除数据库错误：', error)
        reject(new Error(`删除数据库失败：${error.message}`))
      }

      request.onsuccess = () => {
        resolve(true)
      }

      request.onblocked = () => {
        console.warn('数据库删除被阻塞')
        reject(new Error('数据库删除被阻塞（可能有其他连接打开）'))
      }
    })
  }

  // ========== 文件历史记录专用方法 ==========

  // 添加文件历史记录（便捷方法）
  async putFileHistory(fileData) {
    if (!fileData || typeof fileData !== 'object') {
      throw new Error('无效的文件数据：必须是一个对象')
    }

    const requiredFields = [
      'historyId',
      'fileId',
      'fileName',
      'date',
      'data',
      'lastUpdate',
      'fatherPath',
      'fullPath',
    ]
    for (const field of requiredFields) {
      if (fileData[field] === undefined || fileData[field] === null) {
        throw new Error(`缺少必要字段：${field}`)
      }
    }

    const fileRecord = {
      historyId: fileData.historyId,
      fileId: fileData.fileId,
      fileName: fileData.fileName,
      date: fileData.date,
      data: fileData.data,
      lastUpdate: fileData.lastUpdate,
      fatherPath: fileData.fatherPath,
      fullPath: fileData.fullPath,
      compositeId: `${fileData.fileId}_${fileData.historyId}`,
    }

    return this.putData(fileRecord)
  }

  // 获取文件的所有历史版本
  async getFileHistoriesByFileId(fileId, limit) {
    const histories = await this.getAllDataByIndex('fileId', fileId)

    // 按historyId降序排列（最新的在前面）
    histories.sort((a, b) => b.historyId - a.historyId)

    // 限制返回数量
    if (limit && histories.length > limit) {
      return histories.slice(0, limit)
    }

    return histories
  }

  // 获取文件的最新版本
  async getLatestFileVersion(fileId) {
    const histories = await this.getFileHistoriesByFileId(fileId, 1)
    return histories.length > 0 ? histories[0] : null
  }

  // 根据完整路径获取文件历史记录
  async getFileHistoriesByFullPath(fullPath) {
    const histories = await this.getAllDataByIndex('fullPath', fullPath)
    // 按historyId降序排列（最新的在前面）
    histories.sort((a, b) => b.historyId - a.historyId)
    return histories
  }

  // 删除文件的所有历史版本
  async deleteAllFileHistories(fileId) {
    const histories = await this.getFileHistoriesByFileId(fileId)
    const deletePromises = histories.map(history => this.deleteData(history.compositeId))
    return Promise.all(deletePromises)
  }

  // ========== 新增方法：按时间范围查询 ==========

  // 根据时间范围获取数据
  async getDataByTimeRange(startTime, endTime, indexName = null) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    const timestampField = indexName || this.timestampField

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readonly')
      const objectStore = transaction.objectStore(this.cacheTableName)

      if (!objectStore.indexNames.contains(timestampField)) {
        reject(new Error(`时间戳索引 ${timestampField} 不存在`))
        return
      }

      const index = objectStore.index(timestampField)
      const range = IDBKeyRange.bound(startTime, endTime)
      const request = index.getAll(range)

      request.onerror = event => {
        const error = event.target.error
        console.error('按时间范围查询错误：', error)
        reject(new Error(`按时间范围查询失败：${error.message}`))
      }

      request.onsuccess = event => {
        resolve(event.target.result || [])
      }
    })
  }

  // 获取最近的数据
  async getRecentData(limit = 100, indexName = null) {
    if (!this.isOpen()) {
      await this.openDB()
    }

    const timestampField = indexName || this.timestampField

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.cacheTableName], 'readonly')
      const objectStore = transaction.objectStore(this.cacheTableName)

      if (!objectStore.indexNames.contains(timestampField)) {
        reject(new Error(`时间戳索引 ${timestampField} 不存在`))
        return
      }

      const index = objectStore.index(timestampField)
      const request = index.openCursor(null, 'prev') // 反向遍历，最新的在前面

      const results = []
      request.onerror = event => {
        const error = event.target.error
        reject(new Error(`获取最近数据失败：${error.message}`))
      }

      request.onsuccess = event => {
        const cursor = event.target.result
        if (cursor && results.length < limit) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
    })
  }
}

// 文件历史记录数据库配置
const fileHistoryConfig = {
  dbName: 'FileHistoryDB',
  cacheTableName: 'file_histories', //分区表名
  keyPath: 'compositeId', // 使用复合ID作为主键
  indexs: [
    {name: 'fileId', unique: false}, // 文件ID索引
    {name: 'historyId', unique: false}, // 历史记录ID索引
    {name: 'fileName', unique: false}, // 文件名索引
    {name: 'fullPath', unique: false}, // 完整路径索引
    {name: 'fatherPath', unique: false}, // 父路径索引
    {name: 'lastUpdate', unique: false}, // 最后更新时间索引
    {
      name: 'file_history', // 文件ID和历史记录ID复合索引
      path: ['fileId', 'historyId'], //表示这个需要复合的索引
      unique: true,
    },
  ],
  autoTimestamp: true, // 启用自动时间戳
  timestampField: 'lastUpdate', // 时间戳字段名
}

// 使用示例
async function demo() {
  try {
    // 1. 创建数据库实例
    const fileDB = new indexDb(fileHistoryConfig)

    // 2. 检查支持性
    if (!fileDB.isSupported()) {
      console.error('当前环境不支持 IndexedDB')
      return
    }

    // 3. 打开数据库
    await fileDB.openDB()
    console.log('数据库打开成功')

    // 4. 使用通用方法添加数据（会自动添加lastUpdate）
    const fileHistory1 = {
      compositeId: 'file_001_1',
      historyId: 1,
      fileId: 'file_001',
      fileName: 'document.txt',
      date: '2024-01-15',
      data: '这是第一个版本的内容',
      fatherPath: '/documents',
      fullPath: '/documents/document.txt',
      // 注意：这里没有提供 lastUpdate，会自动添加
    }

    await fileDB.putData(fileHistory1)
    console.log('数据保存成功：', fileHistory1.compositeId)

    // 5. 使用专用方法添加文件历史记录
    const fileHistory2 = {
      historyId: 2,
      fileId: 'file_001',
      fileName: 'document.txt',
      date: '2024-01-16',
      data: '这是第二个版本，包含更新内容',
      fatherPath: '/documents',
      fullPath: '/documents/document.txt',
      // lastUpdate 会自动添加
    }

    await fileDB.putFileHistory(fileHistory2)
    console.log('文件历史记录保存成功')

    // 6. 使用通用方法查询
    const data = await fileDB.getData('file_001_1')
    console.log('获取到的数据：', data)
    console.log('自动添加的时间戳：', data.lastUpdate)

    // 7. 使用专用方法查询文件历史
    const fileHistories = await fileDB.getFileHistoriesByFileId('file_001')
    console.log('文件历史记录：', fileHistories)

    // 8. 获取最新版本
    const latestVersion = await fileDB.getLatestFileVersion('file_001')
    console.log('最新版本：', latestVersion)

    // 9. 使用通用方法获取所有数据
    const allData = await fileDB.getAllData()
    console.log('所有数据数量：', allData.length)

    // 10. 测试更新数据（会自动更新lastUpdate）
    await fileDB.updateData('file_001_1', {
      data: '更新后的内容',
      // 不需要手动设置lastUpdate
    })
    console.log('数据更新成功')

    // 11. 测试删除数据
    await fileDB.deleteData('file_001_1')
    console.log('数据删除成功')

    // 12. 重新获取所有数据确认删除
    const remainingData = await fileDB.getAllData()
    console.log('删除后剩余数据数量：', remainingData.length)

    // 13. 测试时间范围查询
    const startTime = new Date('2024-01-01')
    const endTime = new Date()
    const timeRangeData = await fileDB.getDataByTimeRange(startTime, endTime)
    console.log('时间范围内数据数量：', timeRangeData.length)

    // 14. 测试获取最近数据
    const recentData = await fileDB.getRecentData(5)
    console.log('最近5条数据：', recentData)
  } catch (error) {
    console.error('示例运行错误：', error)
  }
}

// 运行示例
// demo()

export default indexDb
