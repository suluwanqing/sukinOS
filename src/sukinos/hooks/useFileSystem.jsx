import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import fs from '@/sukinos/utils/file/fileKernel'
import { FileType } from "@/sukinos/utils/config"
import { alert } from "@/component/alert/layout"
import useStateHandle from "@/sukinos/hooks/useStateHandle"
import { generateShortId } from "/utils/js/rootSeed"
import { formatTimeSlash} from "@/sukinos/utils/date"
import { dataToBase64Mapper } from "/utils/js/func/data/exChangeBase64"

// 全局 ID 映射，防止 React 渲染周期内 ID 变更
const globalFileIdMap = new Map()
// 全局句柄注册表，确保跨组件能通过 ID 找回原始物理句柄
const globalHandleRegistry = new Map()
// 全局订阅监听器，用于同步不同组件间的钩子状态更新
const listeners = new Set();
const notifyAll = () => listeners.forEach(fn => fn());

// 推断文件映射类型，供 dataToBase64Mapper 使用
const getMapperTypeFromFile = (file) => {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Audio';
  if (type === 'text/html') return 'Html';
  if (file.name.endsWith('.json')) return 'Json';
  return 'Txt'; // 兜底使用 Txt 模式进行文件读取
}

/**
 * 解决 iframe/沙箱 环境下 `file instanceof File` 为 false 的 BUG。
 * 在把数据喂给 dataToBase64Mapper 之前，强行剥离沙箱外壳，提取出最底层的纯净 ArrayBuffer
 */
const extractSafeBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // 这里拿到的是底层的 ArrayBuffer
    reader.onerror = () => reject(new Error("提取文件二进制流失败"));
    reader.readAsArrayBuffer(file);
  });
}

export const useFileSystem = (mode = 'virtual') => {
  const [currentId, setCurrentId] = useState('root')
  const [items, setItems] = useState([])
  const [history, setHistory] = useState(['root'])
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [isReady, setIsReady] = useState(false)

  // 增加引用，用于追踪是否已经完成过Root的初始化加载
  const rootMountedRef = useRef(false)


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

  //本地解析为特定的解构
  const transformLocalHandle = useCallback(async (handle, parentId) => {
    const isDir = handle.kind === 'directory'
    const type = isDir ? FileType.DIRECTORY : FileType.FILE
    // 增加模式前缀，确保 ID 在物理层绝对隔离，并极大减少重复生成开销
    const uniqueKey = `${mode}:${parentId}:${handle.name}`
    // 优先复用 ID
    const fileId = globalFileIdMap.get(uniqueKey) || generateShortId()
    globalFileIdMap.set(uniqueKey, fileId)
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
      // 使用 Ref 确保拿到最新的 stateInstance 映射
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
  }, [mode]);

 //历史压栈
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

  //加载当前文件夹
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

      setItems(list);
      setBreadcrumbs(path);
      setCurrentId(id);
      if (pushHistory) setHistory(prev => (prev[prev.length - 1] !== id ? [...prev, id] : prev));
    } catch (e) {
      // console.error("[useFileSystem] loadDir 异常", e)
    }
  }, [mode, systemDirHandle, getSystemDirHandleInstance, transformLocalHandle, getLocalBreadcrumbs]);

  // 用于在全局监听器中调用 loadDir 而不触发依赖循环
  const loadDirRef = useRef(loadDir);
  useEffect(() => { loadDirRef.current = loadDir; }, [loadDir]);

  // 初始化启动
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
  }, [mode]); // 只依赖 mode

  // 注册广播监听。
  useEffect(() => {
    const handleUpdate = () => {
        // 使用 Ref 确保始终拿到最新的 loadDir 和当前的 currentId，不再依赖它们作为 Effect 依赖项
        loadDirRef.current(stateRef.current.currentId, false);
    };
    listeners.add(handleUpdate);
    return () => listeners.delete(handleUpdate);
  }, []); // 依赖项必须为空，彻底断开死循环

  // 监听 systemDirHandle 变化
  useEffect(() => {
    if (mode === 'local' && systemDirHandle && !rootMountedRef.current) {
        loadDir('root', false).then(() => { rootMountedRef.current = true; setIsReady(true); })
    }
  }, [systemDirHandle, mode, loadDir])

  // Virtual 模式监听
  useEffect(() => {
    if (!isReady || mode !== 'virtual') return
    const unsub = fs.watch(() => loadDir(currentId, false))
    return () => unsub()
  }, [isReady, currentId, mode, loadDir])

  // 物理操作广播封装
  const wrapNotify = (fn) => async (...args) => {
     const res = await fn(...args);
     if (res) notifyAll();
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
    handleCreate: wrapNotify(async ({type}) => {
      const { currentId, items } = stateRef.current; // 从 Ref 获取最新状态，确保映射正确
      const baseName = type === FileType.DIRECTORY ? '新建文件夹' : '新建文件.jsx'
      let name = baseName; let counter = 1;
      while (items.some(i => i.name === name)) name = `${baseName.replace('.jsx','')} (${counter++}).jsx`;
      if (mode === 'virtual') return type === FileType.DIRECTORY ? fs.mkdir(currentId, name) : fs.writeFile(currentId, name, '');
      const parent = globalHandleRegistry.get(currentId)?.handle;
      if (!parent) return null;
      await (type === FileType.DIRECTORY ? parent.getDirectoryHandle(name, {create:true}) : parent.getFileHandle(name, {create:true}));
      return { id: generateShortId(), name };
    }),
    handleRename: wrapNotify(async({id, name, newName, parentId, type}) => {
      if (!id || !newName.trim()) return false
      if (mode === 'virtual') await fs.rename(id, newName);
      else {
          const parent = globalHandleRegistry.get(parentId)?.handle
          const target = type === FileType.DIRECTORY ? await parent.getDirectoryHandle(name) : await parent.getFileHandle(name)
          if (target.move) await target.move(newName);
          else {
              const fileData = await target.getFile(); const newFile = await parent.getFileHandle(newName, {create:true});
              const writable = await newFile.createWritable(); await writable.write(fileData); await writable.close();
              await parent.removeEntry(name);
          }
          globalFileIdMap.delete(`${mode}:${parentId}:${name}`); globalHandleRegistry.delete(id);
      }
      return true
    }),
    handleDelete: wrapNotify(async ({id, name, parentId}) => {
      if (mode === 'virtual') await fs.unlink(id);
      else {
          const parent = globalHandleRegistry.get(parentId)?.handle
          if (parent) await parent.removeEntry(name, { recursive: true });
          globalHandleRegistry.delete(id); globalFileIdMap.delete(`${mode}:${parentId}:${name}`);
      }
      return true
    }),
    handleOpenFile: async (item) => {
      try {
          const content = mode === 'virtual' ? await fs.readFile(item.id) : await (await (globalHandleRegistry.get(item.id)?.handle || item.handle).getFile()).text();
          return { ...item, content }
      } catch (e) { return null }
    },
    handleSave: wrapNotify(async ({ id, content, parentId, name }) => {
      if (mode === 'virtual') await fs.updateContent(id, content);
      else {
          const record = globalHandleRegistry.get(id);
          const handle = record?.handle || await globalHandleRegistry.get(parentId)?.handle.getFileHandle(name, {create:true});
          const writable = await handle.createWritable(); await writable.write(content); await writable.close();
      }
      return true
    }),
    handleUploadFiles: wrapNotify(async (files) => {
      const { currentId } = stateRef.current;
      if (mode !== 'virtual') return alert.warning("仅虚拟盘支持");
      for (const file of Array.from(files)) {
        const mapperType = getMapperTypeFromFile(file); const safeBuffer = await extractSafeBuffer(file);
        let content = await dataToBase64Mapper(safeBuffer, mapperType);
        if (['Image', 'Video', 'Audio'].includes(mapperType)) content = `data:${file.type};base64,${content}`;
        await fs.writeFile(currentId, file.name, content);
      }
      return true;
    })
  }), [mode]); // 仅依赖 mode

  // 暴露 API
  return {
    state: { currentId, items, history, breadcrumbs, isReady, handleRegistry: globalHandleRegistry },
    navigation: { loadDir, handleBack, handleRefresh },
    operation
  }
}

export default useFileSystem;
