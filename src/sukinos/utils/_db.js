import {DB_SYSTEM_APP} from '@/sukinos/utils/config'

// ==================== 表结构配置 ====================
export const STORES = {
  BOARDS: {
    name: 'sys-drawBoard_boards',
    keyPath: 'id',
    indexes: [], // 索引格式: { name: '索引名', keyPath: '字段名', options: { unique: false } }
  },
  MINDMAPS: {
    name: 'sys-drawBoard_mindmaps',
    keyPath: 'id',
    indexes: [],
  },
  SHEET: {
    name: 'sys-sheet_states',
    keyPath: 'id',
    indexes: [],
  },
  // 系统表都需要以resourceId为开头，以便于管理
}

const CURRENT_VERSION = 1

let dbInstance = null

// ==================== 版本迁移策略 ====================
// 说明：
// -每次修改表结构（添加/删除表、添加索引等），需要增加 CURRENT_VERSION
// -在 migrations 中添加对应版本的迁移函数
// -迁移函数会按版本号顺序执行，从旧版本逐个升级到新版本
// =只在新版本首次打开数据库时执行，数据会保留
const migrations = {
  // ----- 版本 1：初始创建 -----
  1: db => {
    createStores(db, [STORES.BOARDS, STORES.MINDMAPS, STORES.SHEET])
  },

  // ========== 以下是升级示例（按需取消注释） ==========

  // ----- 添加新表-----
  // 场景：新增一个 settings 配置表
  // 步骤：
  //   -将 CURRENT_VERSION 改为 2
  //   -取消下面代码的注释
  //   -在 STORES 中添加 settings 的配置
  // 2: (db) => {
  //   console.log('[DB Migration] 版本2: 添加 settings 表')
  //   if (!db.objectStoreNames.contains('settings')) {
  //     db.createObjectStore('settings', { keyPath: 'key' })
  //   }
  // },

  // ----- 添加索引会[丢失数据]-----
  // 场景：给 boards 表添加 createdAt 索引，可以接受数据丢失
  // 步骤：
  //  -将 CURRENT_VERSION 改为 2
  //  -取消下面代码的注释
  //  -更新 STORES.BOARDS.indexes 配置
  // 2: (db) => {
  //   console.log('[DB Migration] 版本2: 为 boards 表添加 createdAt 索引（清空数据）')
  //   if (db.objectStoreNames.contains('boards')) {
  //     db.deleteObjectStore('boards')
  //   }
  //   const store = db.createObjectStore('boards', { keyPath: 'id' })
  //   store.createIndex('createdAt', 'createdAt', { unique: false })
  // },

  // ----- 添加索引[保留数据迁移]-----
  // 场景：给 boards 表添加 createdAt 索引，需要保留现有数据
  // 步骤：
  //   -将 CURRENT_VERSION 改为 2
  //   -取消下面代码的注释
  //   -更新 STORES.BOARDS.indexes 配置
  //   -应用层需要同时支持读取新旧表名（boards_new）
  // 2: async (db) => {
  //   console.log('[DB Migration] 版本2: 为 boards 表添加 createdAt 索引（保留数据）')
  //
  //   const oldStoreName = 'boards'
  //   const newStoreName = 'boards_new'
  //
  //   //创建带索引的新表
  //   if (!db.objectStoreNames.contains(newStoreName)) {
  //     const newStore = db.createObjectStore(newStoreName, { keyPath: 'id' })
  //     newStore.createIndex('createdAt', 'createdAt', { unique: false })
  //   }
  //
  //   // 获取旧表数据
  //   const oldStore = db.transaction(oldStoreName, 'readonly').objectStore(oldStoreName)
  //   const newStore = db.transaction(newStoreName, 'readwrite').objectStore(newStoreName)
  //
  //   // 迁移数据（补充默认值）
  //   const request = oldStore.getAll()
  //   request.onsuccess = () => {
  //     const oldData = request.result || []
  //     oldData.forEach(item => {
  //       if (!item.createdAt) {
  //         item.createdAt = Date.now()  // 为旧数据补充默认时间戳
  //       }
  //       newStore.put(item)
  //     })
  //     console.log(`[DB Migration] 迁移了 ${oldData.length} 条数据到 ${newStoreName}`)
  //   }
  //
  //   // 等待迁移完成，删除旧表
  //   await new Promise((resolve) => {
  //     const tx = db.transaction([oldStoreName, newStoreName], 'readwrite')
  //     tx.oncomplete = () => {
  //       db.deleteObjectStore(oldStoreName)
  //       console.log('[DB Migration] 表结构升级完成，旧表已删除')
  //       resolve()
  //     }
  //   })
  //   // 新表名为 boards_new，应用层代码需要适配
  // },
}

// ==================== 辅助函数 ====================
/**
 * 创建表及索引
 * @param {IDBDatabase} db 数据库实例
 * @param {Array} stores 表配置数组
 */
function createStores(db, stores) {
  stores.forEach(store => {
    if (!db.objectStoreNames.contains(store.name)) {
      const storeDef = db.createObjectStore(store.name, {keyPath: store.keyPath})
      // 创建索引
      if (store.indexes && store.indexes.length) {
        store.indexes.forEach(idx => {
          storeDef.createIndex(idx.name, idx.keyPath, idx.options)
        })
      }
      console.log(`[DB Migration] 创建表: ${store.name}`)
    }
  })
}

/**
 * 执行版本迁移
 * @param {IDBDatabase} db 数据库实例
 * @param {number} oldVersion 旧版本号
 * @param {number} newVersion 新版本号
 */
function runMigrations(db, oldVersion, newVersion) {
  console.log(`[DB Migration] 从版本 ${oldVersion} 升级到 ${newVersion}`)

  for (let version = oldVersion + 1; version <= newVersion; version++) {
    const migration = migrations[version]
    if (migration) {
      migration(db)
    } else {
      // console.warn(`[DB Migration] 版本 ${version} 没有定义迁移逻辑`)
    }
  }
}

/**
 * 获取数据库实例
 * @param {number} version 指定数据库版本，默认使用 CURRENT_VERSION
 */
export async function getDB(version = CURRENT_VERSION) {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_SYSTEM_APP, version)

    req.onupgradeneeded = event => {
      const db = req.result
      const oldVersion = event.oldVersion
      // 执行迁移
      runMigrations(db, oldVersion, version)
    }

    req.onsuccess = () => {
      dbInstance = req.result
      console.log('[DB] 数据库连接成功')
      resolve(dbInstance)
    }

    req.onerror = () => {
      console.error('[DB] 数据库连接失败:', req.error)
      reject(req.error)
    }
  })
}

/**
 * 初始化数据库
 * @param {number} version 指定数据库版本
 */
export async function initDatabase(version = CURRENT_VERSION) {
  return getDB(version)
}

// 关闭数据库连接
export function closeDB() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    console.log('[DB] 数据库连接已关闭')
  }
}

// 获取指定表的操作接口
export function getStore(storeName) {
  return {
    // 根据 id 获取单条数据
    async get(id) {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readonly')
        const r = tx.objectStore(storeName).get(id)
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
    },
    // 新增或更新数据
    async put(data) {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).put(data)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    },
    // 获取所有数据
    async getAll() {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).getAll()
        req.onsuccess = () => res(req.result || [])
        req.onerror = () => rej(req.error)
      })
    },
    // 根据 id 删除数据
    async delete(id) {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).delete(id)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    },
    // 清空整个表
    async clear() {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).clear()
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    },
  }
}
