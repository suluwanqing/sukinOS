import fileIndexDb from './fileIndexDb'
// 根节点固定的 ID
const ROOT_INODE_ID = 'root'
import {FileType} from '@/sukinos/utils/config'
class fileKernel {
  constructor() {
    this.driver = new fileIndexDb()
    this.inodeMap = new Map() // 内存镜像: id -Inode
    this.treeMap = new Map() // 目录树索引: parentId-Set<childId>
    this.events = new EventTarget()
    this.ready = false
  }
  async boot() {
    try {
      await this.driver.mount()
      const inodes = await this.driver.loadAllInodes()
      this.inodeMap.clear()
      this.treeMap.clear()
      if (inodes.length === 0) {
        await this.#formatDisk()
      } else {
        inodes.forEach(node => this.#syncMemory(node))
        // 根目录若在库里丢了要补回来，否则整棵树没有挂载点
        if (!this.inodeMap.has(ROOT_INODE_ID)) await this.#formatDisk()
      }

      this.ready = true
      return true
    } catch (e) {
      console.error('文件系统挂载失败!:', e)
      return false
    }
  }

  #syncMemory(inode) {
    this.inodeMap.set(inode.id, inode)
    if (inode.parentId) {
      if (!this.treeMap.has(inode.parentId)) {
        this.treeMap.set(inode.parentId, new Set())
      }
      this.treeMap.get(inode.parentId).add(inode.id)
    }
  }

  #removeFromMemory(id) {
    const node = this.inodeMap.get(id)
    if (!node) return
    if (node.parentId && this.treeMap.has(node.parentId)) {
      this.treeMap.get(node.parentId).delete(id)
    }
    this.treeMap.delete(id)
    this.inodeMap.delete(id)
  }

  async #formatDisk() {
    const root = {
      id: ROOT_INODE_ID,
      parentId: null,
      name: 'root',
      type: FileType.DIRECTORY,
      size: 0,
      ctime: Date.now(),
      mtime: Date.now(),
      content: null,
    }
    await this.driver.writeInode(root)
    this.#syncMemory(root)
  }

  /** 列目录：文件夹在前，其余按名字字典序 */
  readdir(id) {
    const childrenIds = this.treeMap.get(id)
    if (!childrenIds) return []

    return Array.from(childrenIds)
      .map(childId => this.inodeMap.get(childId))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === FileType.DIRECTORY ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  async mkdir(parentId, name) {
    return this.#createEntry(parentId, name, FileType.DIRECTORY, null)
  }

  async writeFile(parentId, name, content) {
    return this.#createEntry(parentId, name, FileType.FILE, content)
  }

  async readFile(id) {
    const node = this.inodeMap.get(id)
    if (!node) throw new Error('文件不存在1')
    if (node.type === FileType.DIRECTORY) throw new Error('操作有无')
    // 内容就存在 inode 里，没有单独的扇区
    return node.content !== undefined ? node.content : ''
  }

  /** 递归删除该节点及其全部子孙 */
  async unlink(id) {
    if (id === ROOT_INODE_ID) throw new Error('操作非法')
    const target = this.inodeMap.get(id)
    if (!target) return

    const parentId = target.parentId

    const batch = [id]
    const collect = pid => {
      const kids = this.treeMap.get(pid)
      if (kids) {
        kids.forEach(kidId => {
          batch.push(kidId)
          collect(kidId)
        })
      }
    }
    collect(id)
    // 先删内存再删磁盘：界面立刻反映结果，不等 IO
    for (const victimId of batch) {
      this.#removeFromMemory(victimId)
      await this.driver.unlinkInode(victimId)
    }

    this.#emitChange(parentId)
  }

  async rename(id, newName) {
    const node = this.inodeMap.get(id)
    if (!node) throw new Error('文件未找到')
    const siblings = this.readdir(node.parentId)
    if (siblings.some(s => s.name === newName && s.id !== id)) {
      throw new Error('File exists')
    }

    const updates = {...node, name: newName, mtime: Date.now()}
    await this.driver.writeInode(updates)
    this.#syncMemory(updates)
    this.#emitChange(node.parentId)
  }

  /** 移动只换 parentId：子孙按 id 寻址，不需要跟着改 */
  async move(id, targetParentId) {
    const node = this.inodeMap.get(id)
    if (!node) throw new Error('文件未找到')
    const target = this.inodeMap.get(targetParentId)
    if (!target || target.type !== FileType.DIRECTORY) throw new Error('目标非文件夹')
    if (node.parentId === targetParentId) return true
    // 防环：目标不能是自己或自己的子孙
    let curr = target
    while (curr) {
      if (curr.id === id) throw new Error('不能移动到自身内部')
      curr = this.inodeMap.get(curr.parentId)
    }
    const siblings = this.readdir(targetParentId)
    if (siblings.some(s => s.name === node.name && s.id !== id)) {
      throw new Error('文件已经存在')
    }
    const oldParentId = node.parentId
    if (oldParentId && this.treeMap.has(oldParentId)) this.treeMap.get(oldParentId).delete(id)
    const updates = {...node, parentId: targetParentId, mtime: Date.now()}
    await this.driver.writeInode(updates)
    this.#syncMemory(updates)
    this.#emitChange(oldParentId)
    this.#emitChange(targetParentId)
    return true
  }

  async #createEntry(parentId, name, type, content) {
    const parent = this.inodeMap.get(parentId)
    if (!parent || parent.type !== FileType.DIRECTORY) {
      throw new Error('非文件夹')
    }
    const siblings = this.readdir(parentId)
    if (siblings.some(s => s.name === name)) {
      throw new Error('文件已经存在')
    }
    // 兼顾 Blob.size、字符串.length 与 ArrayBuffer.byteLength
    const calcSize = c => {
      if (!c) return 0
      if (c instanceof Blob) return c.size
      if (c instanceof ArrayBuffer) return c.byteLength
      if (typeof c === 'string') return c.length
      return 0
    }

    const inode = {
      id: crypto.randomUUID(),
      parentId,
      name,
      type,
      size: calcSize(content),
      content,
      ctime: Date.now(),
      mtime: Date.now(),
    }
    await this.driver.writeInode(inode)
    this.#syncMemory(inode)
    this.#emitChange(parentId)
    return inode
  }

  /** 回溯到根的节点链，供面包屑导航用 */
  getPath(id) {
    const path = []
    let curr = this.inodeMap.get(id)
    while (curr) {
      path.unshift(curr)
      if (curr.id === ROOT_INODE_ID) break
      curr = this.inodeMap.get(curr.parentId)
    }
    return path
  }
  async updateContent(id, content) {
    const node = this.inodeMap.get(id)
    if (!node) throw new Error('文件未找到')
    if (node.type === FileType.DIRECTORY) throw new Error('非文件')

    const calcSize = c => {
      if (!c) return 0
      if (c instanceof Blob) return c.size
      if (c instanceof ArrayBuffer) return c.byteLength
      if (typeof c === 'string') return c.length
      return 0
    }

    const updates = {
      ...node,
      content: content,
      size: calcSize(content),
      mtime: Date.now(),
    }

    await this.driver.writeInode(updates)

    this.#syncMemory(updates)

    // 故意不发变更事件：正文变化不影响目录列表

    return true
  }

  watch(callback) {
    const handler = e => callback(e.detail)
    this.events.addEventListener('change', handler)
    return () => this.events.removeEventListener('change', handler)
  }
  #emitChange(dirId) {
    this.events.dispatchEvent(new CustomEvent('change', {detail: {dirId}}))
  }
}

// 导出单例
export default new fileKernel()
