import {DB_SYSTEM_APP} from '@/sukinos/utils/config'

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
  // 表名统一带 sys- 前缀：本库（sukin_system_app）与按用户隔离的 SukinOS_Sys_* / SukinOS_Res_* 库分开
}

const CURRENT_VERSION = 1

let dbInstance = null

// 改表结构（增删表、加索引）就要 +1 CURRENT_VERSION，并在 migrations 里补一个同号函数：
// 迁移按版本号逐格升级，只在新版本首次 open 时执行，数据保留。
const migrations = {
  1: db => {
    createStores(db, [STORES.BOARDS, STORES.MINDMAPS, STORES.SHEET])
  },

  // 以下为升级范例：按需取消注释，同时把 CURRENT_VERSION 与 STORES 配置改到对应版本。

  // 添加新表
  // 2: (db) => {
  //   if (!db.objectStoreNames.contains('settings')) {
  //     db.createObjectStore('settings', { keyPath: 'key' })
  //   }
  // },

  // 添加索引（丢数据）：删表重建，原数据清空
  // 2: (db) => {
  //   if (db.objectStoreNames.contains('boards')) {
  //     db.deleteObjectStore('boards')
  //   }
  //   const store = db.createObjectStore('boards', { keyPath: 'id' })
  //   store.createIndex('createdAt', 'createdAt', { unique: false })
  // },

  // 添加索引（保数据）：建带索引的新表、搬完再删旧表；表名变成 boards_new，应用层要同时读新旧名
  // 2: async (db) => {
  //   const oldStoreName = 'boards'
  //   const newStoreName = 'boards_new'
  //
  //   if (!db.objectStoreNames.contains(newStoreName)) {
  //     const newStore = db.createObjectStore(newStoreName, { keyPath: 'id' })
  //     newStore.createIndex('createdAt', 'createdAt', { unique: false })
  //   }
  //
  //   const oldStore = db.transaction(oldStoreName, 'readonly').objectStore(oldStoreName)
  //   const newStore = db.transaction(newStoreName, 'readwrite').objectStore(newStoreName)
  //
  //   const request = oldStore.getAll()
  //   request.onsuccess = () => {
  //     const oldData = request.result || []
  //     oldData.forEach(item => {
  //       if (!item.createdAt) {
  //         item.createdAt = Date.now()  // 为旧数据补充默认时间戳
  //       }
  //       newStore.put(item)
  //     })
  //   }
  //
  //   await new Promise((resolve) => {
  //     const tx = db.transaction([oldStoreName, newStoreName], 'readwrite')
  //     tx.oncomplete = () => {
  //       db.deleteObjectStore(oldStoreName)
  //       resolve()
  //     }
  //   })
  // },
}

/** 建表并顺带建 STORES 里声明的索引 */
function createStores(db, stores) {
  stores.forEach(store => {
    if (!db.objectStoreNames.contains(store.name)) {
      const storeDef = db.createObjectStore(store.name, {keyPath: store.keyPath})
      if (store.indexes && store.indexes.length) {
        store.indexes.forEach(idx => {
          storeDef.createIndex(idx.name, idx.keyPath, idx.options)
        })
      }
      console.log(`[DB Migration] 创建表: ${store.name}`)
    }
  })
}

/** 从 oldVersion 起逐版本执行 migrations，缺号的版本只跳版本号不做改动 */
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

/** 打开并缓存单例；version 默认 CURRENT_VERSION */
export async function getDB(version = CURRENT_VERSION) {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_SYSTEM_APP, version)

    req.onupgradeneeded = event => {
      const db = req.result
      const oldVersion = event.oldVersion
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

/** getDB 的别名入口 */
export async function initDatabase(version = CURRENT_VERSION) {
  return getDB(version)
}

export function closeDB() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    console.log('[DB] 数据库连接已关闭')
  }
}

/** 按表名包一层 get/put/getAll/delete/clear 的 Promise 接口 */
export function getStore(storeName) {
  return {
    async get(id) {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readonly')
        const r = tx.objectStore(storeName).get(id)
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
    },
    async put(data) {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).put(data)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    },
    async getAll() {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).getAll()
        req.onsuccess = () => res(req.result || [])
        req.onerror = () => rej(req.error)
      })
    },
    async delete(id) {
      const db = await getDB()
      return new Promise((res, rej) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.objectStore(storeName).delete(id)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    },
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
