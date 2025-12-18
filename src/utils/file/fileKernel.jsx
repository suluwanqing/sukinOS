import fileIndexDb  from './fileIndexDb';
export const FileType = {
  FILE: 1,
  DIRECTORY: 2
};

// 根节点固定的 ID
const ROOT_INODE_ID = 'root';

class fileKernel {
  constructor() {
    this.driver = new fileIndexDb();
    this.inodeMap = new Map(); // 内存镜像: id -Inode
    this.treeMap = new Map();  // 目录树索引: parentId-Set<childId>
    this.events = new EventTarget(); // 事件总线
    this.ready = false;
  }
  //系统启动：挂载磁盘并构建内存文件分配表
  async boot() {
    try {
      await this.driver.mount();
      const inodes = await this.driver.loadAllInodes();
      // 清空旧缓存
      this.inodeMap.clear();
      this.treeMap.clear();
      if (inodes.length === 0) {
        // 如果是全新磁盘，格式化（创建根目录）
        await this._formatDisk();
      } else {
        // 构建内存索引
        inodes.forEach(node => this._syncMemory(node));
        // 安全检查：确保根节点存在
        if (!this.inodeMap.has(ROOT_INODE_ID)) await this._formatDisk();
      }

      this.ready = true;
      //挂载成功
      return true;
    } catch (e) {
      console.error('文件系统挂载失败!:', e);
      return false;
    }
  }

  //同步节点到内存映射和树状索引
  _syncMemory(inode) {
    this.inodeMap.set(inode.id, inode);
    if (inode.parentId) {
      if (!this.treeMap.has(inode.parentId)) {
        this.treeMap.set(inode.parentId, new Set());
      }
      this.treeMap.get(inode.parentId).add(inode.id);
    }
  }

  //从内存中移除节点
  _removeFromMemory(id) {
    const node = this.inodeMap.get(id);
    if (!node) return;
    // 从父节点的子列表中移除
    if (node.parentId && this.treeMap.has(node.parentId)) {
      this.treeMap.get(node.parentId).delete(id);
    }
    // 移除自己的子节点记录（如果是文件夹）
    this.treeMap.delete(id);
    // 移除自身
    this.inodeMap.delete(id);
  }

  //格式化磁盘，创建根目录
  async _formatDisk() {
    const root = {
      id: ROOT_INODE_ID,
      parentId: null,
      name: 'root',
      type: FileType.DIRECTORY,
      size: 0,
      ctime: Date.now(),
      mtime: Date.now(),
      content: null
    };
    await this.driver.writeInode(root);
    this._syncMemory(root);
  }

  //读取目录内容 (ls / readdir) 目录 inode id
  readdir(id) {
    const childrenIds = this.treeMap.get(id);
    if (!childrenIds) return [];

    return Array.from(childrenIds)
      .map(childId => this.inodeMap.get(childId))
      .filter(Boolean) // 过滤空值
      .sort((a, b) => {
        // 排序规则：文件夹优先，然后按名字字母序
        if (a.type !== b.type) return a.type === FileType.DIRECTORY ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  //创建目录 (mkdir)
  async mkdir(parentId, name) {
    return this._createEntry(parentId, name, FileType.DIRECTORY, null);
  }

  // 写入文件 (touch / write)
  async writeFile(parentId, name, content) {
    return this._createEntry(parentId, name, FileType.FILE, content);
  }

  //读取文件内容 (cat / read)
  async readFile(id) {
    const node = this.inodeMap.get(id);
    if (!node) throw new Error('文件不存在1');
    if (node.type === FileType.DIRECTORY) throw new Error('操作有无');
    // 目前内容直接存储在 inode 中
    return node.content || '';
  }

  //删除文件或目录 (rm -rf),递归删除所有子孙节点
  async unlink(id) {
    if (id === ROOT_INODE_ID) throw new Error('操作非法');
    const target = this.inodeMap.get(id);
    if (!target) return;

    const parentId = target.parentId;

    // 递归收集所有需要删除的 ID
    const batch = [id];
    const collect = (pid) => {
      const kids = this.treeMap.get(pid);
      if (kids) {
        kids.forEach(kidId => {
          batch.push(kidId);
          collect(kidId);
        });
      }
    };
    collect(id);
    // 执行删除 (先删内存，后删磁盘，提升响应感知)
    for (const victimId of batch) {
      this._removeFromMemory(victimId);
      await this.driver.unlinkInode(victimId);
    }

    // 通知视图更新
    this._emitChange(parentId);
  }

  // 重命名 (mv / rename)
  async rename(id, newName) {
    const node = this.inodeMap.get(id);
    if (!node) throw new Error('文件未找到');
    // 检查同一目录下是否有重名
    const siblings = this.readdir(node.parentId);
    if (siblings.some(s => s.name === newName && s.id !== id)) {
      throw new Error('File exists');
    }

    const updates = { ...node, name: newName, mtime: Date.now() };
    await this.driver.writeInode(updates);
    this._syncMemory(updates); // 更新内存
    this._emitChange(node.parentId);
  }

  // 内部核心：创建文件实体
  async _createEntry(parentId, name, type, content) {
    // 检查父目录
    const parent = this.inodeMap.get(parentId);
    if (!parent || parent.type !== FileType.DIRECTORY) {
      throw new Error('非文件夹');
    }
    // 检查重名
    const siblings = this.readdir(parentId);
    if (siblings.some(s => s.name === name)) {
      throw new Error('文件已经存在');
    }
    // 构建 Inode
    const inode = {
      id: crypto.randomUUID(),
      parentId,
      name,
      type,
      size: content ? content.length : 0,
      content, // 简化处理：内容直接存 Inode
      ctime: Date.now(),
      mtime: Date.now()
    };
    // 持久化
    await this.driver.writeInode(inode);
    // 更新内存并通知
    this._syncMemory(inode);
    this._emitChange(parentId);
    return inode;
  }

  //获取文件路径 [面包屑导航]
  getPath(id) {
    const path = [];
    let curr = this.inodeMap.get(id);
    while(curr) {
      path.unshift(curr);
      if (curr.id === ROOT_INODE_ID) break;
      curr = this.inodeMap.get(curr.parentId);
    }
    return path;
  }
  //更新文件内容  文件节点id,新的内容
  async updateContent(id, content) {
    const node = this.inodeMap.get(id);
    if (!node) throw new Error('文件未找到');
    if (node.type === FileType.DIRECTORY) throw new Error('非文件');

    // 更新节点信息
    const updates = {
      ...node,
      content: content,
      size: content.length,
      mtime: Date.now()
    };

    // 写入数据库
    await this.driver.writeInode(updates);

    // 同步内存
    this._syncMemory(updates);

    // 可选：如果需要在列表显示文件大小，这里触发事件
    // this._emitChange(node.parentId);

    return true;
  }

  // 监听文件系统变更
  watch(callback) {
    const handler = (e) => callback(e.detail);
    this.events.addEventListener('change', handler);
    return () => this.events.removeEventListener('change', handler);
  }
  _emitChange(dirId) {
    this.events.dispatchEvent(new CustomEvent('change', { detail: { dirId } }));
  }
}

// 导出单例
export default new fileKernel();
