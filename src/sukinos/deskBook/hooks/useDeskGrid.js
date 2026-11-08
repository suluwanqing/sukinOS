import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useDeskLayout from '@/sukinos/hooks/useDeskLayout'
import { DEFAULT_USER_ID, ENV_KEY_META_INFO } from '@/sukinos/utils/config'
import { CELL_SIZE, GAP_SIZE, MOBILE_CELL_SIZE, MOBILE_GAP_SIZE } from '../constants'

// 桌面/移动端图标网格：行列计算、位置持久化、拖拽交换与卸载兜底保存
export function useDeskGrid({ apps, isReady, isMobile, kernel, refreshConfig, mainContainerRef, viewRef }) {
  const { getLayout, setLayout } = useDeskLayout();
  const currentUserId = kernel.currentUser?.id || DEFAULT_USER_ID;
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  const [gridSize, setGridSize] = useState({ rows: 0, cols: 0 }); // 动态行列数
  const [appPositions, setAppPositions] = useState({}); // PID 到 "row-col" 的坐标映射
  const [mobileOrderPositions, setMobileOrderPositions] = useState(null); // 只读，不回写
  const [dragOverCell, setDragOverCell] = useState(null); // 当前拖拽悬停的格子坐标 "row-col"

  // 保持最新位置引用的 Ref，用于防止 unload 或闭包时的状态滞后问题
  const appPositionsRef = useRef(appPositions);
  useEffect(() => {
    appPositionsRef.current = appPositions;
  }, [appPositions]);

  // 缓存系统就绪状态，用于在卸载事件中进行边界校验
  const isReadyRef = useRef(isReady);
  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  // 自动排列未分配位置的应用
  const autoArrangeApps = useCallback((currentApps, currentPositions, maxRows, maxCols) => {
    const newPositions = { ...currentPositions };
    const usedPositions = new Set(Object.values(newPositions));
    // 过滤出需要显示在桌面的图标 (hasShortcut)
    const shortcuts = currentApps.filter(item => item?.[ENV_KEY_META_INFO]?.custom?.hasShortcut);
    let currentRow = 0;
    let currentCol = 0;

    shortcuts.forEach(app => {
      if (!newPositions[app.pid]) {
        // 寻找下一个空余格子
        while (usedPositions.has(`${currentRow}-${currentCol}`)) {
            currentCol++;
            if (currentCol >= maxCols) {
                currentCol = 0;
                currentRow++;
            }
        }
        // 检查是否超出网格边界
        if (currentRow < maxRows) {
            const posKey = `${currentRow}-${currentCol}`;
            newPositions[app.pid] = posKey;
            usedPositions.add(posKey);
        }
      }
    });
    return newPositions;
  }, []);

  // 只产出渲染映射，不写回 appPositions / VFS，桌面坐标保持原样
  const reflowForGrid = useCallback((currentApps, positions, maxRows, maxCols) => {
    if (maxRows <= 0 || maxCols <= 0) return {};
    const ordered = currentApps
      .filter(item => item?.[ENV_KEY_META_INFO]?.custom?.hasShortcut)
      .map((app, fallbackIndex) => {
        const pos = positions?.[app.pid];
        let row = Infinity;
        let col = Infinity;
        if (pos) {
          const [r, c] = pos.split('-').map(Number);
          if (Number.isFinite(r) && Number.isFinite(c)) {
            row = r;
            col = c;
          }
        }
        return { app, row, col, fallbackIndex };
      })
      .sort((a, b) => (a.row - b.row) || (a.col - b.col) || (a.fallbackIndex - b.fallbackIndex));

    const result = {};
    ordered.forEach(({ app }, index) => {
      result[app.pid] = `${Math.floor(index / maxCols)}-${index % maxCols}`;
    });
    return result;
  }, []);

  useEffect(() => {
    if (!isReady || !isMobile) return;
    let cancelled = false;
    getLayout(currentUserId).then(savedLayout => {
      if (!cancelled) setMobileOrderPositions(savedLayout || {});
    });
    return () => { cancelled = true; };
  }, [isReady, isMobile, currentUserId, getLayout]);

  // 监听容器大小变化，动态计算行列数
  useEffect(() => {
    if (!isReady || !mainContainerRef.current) return;
    let resizeTimer;
    const cellSize = isMobile ? MOBILE_CELL_SIZE : CELL_SIZE;
    const gapSize = isMobile ? MOBILE_GAP_SIZE : GAP_SIZE;
    const calculateGrid = () => {
      if (mainContainerRef.current) {
        let width;
        let height;
        if (isMobile && viewRef.current) {
          const view = viewRef.current;
          const computed = getComputedStyle(view);
          width = view.clientWidth - parseFloat(computed.paddingLeft) - parseFloat(computed.paddingRight);
          height = view.clientHeight - parseFloat(computed.paddingTop) - parseFloat(computed.paddingBottom);
        } else {
          width = mainContainerRef.current.clientWidth - 40; // 减去 padding
          height = mainContainerRef.current.clientHeight - 40;
        }
        const cols = Math.max(1, Math.floor((width + gapSize) / (cellSize + gapSize)));
        const rows = Math.max(1, Math.floor((height + gapSize) / (cellSize + gapSize)));
        setGridSize(prev => (prev.rows === rows && prev.cols === cols) ? prev : { rows, cols });
      }
    };
    calculateGrid();
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(calculateGrid, 200);
    });
    observer.observe(mainContainerRef.current);
    return () => {
        observer.disconnect();
        clearTimeout(resizeTimer);
    };
  }, [isReady, isMobile]);

  // 移动端跳过，避免把移动端网格坐标写进桌面布局
  useEffect(() => {
    if (!isReady || isMobile || gridSize.cols === 0) return;
    // 加载持久化位置（按用户隔离，从 VFS 文件读取）
    let cancelled = false;
    getLayout(currentUserId).then(savedLayout => {
      if (cancelled) return;
      setAppPositions(prev => {
          const basePositions = Object.keys(prev).length > 0 ? prev : savedLayout;
          const currentAppPids = new Set(apps.map(a => a.pid));
          const validPositions = {};

          Object.keys(basePositions).forEach(pid => {
              if(!currentAppPids.has(pid)) return; // 移除已卸载的应用位置
              const pos = basePositions[pid];
              if (pos) {
                  const [r, c] = pos.split('-').map(Number);
                  // 响应式检查：如果窗口缩放导致原位置越界，则标记为待重新分配
                  if (r < gridSize.rows && c < gridSize.cols) {
                      validPositions[pid] = pos;
                  }
              }
          });
          return autoArrangeApps(apps, validPositions, gridSize.rows, gridSize.cols);
      });
    });
    return () => { cancelled = true; };
  }, [apps, isReady, isMobile, gridSize.cols, gridSize.rows, autoArrangeApps, currentUserId, getLayout]);

  // 当网格布局更改时，主动写入持久化，形成保存的双保险（系统未就绪或布局为空时禁止保存，防覆盖）
  useEffect(() => {
    if (isReady && !isMobile && Object.keys(appPositions).length > 0) {
      setLayout(currentUserId, appPositions);
    }
  }, [appPositions, isReady, isMobile, currentUserId, setLayout]);

  const handleDragStart = (e, pid) => {
    e.dataTransfer.setData("text/plain", pid);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const posKey = `${row}-${col}`;
    if (dragOverCell !== posKey) setDragOverCell(posKey);
  };
  const handleDragLeave = () => setDragOverCell(null);
  const handleDrop = (e, targetRow, targetCol) => {
    e.preventDefault();
    setDragOverCell(null);
    const sourcePid = e.dataTransfer.getData("text/plain");
    const targetKey = `${targetRow}-${targetCol}`;
    if (!sourcePid) return;

    setAppPositions(prev => {
        const newPositions = { ...prev };
        // 目标位置已有应用时交换
        const targetPid = Object.keys(newPositions).find(pid => newPositions[pid] === targetKey);
        if (targetPid && targetPid !== sourcePid) {
            const sourceKey = newPositions[sourcePid];
            newPositions[sourcePid] = targetKey;
            newPositions[targetPid] = sourceKey;
        } else {
            newPositions[sourcePid] = targetKey;
        }
        return newPositions;
    });
  };

  // 刷新布局：移动端只重读 VFS 排序，不写盘
  const refreshDeskLayout = useCallback(() => {
    if (isMobile) {
      getLayout(currentUserId).then(savedLayout => setMobileOrderPositions(savedLayout || {}));
      refreshConfig();
      return;
    }
    setAppPositions(autoArrangeApps(apps, {}, gridSize.rows, gridSize.cols));
    refreshConfig();
  }, [isMobile, getLayout, currentUserId, refreshConfig, autoArrangeApps, apps, gridSize.rows, gridSize.cols]);

  // 移动端用只读映射，桌面直接用持久化坐标
  const displayPositions = useMemo(() => {
    if (!isMobile) return appPositions;
    return reflowForGrid(
      apps,
      mobileOrderPositions ?? appPositions,
      gridSize.rows,
      gridSize.cols
    );
  }, [isMobile, appPositions, mobileOrderPositions, apps, gridSize.rows, gridSize.cols, reflowForGrid]);

  // 卸载兜底：系统未就绪或布局为空时拒绝清空本地数据
  const handleUnload = useCallback(() => {
    if (isReadyRef.current) {
      kernel.forceSaveAllStates()
    }
    if (isReadyRef.current && Object.keys(appPositionsRef.current).length > 0) {
      setLayout(currentUserIdRef.current, appPositionsRef.current);
    }
  }, [setLayout, kernel]);

  return {
    gridSize,
    dragOverCell,
    displayPositions,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    refreshDeskLayout,
    handleUnload,
  };
}

export default useDeskGrid
