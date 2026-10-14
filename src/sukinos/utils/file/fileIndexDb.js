import { DB_VFILE, preSystemFileData, preSystemConfigFiles, FileType, SAMPLE_APP_DIR } from "@/sukinos/utils/config"
import { SAMPLE_APP_FILES } from "@/sukinos/resources/developer/template"
import { alert } from "@/component/alert/layout"

class fileIndexDb {
  constructor() {
    this.db = null
  }

  /** Blob → data URL：与 App 图标的存储格式一致 */
  #blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /** 预设系统资源挂载：清单里缺哪条就 fetch 补哪条 */
  async #initSystemResources() {
    for (const file of preSystemFileData) {
      try {
        const exists = await this.readInode(file.id);
        if (exists) continue;
        console.log(`[VFS] 正在挂载系统资源: ${file.path}`);
        const response = await fetch(file.path);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();
        const base64Data = await this.#blobToDataURL(blob);
        const inode = {
          id: file.id,
          parentId: 'root',
          name: file.path.split('/').pop(),
          type: FileType.FILE,
          size: blob.size,
          content: base64Data,
          ctime: Date.now(),
          mtime: Date.now()
        };

        await this.writeInode(inode);
      } catch (err) {
        console.error(`[VFS] 挂载预设资源失败 (${file.path}):`, err);
      }
    }
  }

  /** 预设配置文件挂载：缺文件时直接写清单里的默认内容，不 fetch */
  async #initSystemConfigFiles() {
    for (const file of preSystemConfigFiles) {
      try {
        const exists = await this.readInode(file.id);
        if (exists) continue;
        const inode = {
          id: file.id,
          parentId: 'root',
          name: file.name,
          type: FileType.FILE,
          size: file.content ? file.content.length : 0,
          content: file.content,
          ctime: Date.now(),
          mtime: Date.now()
        };
        await this.writeInode(inode);
        console.log(`[VFS] 已创建预设配置文件: ${file.name}`);
      } catch (err) {
        console.error(`[VFS] 创建预设配置文件失败 (${file.name}):`, err);
      }
    }
  }

  /**
   * 内置示例应用挂载：根层直接是 layout.jsx / logic.jsx，开发者中心选它一次就能解析入口。
   * 目录与文件都用固定 id，所以只补建缺失项，用户改过的文件不会被覆盖。
   */
  async #initSampleAppFiles() {
    try {
      if (!(await this.readInode(SAMPLE_APP_DIR.id))) {
        await this.#createDirInode(SAMPLE_APP_DIR.id, 'root', SAMPLE_APP_DIR.name)
        console.log(`[VFS] 已创建示例应用目录: ${SAMPLE_APP_DIR.name}`)
      }
    } catch (err) {
      console.error(`[VFS] 创建示例应用目录失败 (${SAMPLE_APP_DIR.name}):`, err)
      return
    }

    for (const file of SAMPLE_APP_FILES) {
      try {
        // 逐级补建子目录；dirId 用父路径串起来，天然带上示例根前缀
        let parentId = SAMPLE_APP_DIR.id
        for (const segment of file.dirs) {
          const dirId = `${parentId}/${segment}`
          if (!(await this.readInode(dirId))) await this.#createDirInode(dirId, parentId, segment)
          parentId = dirId
        }

        if (await this.readInode(file.id)) continue
        await this.writeInode({
          id: file.id,
          parentId,
          name: file.name,
          type: FileType.FILE,
          size: file.content.length,
          content: file.content,
          ctime: Date.now(),
          mtime: Date.now()
        })
      } catch (err) {
        // 撞 (parentId, name) 唯一索引时只跳过这一条
        console.error(`[VFS] 挂载示例文件失败 (${file.id}):`, err)
      }
    }
    console.log(`[VFS] 内置示例应用已挂载: ${SAMPLE_APP_FILES.length} 个文件`)
  }

  async #createDirInode(id, parentId, name) {
    await this.writeInode({
      id,
      parentId,
      name,
      type: FileType.DIRECTORY,
      size: 0,
      content: null,
      ctime: Date.now(),
      mtime: Date.now()
    })
  }

  /** 挂载虚拟磁盘：ObjectStore 与索引按 DB_VFILE 自动补建 */
  mount() {
    if (this.db && !this.db.closed) return Promise.resolve(true)
    this.db = null

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_VFILE.DB_NAME, DB_VFILE.VERSION)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        const tx = event.target.transaction
        let store

        if (!db.objectStoreNames.contains(DB_VFILE.STORE_NAME)) {
          console.log(`文件数据库创建成功: ${DB_VFILE.STORE_NAME}`)
          store = db.createObjectStore(DB_VFILE.STORE_NAME, { keyPath: DB_VFILE.KEY_PATH })
        } else {
          store = tx.objectStore(DB_VFILE.STORE_NAME)
        }

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
        this.db.onclose = () => { this.db = null }
        this.db.onversionchange = () => { this.db.close(); this.db = null }

        await this.#initSystemResources();
        await this.#initSystemConfigFiles();
        await this.#initSampleAppFiles();

        resolve(true)
      }

      request.onerror = (event) => {
        console.error('文件系统挂载失败:', event.target.error)
        reject(event.target.error)
      }
    })
  }

  #tx(mode) {
    if (!this.db) throw new Error('未挂载!')
    return this.db.transaction([DB_VFILE.STORE_NAME], mode).objectStore(DB_VFILE.STORE_NAME)
  }

  async writeInode(inode) {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readwrite').put(inode)
      req.onsuccess = () => resolve(inode[DB_VFILE.KEY_PATH])
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async readInode(id) {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readonly').get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async unlinkInode(id) {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readwrite').delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  async count() {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readonly').count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    })
  }

  /** 目录下是否已有同名条目：走复合索引 parent_name_idx 的 getKey，不读整条记录 */
  async exists(parentId, name) {
    return new Promise((resolve, reject) => {
      try {
        const store = this.#tx('readonly')
        const indexName = 'parent_name_idx'

        if (!store.indexNames.contains(indexName)) {
           reject(new Error(`丢失索引: ${indexName}`))
           return
        }

        const index = store.index(indexName)
        const req = index.getKey([parentId, name])

        req.onsuccess = () => {
          resolve(!!req.result)
        }
        req.onerror = (e) => reject(e.target.error)
      } catch (e) {
        reject(e)
      }
    })
  }

  /** 全量读扁平 inode；文件树由 Kernel 在内存里拼 */
  async loadAllInodes() {
    return new Promise((resolve, reject) => {
      const req = this.#tx('readonly').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = (e) => reject(e.target.error)
    })
  }
}

export default fileIndexDb
