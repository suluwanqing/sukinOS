import { useState, useEffect, useCallback } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { FileType } from "@/sukinos/utils/config";

/** VFS 文件内核 Hook：订阅变更自动刷新，附带按扩展名过滤与读写删 */
export const useFileKernel = (parentId = 'root') => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      if (!fs.ready) {
        await fs.boot();
      }
      const list = fs.readdir(parentId);
      setItems(list);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchFiles();
    const unsub = fs.watch(() => fetchFiles());
    return () => unsub();
  }, [fetchFiles]);

  const getImages = useCallback(() => {
    return items.filter(item => {
      if (item.type !== FileType.FILE) return false;
      const ext = item.name.split('.').pop().toLowerCase();
      return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
    });
  }, [items]);

  const getFilesByExt = useCallback((exts = []) => {
    return items.filter(item => {
      if (item.type !== FileType.FILE) return false;
      const ext = item.name.split('.').pop().toLowerCase();
      return exts.includes(ext);
    });
  }, [items]);

  /** 写入文件（上传本地资源到 VFS 走这里）；content 为 Base64/String */
  const writeFile = useCallback(async (name, content) => {
    try {
      // 自动处理重名：如果存在则加时间戳
      let finalName = name;
      if (items.some(i => i.name === name)) {
        const parts = name.split('.');
        const ext = parts.pop();
        finalName = `${parts.join('.')}_${Date.now()}.${ext}`;
      }
      const newNode = await fs.writeFile(parentId, finalName, content);
      return newNode;
    } catch (e) {
      return null;
    }
  }, [parentId, items]);

  const deleteFile = useCallback(async (id) => {
    try {
      await fs.unlink(id);
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  const isExist = useCallback((name) => {
    return items.some(i => i.name === name);
  }, [items]);

  return {
    items,
    images: getImages(),
    loading,

    getFilesByExt,
    isExist,
    readFile: (id) => fs.readFile(id),

    writeFile,
    deleteFile,
    refresh: fetchFiles
  };
};

export default useFileKernel;
