import { DB_VFILE, preSystemFileData, FileType } from "@/sukinos/utils/config"
import { alert } from "@/component/alert/layout"

class fileIndexDb {
  constructor() {
    this.db = null // IDBDatabase 实例
  }

  /**
   * 辅助函数：将 Blob 转为 DataURL (Base64)
   * 保持与 CustomApp 中的存储格式一致
   */
  #blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 自动挂载预设系统资源
   * 检查 preSystemFileData 中的文件，若不存在则 fetch 并写入
   */
  async #initSystemResources() {
    for (const file of preSystemFileData) {
      try {
        // 检查是否已经存在，避免重复 fetch
        const exists = await this.readInode(file.id);
        if (exists) continue;
        console.log(`[VFS] 正在挂载系统资源: ${file.path}`);
        // 请求网络资源 (public 目录下)
        const response = await fetch(file.path);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();
        const base64Data = await this.#blobToDataURL(blob);
        // 注意：这里 parentId 设为 'root'，确保在根目录显示
        const inode = {
          id: file.id,
          parentId: 'root',
          name: file.path.split('/').pop(), // 从路径截取文件名
          type: FileType.FILE,
          size: blob.size,
          content: base64Data,
          ctime: Date.now(),
          mtime: Date.now()
        };

        // 4. 写入数据库
        await this.writeInode(inode);
      } catch (err) {
        console.error(`[VFS] 挂载预设资源失败 (${file.path}):`, err);
      }
    }
  }

  /**
   * 挂载虚拟磁盘
   * 会根据 DB_VFILE 自动校验并创建 ObjectStore 和索引
   */
  mount() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_VFILE.DB_NAME, DB_VFILE.VERSION)
      // 数据库升级/初始化事件
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        const tx = event.target.transaction
        let store

        // 创建或获取 ObjectStore
        if (!db.objectStoreNames.contains(DB_VFILE.STORE_NAME)) {
          console.log(`文件数据库创建成功: ${DB_VFILE.STORE_NAME}`) // 此处通常为创建成功日志
          store = db.createObjectStore(DB_VFILE.STORE_NAME, { keyPath: DB_VFILE.KEY_PATH })
        } else {
          store = tx.objectStore(DB_VFILE.STORE_NAME)
        }

        // 动态创建/更新索引
        // 遍历配置文件中的 INDEXES 数组
        if (DB_VFILE.INDEXES && Array.isArray(DB_VFILE.INDEXES)) {
          DB_VFILE.INDEXES.forEach((idxConfig) => {
            if (!store.indexNames.contains(idxConfig.name)) {
              store.createIndex(idxConfig.name, idxConfig.keyPath, idxConfig.options)
            }
          })
        }
      }

      request.onsuccess = async (event) => {
        this.db = event.target.result

        // ---在挂载成功后，初始化系统预设文件 ---
        await this.#initSystemResources();

        resolve(true)
      }

      request.onerror = (event) => {
        console.error('文件系统挂载失败:', event.target.error)
        reject(event.target.error)
      }
    })
  }

  /**
   * 内部事务辅助函数'readonly' 或 'readwrite'
   */
  #tx(mode) {
    if (!this.db) throw new Error('未挂载!')
    return this.db.transaction([DB_VFILE.STORE_NAME], mode).objectStore(DB_VFILE.STORE_NAME)
  }

  /**
   * 写入或更新节点 文件节点对象
   */
  async writeInode(inode) {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readwrite').put(inode)
      req.onsuccess = () => resolve(inode[DB_VFILE.KEY_PATH]) // 返回 id
      req.onerror = (e) => reject(e.target.error)
    })
  }

  /**
   * 读取节点 节点ID
   */
  async readInode(id) {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readonly').get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  /**
   * 删除节点 节点ID
   */
  async unlinkInode(id) {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readwrite').delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  /**
   * 获取当前存储的文件总数
   */
  async count() {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readonly').count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  /**
   * 判断指定目录下是否存在同名文件
   * 利用配置中的复合索引 'parent_name_idx' 进行快速查找
  parentId 父目录ID
  name 文件名
   */
  async exists(parentId, name) {
    return new Promise((resolve, reject) => {
      try {
        const store = this.#tx('readonly')
        // 查找配置中用于检查唯一性的索引 (通常是复合索引)
        // 这里假设配置中有名为 'parent_name_idx' 的索引，或者我们根据 keyPath 查找
        const indexName = 'parent_name_idx'

        if (!store.indexNames.contains(indexName)) {
           // 如果找不到特定索引，降级逻辑：可以报错，或者遍历查找（这里选择报错提示开发检查配置）
           reject(new Error(`丢失索引: ${indexName}`))
           return
        }

        const index = store.index(indexName)
        // getKey 不需要读取整个对象，性能更高
        const req = index.getKey([parentId, name])

        req.onsuccess = () => {
          // 如果 result 有值，说明找到了 key，即文件存在
          resolve(!!req.result)
        }
        req.onerror = (e) => reject(e.target.error)
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * 读取所有扇区数据
   * Kernel 层会调用此方法获取所有扁平数据，然后在内存中构建 File Tree
   */
  async loadAllInodes() {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readonly').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = (e) => reject(e.target.error)
    })
  }
}

export default fileIndexDb
