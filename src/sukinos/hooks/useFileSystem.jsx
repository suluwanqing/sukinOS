import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import fs from '@/sukinos/utils/file/fileKernel'
import { FileType } from "@/sukinos/utils/config"
import { alert } from "@/component/alert/layout"
import useStateHandle from "@/sukinos/hooks/useStateHandle"
import { generateShortId } from "/utils/js/rootSeed"
import { formatTimeSlash} from "@/sukinos/utils/date"
import { dataToBase64Mapper, dataDeBase64Mapper } from "/utils/js/func/data/exChangeBase64"

// 全局 ID 映射，防止 React 渲染周期内 ID 变更
const globalFileIdMap = new Map()
// 全局句柄注册表，确保跨组件能通过 ID 找回原始物理句柄
const globalHandleRegistry = new Map()
// 全局订阅监听器，用于同步不同组件间的钩子状态更新
const listeners = new Set();
const notifyAll = (event) => listeners.forEach(fn => fn(event));

// 推断文件映射类型，供 dataToBase64Mapper 使用
const getMapperTypeFromFile = (file) => {
  const name = file.name ? file.name.toLowerCase() : '';
  const type = file.type ? file.type.toLowerCase() : '';

  // 多媒体文件
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Audio';

  // 明确的代码与结构化纯文本
  if (type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) return 'Html';
  if (name.endsWith('.json')) return 'Json';
  if (name.endsWith('.txt') || name.endsWith('.log') || name.endsWith('.csv') || name.endsWith('.xml')) return 'Txt';

  // PDF、Word(docx)、Excel(xlsx)、PPT、ZIP 等复杂格式必须作为 Binary 纯二进制对待，坚决禁止当 Txt 读成乱码！
  return 'Binary';
}

/** 先剥掉沙箱外壳取最底层 ArrayBuffer：iframe 里 file instanceof File 为 false，直接喂给 dataToBase64Mapper 会读空 */
const extractSafeBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // 这里拿到的是底层的 ArrayBuffer
    reader.onerror = () => reject(new Error("提取文件二进制流失败"));
    reader.readAsArrayBuffer(file);
  });
}

// 核心文件系统处理逻辑（基础 Hook）
const useBaseFileSystem = (mode = 'virtual', options = {}) => {
  // pid 是可选的，系统级 Hook 不会传入它
  const pid = options.pid;

  const [currentId, setCurrentId] = useState('root')
  const [items, setItems] = useState([])
  const [history, setHistory] = useState(['root'])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [isReady, setIsReady] = useState(false)

  // 增加引用，用于追踪是否已经完成过Root的初始化加载
  const rootMountedRef = useRef(false)

  // 使用 Ref 缓存外部配置选项（包括匿名函数），彻底阻断 Effect 的重复注册与重渲染循环
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // 为了防止异步操作（如 handleCreate）和全局订阅拿到旧的 items 或 id，使用 Ref 实时追踪
  const stateRef = useRef({ currentId, items, history });
  useEffect(() => {
    stateRef.current = { currentId, items, history };
  }, [currentId, items, history]);

  const {
    stateInstance,
    systemDirHandle,
    getSystemDirHandleInstance,
    initialize,
  } = useStateHandle()

  // 将 stateInstance 存入 Ref，防止其频繁变动导致 transformLocalHandle 刷新
  const stateInstanceRef = useRef(stateInstance);
  useEffect(() => { stateInstanceRef.current = stateInstance; }, [stateInstance]);

  const transformLocalHandle = useCallback(async (handle, parentId) => {
    const isDir = handle.kind === 'directory'
    const type = isDir ? FileType.DIRECTORY : FileType.FILE
    // 若存在 pid 则加入 key 隔离，否则使用原有的隔离 Key
    const uniqueKey = pid ? `${mode}:${pid}:${parentId}:${handle.name}` : `${mode}:${parentId}:${handle.name}`
    let fileId = globalFileIdMap.get(uniqueKey)
    if (!fileId) {
      fileId = pid ? `${pid}-${generateShortId()}` : generateShortId()
      globalFileIdMap.set(uniqueKey, fileId)
    }
    const item = {
      id: fileId,
      parentId: parentId,
      name: handle.name,
      type: type,
      size: 0,
      content: null,
      ctime: null,
      mtime: null,
      handle: handle
    }
    try {
      if (!isDir) {
        const file = await handle.getFile()
        item.size = file.size
        item.mtime = file.lastModified
        item.ctime = file.lastModified
      } else {
        item.mtime = '--'
      }
      if (stateInstanceRef.current?.putData) {
         await stateInstanceRef.current.putData(item)
      }
    } catch (error) {}

    globalHandleRegistry.set(item.id, {
      handle: handle,
      parentId: parentId,
      name: handle.name
    })

    return item
  }, [mode, pid]);

  const getLocalBreadcrumbs = useCallback((targetId) => {
    const path = []
    let curr = targetId
    let safety = 0
    while (curr && curr !== 'root' && safety < 100) {
      const node = globalHandleRegistry.get(curr)
      if (!node) break
      path.unshift({ id: curr, name: node.name })
      curr = node.parentId
      safety++
    }
    path.unshift({ id: 'root', name: 'root' })
    return path
  }, []);

  const loadDir = useCallback(async (id, pushHistory = true) => {
    try {
      let list = []
      let path = []
      switch (mode) {
        case 'remote':
          break
        case 'local':
          let rootHandle = systemDirHandle
          if (!rootHandle && id === 'root') {
            try { rootHandle = await getSystemDirHandleInstance() } catch (err) {}
          }
          if (!rootHandle) {
            setItems([]); setBreadcrumbs([{ id: 'root', name: '未挂载' }]); return;
          }

          let targetHandle
          if (id === 'root') {
            targetHandle = rootHandle
            globalHandleRegistry.set('root', { handle: rootHandle, parentId: null, name: rootHandle.name })
          } else {
            const record = globalHandleRegistry.get(id)
            if (!record || !record.handle) return loadDir('root', false)
            targetHandle = record.handle
          }

          const localItems = []
          for await (const entry of targetHandle.values()) {
            localItems.push(await transformLocalHandle(entry, id))
          }
          list = localItems
          path = getLocalBreadcrumbs(id)
          break
        case 'virtual':
        default:
          list = fs.readdir(id)
          path = fs.getPath(id)
          break
      }

      // 避免无意义的磁盘扫描重新激活渲染
      setItems(prevItems => {
        if (prevItems.length === list.length) {
          const isIdentical = prevItems.every((item, index) => {
            const target = list[index];
            return target &&
                   item.id === target.id &&
                   item.name === target.name &&
                   item.type === target.type;
          });
          if (isIdentical) {
            return prevItems;
          }
        }
        return list;
      });

      setBreadcrumbs(prevPath => {
        if (prevPath.length === path.length) {
          const isIdentical = prevPath.every((item, index) => {
            const target = path[index];
            return target && item.id === target.id && item.name === target.name;
          });
          if (isIdentical) {
             return prevPath;
          }
        }
        return path;
      });

      setCurrentId(id);
      if (pushHistory) setHistory(prev => (prev[prev.length - 1] !== id ? [...prev, id] : prev));
    } catch (e) {
    }
  }, [mode, systemDirHandle, getSystemDirHandleInstance, transformLocalHandle, getLocalBreadcrumbs]);

  // 用于在全局监听器中调用 loadDir 而不触发依赖循环
  const loadDirRef = useRef(loadDir);
  useEffect(() => { loadDirRef.current = loadDir; }, [loadDir]);

  useEffect(() => {
    const bootFS = async () => {
      setIsReady(false); rootMountedRef.current = false;
      setItems([]); setBreadcrumbs([]); setHistory(['root']); setCurrentId('root');
      try {
        if (mode === 'virtual') {
          const ok = await fs.boot(); if (!ok) throw new Error("VFS挂载失败");
        } else {
          await initialize();
        }
        await loadDir('root'); rootMountedRef.current = true; setIsReady(true);
      } catch (e) { console.error(e) }
    }
    bootFS()
  }, [mode]);

// 全局跨实例同步广播的监听器；外部钩子链在这里生效
  useEffect(() => {
    const handleUpdate = (event) => {
        const currentOpts = optionsRef.current || {};

        if (currentOpts.onEvent) {
          currentOpts.onEvent(event);
        }

        if (currentOpts.shouldUpdate) {
          if (!currentOpts.shouldUpdate(event)) return;
        } else {
          // 默认过滤拦截：保存事件（save）默认不引起状态的刷新，除非在 options 中显式声明 watchTypes
          const allowedTypes = currentOpts.watchTypes || ['structure'];
          if (event && event.type && !allowedTypes.includes(event.type)) {
            return;
          }
        }

        loadDirRef.current(stateRef.current.currentId, false);
    };
    listeners.add(handleUpdate);
    return () => listeners.delete(handleUpdate);
  }, []); // 依赖项必须为空，彻底断开渲染死循环

  useEffect(() => {
    if (mode === 'local' && systemDirHandle && !rootMountedRef.current) {
        loadDir('root', false).then(() => { rootMountedRef.current = true; setIsReady(true); })
    }
  }, [systemDirHandle, mode, loadDir])

  // Virtual 模式监听
  useEffect(() => {
    if (!isReady || mode !== 'virtual') return
    const unsub = fs.watch((detail) => {
      const currentOpts = optionsRef.current || {};

      if (currentOpts.onEvent) {
        currentOpts.onEvent(detail);
      }

      if (currentOpts.shouldUpdate) {
        if (!currentOpts.shouldUpdate(detail)) return;
      } else {
        const allowedTypes = currentOpts.watchTypes || ['structure'];
        if (detail && detail.type && !allowedTypes.includes(detail.type)) {
          return;
        }
      }

      loadDir(currentId, false);
    })
    return () => unsub()
  }, [isReady, currentId, mode, loadDir])

  const wrapNotify = (actionType, fn) => async (...args) => {
     const res = await fn(...args);
     if (res) notifyAll({ type: actionType, payload: args[0] });
     return res;
  };

  const handleBack = useCallback(() => {
    const { history } = stateRef.current;
    if (history.length <= 1) return
    const newHistory = [...history]; newHistory.pop();
    const prevId = newHistory[newHistory.length - 1];
    setHistory(newHistory); loadDir(prevId, false);
  }, [loadDir])

  const handleRefresh = useCallback(() => loadDir(currentId, false), [currentId, loadDir])

  // 整理操作函数，通过 useMemo 保证引用稳定，通过 stateRef 保证数据最新
  const operation = useMemo(() => ({
    // 只读列目录,不触发广播：[统一 virtual/local 差异，供递归遍历使用]
    handleReadDir: async (dirId) => {
      if (mode === 'virtual') return fs.readdir(dirId);
      const record = globalHandleRegistry.get(dirId);
      if (!record?.handle) return [];
      const items = [];
      for await (const entry of record.handle.values()) {
        items.push(await transformLocalHandle(entry, dirId));
      }
      return items;
    },
    // 确保目录存在：存在则返回既有项，不存在则创建[virtual/local 统一]
    handleEnsureDir: wrapNotify('structure', async ({ parentId, name }) => {
      try {
        if (mode === 'virtual') {
          const found = fs.readdir(parentId).find(c => c.type === FileType.DIRECTORY && c.name === name);
          return found || await fs.mkdir(parentId, name);
        }
        const parentHandle = globalHandleRegistry.get(parentId)?.handle;
        if (!parentHandle) throw new Error('父目录句柄不存在');
        const subHandle = await parentHandle.getDirectoryHandle(name, { create: true });
        return await transformLocalHandle(subHandle, parentId);
      } catch (err) {
        console.error("确保目录失败：", err);
        return null;
      }
    }),
    // 直接提取底层 readdir 分配表数据，实现同名自增（无后缀），规避重名碰撞造成的崩溃
    handleCreate: wrapNotify('structure', async ({type}) => {
      try {
        const { currentId, items } = stateRef.current;
        const baseName = type === FileType.DIRECTORY ? '新建文件夹' : '新建文件.jsx';
        let name = baseName;
        let counter = 1;

        const realSiblings = mode === 'virtual' ? fs.readdir(currentId) : items;

        while (realSiblings.some(i => i.name === name)) {
          if (type === FileType.DIRECTORY) {
            name = `${baseName} (${counter++})`; // 文件夹不带 .jsx 尾缀
          } else {
            name = `${baseName.replace('.jsx','')} (${counter++}).jsx`;
          }
        }

        if (mode === 'virtual') return type === FileType.DIRECTORY ? fs.mkdir(currentId, name) : fs.writeFile(currentId, name, '');
        const parent = globalHandleRegistry.get(currentId)?.handle;
        if (!parent) return null;
        await (type === FileType.DIRECTORY ? parent.getDirectoryHandle(name, {create:true}) : parent.getFileHandle(name, {create:true}));
        return { id: pid ? `${pid}-${generateShortId()}` : generateShortId(), name };
      } catch (err) {
        console.error("创建失败：", err);
        alert.failure("新建失败，文件系统发生冲突");
        return null;
      }
    }),
    handleRename: wrapNotify('structure', async({id, name, newName, parentId, type}) => {
      try {
        if (!id || !newName.trim()) return false;
        if (mode === 'virtual') {
          // 物理防重命名重名碰撞
          const siblings = fs.readdir(parentId);
          if (siblings.some(s => s.name === newName && s.id !== id)) {
             alert.warning("已存在同名项目");
             return false;
          }
          await fs.rename(id, newName);
        } else {
            const parent = globalHandleRegistry.get(parentId)?.handle
            const target = type === FileType.DIRECTORY ? await parent.getDirectoryHandle(name) : await parent.getFileHandle(name)
            if (target.move) await target.move(newName);
            else {
                const fileData = await target.getFile(); const newFile = await parent.getFileHandle(newName, {create:true});
                const writable = await newFile.createWritable(); await writable.write(fileData); await writable.close();
                await parent.removeEntry(name);
            }
            const uniqueKeyToDelete = pid ? `${mode}:${pid}:${parentId}:${name}` : `${mode}:${parentId}:${name}`
            globalFileIdMap.delete(uniqueKeyToDelete); globalHandleRegistry.delete(id);
        }
        return true;
      } catch (err) {
         console.error("重命名失败：", err);
         alert.failure("重命名失败");
         return false;
      }
    }),
    // 跨目录移动[virtual/local 统一]
    handleMove: wrapNotify('structure', async ({id, name, parentId, targetParentId, type}) => {
      try {
        if (!id || !targetParentId) return false;
        if (parentId === targetParentId) return true;
        if (mode === 'virtual') {
          await fs.move(id, targetParentId);
        } else {
          const targetRecord = globalHandleRegistry.get(id);
          const destHandle = globalHandleRegistry.get(targetParentId)?.handle;
          if (!targetRecord?.handle || !destHandle) throw new Error('句柄缺失');
          const target = targetRecord.handle;
          if (target.move) {
            await target.move(destHandle);
          } else if (type !== FileType.DIRECTORY) {
            const fileData = await target.getFile();
            const newFile = await destHandle.getFileHandle(name, { create: true });
            const writable = await newFile.createWritable();
            await writable.write(fileData); await writable.close();
            await globalHandleRegistry.get(parentId)?.handle?.removeEntry(name);
          } else {
            throw new Error('当前浏览器不支持移动文件夹');
          }
          // 清理旧映射，新位置由 handleReadDir 幂等重新注册
          const uniqueKeyToDelete = pid ? `${mode}:${pid}:${parentId}:${name}` : `${mode}:${parentId}:${name}`
          globalFileIdMap.delete(uniqueKeyToDelete); globalHandleRegistry.delete(id);
        }
        return true;
      } catch (err) {
         console.error("移动失败：", err);
         alert.failure(err?.message === '文件已经存在' ? '目标位置已存在同名项目' : '移动失败');
         return false;
      }
    }),
    handleDelete: wrapNotify('structure', async ({id, name, parentId}) => {
      try {
        if (mode === 'virtual') await fs.unlink(id);
        else {
            const parent = globalHandleRegistry.get(parentId)?.handle
            if (parent) await parent.removeEntry(name, { recursive: true });
            const uniqueKeyToDelete = pid ? `${mode}:${pid}:${parentId}:${name}` : `${mode}:${parentId}:${name}`
            globalHandleRegistry.delete(id); globalFileIdMap.delete(uniqueKeyToDelete);
        }
        return true;
      } catch (err) {
         console.error("删除失败：", err);
         alert.failure("删除失败");
         return false;
      }
    }),
    handleOpenFile: async (item) => {
      try {
        let content;
        if (mode === 'virtual') {
          content = await fs.readFile(item.id);
        } else {
          const record = globalHandleRegistry.get(item.id);
          content = await (record?.handle || item.handle).getFile();
        }
        return { ...item, content };
      } catch (e) { return null }
    },
    handleExportFile: async (item) => {
      try {
        if (item.type === FileType.DIRECTORY) {
          alert.warning("不支持导出文件夹");
          return false;
        }

        let fileData;
        if (mode === 'virtual') {
          fileData = await fs.readFile(item.id);
        } else {
          const record = globalHandleRegistry.get(item.id);
          fileData = await (record?.handle || item.handle).getFile();
        }

        if (fileData === undefined || fileData === null) {
          alert.failure("文件无内容");
          return false;
        }

        // 支持原生 Blob、对象及字符串导出，彻底避开 Base64 二次转码损毁
        let blob;
        if (fileData instanceof Blob) {
          blob = fileData;
        } else if (fileData instanceof ArrayBuffer) {
          blob = new Blob([fileData]);
        } else if (typeof fileData === 'object') {
          blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
        } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
          // 兼容历史存入的 DataURL 字符串导出
          const parts = fileData.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
          const bin = atob(parts[1].replace(/\s/g, ''));
          const u8 = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          blob = new Blob([u8], { type: mime });
        } else {
          blob = new Blob([String(fileData)], { type: 'text/plain;charset=utf-8' });
        }

        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = item.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return true;
        }
      } catch (err) {
        console.error("文件导出发生错误: ", err);
        alert.failure("文件导出失败");
      }
      return false;
    },
    //跳过创建临时空文件，直接生成真实文件名+内容，避开时序重名碰撞
    handleSave: wrapNotify('save', async ({ id, content, parentId, name }) => {
      try {
        if (mode === 'virtual') {
            let targetId = id;
            if (!targetId) {
               const siblings = fs.readdir(parentId);
               const existing = siblings.find(s => s.name === name);
               if (existing) targetId = existing.id;
            }

            if (targetId) {
               await fs.updateContent(targetId, content);
            } else {
               await fs.writeFile(parentId, name, content);
            }
        } else {
            const record = globalHandleRegistry.get(id);
            const handle = record?.handle || await globalHandleRegistry.get(parentId)?.handle.getFileHandle(name, {create:true});
            const writable = await handle.createWritable(); await writable.write(content); await writable.close();
        }
        return true;
      } catch (err) {
         console.error("保存失败：", err);
         alert.failure("保存文件失败");
         return false;
      }
    }),
    handleUploadFiles: wrapNotify('structure', async (files) => {
      const { currentId } = stateRef.current;
      if (mode !== 'virtual') return alert.warning("仅虚拟盘支持");
      for (const file of Array.from(files)) {
        const mapperType = getMapperTypeFromFile(file);
        //调用 mapper 规范化为原生 Blob 或文本写入虚拟盘
        const content = await dataToBase64Mapper(file, mapperType);
        await fs.writeFile(currentId, file.name, content);
      }
      return true;
    }),
    // 清除特定 pid 的所有文件/指定文件后缀的钩子函数
    handleClearFiles: wrapNotify('structure', async (suffix) => {
      try {
        if (mode === 'virtual') {
          const recursiveDeleteVirtual = async (dirId) => {
            const list = await fs.readdir(dirId);
            for (const item of list) {
              if (item.type === FileType.DIRECTORY) {
                await recursiveDeleteVirtual(item.id);
              } else {
                const matchSuffix = suffix ? item.name.endsWith(suffix) : true;
                const matchPid = pid ? item.id.startsWith(`${pid}-`) : true;
                if (matchSuffix && matchPid) {
                  await fs.unlink(item.id);
                  globalHandleRegistry.delete(item.id);
                }
              }
            }
          };
          await recursiveDeleteVirtual('root');
        } else if (mode === 'local') {
          let rootHandle = systemDirHandle;
          if (!rootHandle) {
            try { rootHandle = await getSystemDirHandleInstance(); } catch (err) {}
          }
          if (!rootHandle) return false;

          const recursiveDeleteLocal = async (handle, parentId) => {
            for await (const entry of handle.values()) {
              const uniqueKey = pid ? `${mode}:${pid}:${parentId}:${entry.name}` : `${mode}:${parentId}:${entry.name}`
              const fileId = globalFileIdMap.get(uniqueKey);
              if (entry.kind === 'directory') {
                if (fileId) {
                  await recursiveDeleteLocal(entry, fileId);
                }
              } else {
                const matchSuffix = suffix ? entry.name.endsWith(suffix) : true;
                const matchPid = pid ? (fileId && fileId.startsWith(`${pid}-`)) : true;
                if (matchSuffix && matchPid) {
                  await handle.removeEntry(entry.name);
                  if (fileId) {
                    globalHandleRegistry.delete(fileId);
                    globalFileIdMap.delete(uniqueKey);
                  }
                }
              }
            }
          };
          await recursiveDeleteLocal(rootHandle, 'root');
        }
        return true;
      } catch (e) {
        return false;
      }
    }),
    // 根据文件后缀递归检索属于当前 pid 文件的钩子函数
    handleSearchBySuffix: async (suffix) => {
      const results = [];
      const traverse = async (dirId) => {
        let list = [];
        if (mode === 'virtual') {
          list = await fs.readdir(dirId);
        } else if (mode === 'local') {
          let targetHandle;
          if (dirId === 'root') {
            targetHandle = systemDirHandle || await getSystemDirHandleInstance();
          } else {
            targetHandle = globalHandleRegistry.get(dirId)?.handle;
          }
          if (targetHandle) {
            const localItems = [];
            for await (const entry of targetHandle.values()) {
              localItems.push(await transformLocalHandle(entry, dirId));
            }
            list = localItems;
          }
        }
        for (const item of list) {
          if (item.type === FileType.DIRECTORY) {
            await traverse(item.id);
          } else {
            const matchSuffix = suffix ? item.name.endsWith(suffix) : true;
            const matchPid = pid ? item.id.startsWith(`${pid}-`) : true;
            if (matchSuffix && matchPid) {
              results.push(item);
            }
          }
        }
      };
      try {
        await traverse('root');
      } catch (e) {}
      return results;
    }
  }), [mode, pid, systemDirHandle, getSystemDirHandleInstance, transformLocalHandle]);

  return {
    state: { currentId, items, history, breadcrumbs, isReady, handleRegistry: globalHandleRegistry },
    navigation: { loadDir, handleBack, handleRefresh },
    operation
  }
}

// 系统级 Hook：专为 system 流程处理设计，不执行 pid 的前缀隔离，仅需传入 mode
export const useSystemFileSystem = (mode = 'virtual') => {
  return useBaseFileSystem(mode);
}

// 开放级 Hook：对外开发使用，强制校验参数 options 及其 options.pid 属性，提供隔离前缀
export const useFileSystem = (mode = 'virtual', options) => {
  if (!options || !options.pid) {
    throw new Error("useFileSystem 缺少必填参数: options.pid 不能为空");
  }
  return useBaseFileSystem(mode, options);
}

export default useFileSystem;
