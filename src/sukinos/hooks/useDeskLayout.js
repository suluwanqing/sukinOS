import { useCallback, useRef } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { DESK_LAYOUT_FILENAME } from '@/sukinos/utils/config';

// 桌面图标坐标存在 VFS 文件里（底层是 IndexedDB），按用户隔离。
// 全体用户共用一个 JSON：{ [userId]: { [pid]: "row-col" } }，模块级缓存让所有 Hook 实例共享、避免重复读盘
let layoutCache = null;
// 布局文件 ID，避免每次保存都重新查找文件
let layoutFileId = null;
const ensureReady = async () => {
  if (!fs.ready) await fs.boot();
};

const readAllLayouts = async () => {
  if (layoutCache) return layoutCache;
  await ensureReady();
  const items = fs.readdir('root');
  const file = items.find(i => i.name === DESK_LAYOUT_FILENAME);
  if (file) {
    layoutFileId = file.id;
    const content = await fs.readFile(file.id);
    try {
      layoutCache = JSON.parse(content) || {};
    } catch (e) {
      console.error('[DeskLayout] 布局文件解析失败，使用默认空布局:', e);
      layoutCache = {};
    }
  } else {
    layoutCache = {};
  }
  return layoutCache;
};

/** 桌面布局 Hook：读写上面那份模块级缓存，setLayout 落盘前防抖 */
export const useDeskLayout = () => {
  // 防抖保存定时器（每个 Hook 实例独立，避免相互干扰）
  const saveTimerRef = useRef(null);

  // 读取指定用户的布局坐标 { pid: "row-col" }
  const getLayout = useCallback(async (userId) => {
    const all = await readAllLayouts();
    return all[userId] || {};
  }, []);

  // 保存指定用户的布局坐标（防抖 800ms 写盘）
  const setLayout = useCallback(async (userId, positions) => {
    const all = await readAllLayouts();
    all[userId] = positions;
    layoutCache = all;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (layoutFileId) {
          await fs.updateContent(layoutFileId, JSON.stringify(all));
        } else {
          // 文件不存在（可能被误删），重新创建
          const file = await fs.writeFile('root', DESK_LAYOUT_FILENAME, JSON.stringify(all));
          if (file && file.id) layoutFileId = file.id;
        }
      } catch (e) {
        console.error('[DeskLayout] 保存布局失败:', e);
      }
    }, 800);
  }, []);

  return { getLayout, setLayout };
};

export default useDeskLayout;