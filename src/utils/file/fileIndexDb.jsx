import { FS_CONFIG } from "@/utils/config";
import { alert } from "@/component/alert/layout"
class fileIndexDb {
  constructor() {
    this.db = null; // IDBDatabase 实例
  }
  /**
   * 挂载磁盘
   * 会根据 FS_CONFIG 自动校验并创建 ObjectStore 和索引
   */
  mount() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(FS_CONFIG.DB_NAME, FS_CONFIG.VERSION);
      // 数据库升级/初始化事件
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const tx = event.target.transaction;
        let store;

        // 创建或获取 ObjectStore
        if (!db.objectStoreNames.contains(FS_CONFIG.STORE_NAME)) {
          console.log(`文件数据库创建失败: ${FS_CONFIG.STORE_NAME}`);
          store = db.createObjectStore(FS_CONFIG.STORE_NAME, { keyPath: FS_CONFIG.KEY_PATH });
        } else {
          store = tx.objectStore(FS_CONFIG.STORE_NAME);
        }

        // 动态创建/更新索引
        // 遍历配置文件中的 INDEXES 数组
        if (FS_CONFIG.INDEXES && Array.isArray(FS_CONFIG.INDEXES)) {
          FS_CONFIG.INDEXES.forEach((idxConfig) => {
            if (!store.indexNames.contains(idxConfig.name)) {
              store.createIndex(idxConfig.name, idxConfig.keyPath, idxConfig.options);
            }
          });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(true);
      };

      request.onerror = (event) => {
        console.error('文件系统挂载失败:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * 内部事务辅助函数'readonly' 或 'readwrite'
   */
  _tx(mode) {
    if (!this.db) throw new Error('未挂载!');
    return this.db.transaction([FS_CONFIG.STORE_NAME], mode).objectStore(FS_CONFIG.STORE_NAME);
  }

  /**
   * 写入或更新节点 文件节点对象
   */
  async writeInode(inode) {
    return new Promise((resolve, reject) => {
      const req = this._tx('readwrite').put(inode);
      req.onsuccess = () => resolve(inode[FS_CONFIG.KEY_PATH]); // 返回 id
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 读取节点 节点ID
   */
  async readInode(id) {
    return new Promise((resolve, reject) => {
      const req = this._tx('readonly').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 删除节点 节点ID
   */
  async unlinkInode(id) {
    return new Promise((resolve, reject) => {
      const req = this._tx('readwrite').delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 获取当前存储的文件总数
   */
  async count() {
    return new Promise((resolve, reject) => {
      const req = this._tx('readonly').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
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
        const store = this._tx('readonly');
        // 查找配置中用于检查唯一性的索引 (通常是复合索引)
        // 这里假设配置中有名为 'parent_name_idx' 的索引，或者我们根据 keyPath 查找
        const indexName = 'parent_name_idx';

        if (!store.indexNames.contains(indexName)) {
           // 如果找不到特定索引，降级逻辑：可以报错，或者遍历查找（这里选择报错提示开发检查配置）
           // 降级：不使用索引，直接 resolve false (存在风险) 或者 reject
           reject(new Error(`丢失索引: ${indexName}`));
           return;
        }

        const index = store.index(indexName);
        // getKey 不需要读取整个对象，性能更高
        const req = index.getKey([parentId, name]);

        req.onsuccess = () => {
          // 如果 result 有值，说明找到了 key，即文件存在
          resolve(!!req.result);
        };
        req.onerror = (e) => reject(e.target.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 读取所有扇区数据
   * Kernel 层会调用此方法获取所有扁平数据，然后在内存中构建 File Tree
   */
  async loadAllInodes() {
    return new Promise((resolve, reject) => {
      const req = this._tx('readonly').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

export default fileIndexDb;
