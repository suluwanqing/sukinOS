import { useState, useEffect, useCallback } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { FileType } from "@/sukinos/utils/config";

/**
 * 轻量级文件内核钩子
 */
export const useFileKernel = (parentId = 'root') => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 核心查询 ---
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      if (!fs.ready) {
        await fs.boot();
      }
      const list = fs.readdir(parentId);
      setItems(list);
    } catch (e) {
      // console.error("[useFileKernel] Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchFiles();
    const unsub = fs.watch(() => fetchFiles());
    return () => unsub();
  }, [fetchFiles]);

  // --- 辅助过滤函数 ---

  // 获取图片
  const getImages = useCallback(() => {
    return items.filter(item => {
      if (item.type !== FileType.FILE) return false;
      const ext = item.name.split('.').pop().toLowerCase();
      return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'].includes(ext);
    });
  }, [items]);

  // 通用后缀过滤 (例如: getFilesByExt(['mp4', 'webm']))
  const getFilesByExt = useCallback((exts = []) => {
    return items.filter(item => {
      if (item.type !== FileType.FILE) return false;
      const ext = item.name.split('.').pop().toLowerCase();
      return exts.includes(ext);
    });
  }, [items]);

  // --- 操作函数 ---

  /**
   * 写入文件 (常用于上传本地资源到 VFS)
   * @param {string} name 文件名
   * @param {any} content 内容 (Base64/String)
   */
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
      // console.error("[useFileKernel] Write error:", e);
      return null;
    }
  }, [parentId, items]);

  /**
   * 删除文件
   * @param {string} id 文件 inode id
   */
  const deleteFile = useCallback(async (id) => {
    try {
      await fs.unlink(id);
      return true;
    } catch (e) {
      // console.error("[useFileKernel] Delete error:", e);
      return false;
    }
  }, []);

  /**
   * 检查文件名是否存在
   */
  const isExist = useCallback((name) => {
    return items.some(i => i.name === name);
  }, [items]);

  return {
    // 状态
    items,
    images: getImages(),
    loading,

    // 查询
    getFilesByExt,
    isExist,
    readFile: (id) => fs.readFile(id),

    // 指令
    writeFile,
    deleteFile,
    refresh: fetchFiles
  };
};

export default useFileKernel;
