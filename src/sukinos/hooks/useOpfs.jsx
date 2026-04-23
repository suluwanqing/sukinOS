import { useState, useEffect, useCallback } from 'react';

export const  useOPFS=(target)=>{
  const [handle, setHandle] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  // 初始化句柄
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setIsReady(false);
        setError(null);
        if (!target) return;

        if (typeof target === 'string') {
          const rootDir = await navigator.storage.getDirectory();
          const fileHandle = await rootDir.getFileHandle(target, { create: true });
          if (isMounted) setHandle(fileHandle);
        } else if (target.kind === 'file') {
          if (isMounted) setHandle(target);
        } else {
          throw new Error('需传入文件名(string)或文件句柄(FileSystemFileHandle)');
        }
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };
    init();
    return () => { isMounted = false; };
  }, [target]);

  // 内部校验器
  const checkHandle = useCallback(() => {
    if (!handle) throw new Error('文件句柄未就绪或已被删除');
    return handle;
  }, [handle]);

  // ================= 查 =================

  const readText = useCallback(async () => {
    const h = checkHandle();
    const file = await h.getFile();
    return await file.text();
  }, [checkHandle]);

  const getFileInfo = useCallback(async () => {
    const h = checkHandle();
    const file = await h.getFile();
    return { name: file.name, size: file.size, lastModified: new Date(file.lastModified) };
  }, [checkHandle]);

  // ================= 增 / 改 =================

  // 普通覆盖写入
  const write = useCallback(async (data) => {
    const h = checkHandle();
    const writable = await h.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  }, [checkHandle]);

  // 安全覆盖写入 (建临时文件 -> 写入 -> 替换)
  const safeWrite = useCallback(async (data) => {
    const h = checkHandle();
    const rootDir = await navigator.storage.getDirectory();
    const originalName = h.name;
    const tempName = `${originalName}.${Date.now()}.tmp`;

    const tempHandle = await rootDir.getFileHandle(tempName, { create: true });

    try {
      const writable = await tempHandle.createWritable();
      await writable.write(data);
      await writable.close();

      // 尝试替换原文件
      if (typeof tempHandle.move === 'function') {
        await rootDir.removeEntry(originalName);
        await tempHandle.move(originalName);
        setHandle(await rootDir.getFileHandle(originalName));
      } else {
        // 降级：原位写入
        const origWritable = await h.createWritable();
        await origWritable.write(data);
        await origWritable.close();
        await rootDir.removeEntry(tempName);
      }
      return true;
    } catch (err) {
      await rootDir.removeEntry(tempName).catch(() => {}); // 失败则清理临时文件
      throw err;
    }
  }, [checkHandle]);

  // 3追加写入
  const append = useCallback(async (data) => {
    const h = checkHandle();
    const writable = await h.createWritable({ keepExistingData: true });
    const file = await h.getFile();
    await writable.write({ type: 'write', position: file.size, data });
    await writable.close();
    return true;
  }, [checkHandle]);

  // ================= 重命名 =================
  const rename = useCallback(async (newName) => {
    const h = checkHandle();
    const rootDir = await navigator.storage.getDirectory();
    const oldName = h.name;

    if (newName === oldName) return true;

    // 防重名检测
    try {
      await rootDir.getFileHandle(newName);
      throw new Error(`重命名失败：文件 "${newName}" 已存在！`);
    } catch (err) {
      if (err.name !== 'NotFoundError') throw err;
    }

    if (typeof h.move === 'function') {
      // 原生 API 重命名
      await h.move(newName);
      setHandle(await rootDir.getFileHandle(newName));
    } else {
      // 降级处理：读旧 -> 写新 -> 删旧
      try {
        const oldFile = await h.getFile();
        const newHandle = await rootDir.getFileHandle(newName, { create: true });

        // 直接传 File 对象写入，防内存溢出
        const writable = await newHandle.createWritable();
        await writable.write(oldFile);
        await writable.close();

        await rootDir.removeEntry(oldName);
        setHandle(newHandle);
      } catch (fallbackErr) {
        await rootDir.removeEntry(newName).catch(() => {}); // 失败则清理残缺新文件
        throw new Error(`重命名失败: ${fallbackErr.message}`);
      }
    }
    return true;
  }, [checkHandle]);

  // ================= 删 =================
  const remove = useCallback(async () => {
    const h = checkHandle();
    await h.remove();
    setHandle(null);
    setIsReady(false);
    return true;
  }, [checkHandle]);

  return {
    handle,
    isReady,
    error,
    readText,
    getFileInfo,
    write,
    safeWrite,
    append,
    rename,
    remove
  };
}

export default useOPFS
