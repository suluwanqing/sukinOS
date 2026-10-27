import React, { useState, useMemo } from 'react';
import {
  Folder, File, ArrowLeft, RefreshCw, LayoutGrid, List,
  Image as ImageIcon, Film, Music, FileCode, Archive, HardDrive,
  FolderOpen
} from 'lucide-react';
import { FileType } from "@/sukinos/utils/config";
import style from './style.module.css';

const formatBytes = (bytes) => {
  if (bytes === 0 || !bytes) return '--';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
  if (!timestamp || timestamp === '--') return '--';
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const FileTypeIcon = ({ item, isGrid = false }) => {
  const isDir = item.type === FileType.DIRECTORY || item.type === 'directory';
  const iconSize = isGrid ? 36 : 18;

  if (isDir) {
    return <Folder size={iconSize} className="text-amber-400 fill-amber-400/20" />;
  }

  const ext = item.name?.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return <ImageIcon size={iconSize} className="text-emerald-500" />;
  }
  if (['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext)) {
    return <Film size={iconSize} className="text-indigo-500" />;
  }
  if (['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext)) {
    return <Music size={iconSize} className="text-pink-500" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'md', 'txt'].includes(ext)) {
    return <FileCode size={iconSize} className="text-sky-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive size={iconSize} className="text-amber-500" />;
  }

  return <File size={iconSize} className="text-slate-400" />;
};

const FileSystemView = ({
  items = [],
  breadcrumbs = [],
  isLoading = false,
  onItemClick,
  onItemDoubleClick,
  onBreadcrumbClick,
  onBack,
  onRefresh,
  defaultLayout = 'list',
  width = '100%',
  height = '100%',
  orientation = 'vertical',
}) => {
  const [layout, setLayout] = useState(defaultLayout);
  const [selectedId, setSelectedId] = useState(null);

  const isRoot = breadcrumbs.length <= 1;

  const handleItemClick = (item) => {
    setSelectedId(item.id);
    if (onItemClick) onItemClick(item);
  };

  const containerStyle = useMemo(() => ({
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }), [width, height]);

  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedId) || null;
  }, [items, selectedId]);

  return (
    <div
      className={`${style.container} ${orientation === 'horizontal' ? style.orientationHorizontal : style.orientationVertical}`}
      style={containerStyle}
    >
      {orientation === 'horizontal' && (
        <aside className={style.sideNav}>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
            <HardDrive size={15} className="text-sky-500" />
            <span>路径导航</span>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1">
            {breadcrumbs.map((crumb, idx) => (
              <button
                key={crumb.id}
                onClick={() => onBreadcrumbClick && onBreadcrumbClick(crumb.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                  idx === breadcrumbs.length - 1
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <FolderOpen size={14} className={idx === breadcrumbs.length - 1 ? 'text-sky-600' : 'text-slate-400'} />
                <span className="truncate">{crumb.name}</span>
              </button>
            ))}
          </div>

          {selectedItem && (
            <div className="mt-auto p-2.5 bg-white border border-slate-200/80 rounded-lg text-[11px] text-slate-500 flex flex-col gap-1">
              <span className="font-semibold text-slate-700 truncate">{selectedItem.name}</span>
              <span>大小: {formatBytes(selectedItem.size)}</span>
              <span>修改: {formatDate(selectedItem.mtime).split(' ')[0]}</span>
            </div>
          )}
        </aside>
      )}

      <section className={style.mainPanel}>
        <header className={style.toolbar}>
          <div className={style.navGroup}>
            <button
              className={`${style.iconBtn} ${isRoot ? style.disabled : ''}`}
              onClick={onBack}
              disabled={isRoot}
              title="返回上一级"
            >
              <ArrowLeft size={16} />
            </button>
            <button className={style.iconBtn} onClick={onRefresh} title="刷新目录">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {orientation === 'vertical' && (
              <nav className={style.breadcrumbBar}>
                {breadcrumbs.map((crumb, index) => {
                  const isCurrent = index === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id}>
                      <span
                        className={`${style.crumbItem} ${isCurrent ? style.crumbCurrent : ''}`}
                        onClick={() => !isCurrent && onBreadcrumbClick && onBreadcrumbClick(crumb.id)}
                      >
                        {crumb.name}
                      </span>
                      {!isCurrent && <span className={style.crumbSeparator}>/</span>}
                    </React.Fragment>
                  );
                })}
              </nav>
            )}
          </div>

          <div className={style.actionGroup}>
            <button
              className={`${style.iconBtn} ${layout === 'list' ? style.active : ''}`}
              onClick={() => setLayout('list')}
              title="列表展示"
            >
              <List size={16} />
            </button>
            <button
              className={`${style.iconBtn} ${layout === 'grid' ? style.active : ''}`}
              onClick={() => setLayout('grid')}
              title="网格平铺"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </header>

        <main className={style.bodyArea}>
          {isLoading ? (
            <div className={style.emptyNotice}>
              <RefreshCw size={22} className="animate-spin text-sky-500" />
              <span>载入目录中...</span>
            </div>
          ) : items.length === 0 ? (
            <div className={style.emptyNotice}>
              <FolderOpen size={36} className="text-slate-300 stroke-1" />
              <span>此文件夹为空</span>
            </div>
          ) : (
            <div className={layout === 'list' ? style.listView : style.gridView}>
              {layout === 'list' && (
                <div className={style.listHeader}>
                  <div className={style.colName}>名称</div>
                  <div className={style.colTime}>修改日期</div>
                  <div className={style.colSize}>大小</div>
                </div>
              )}

              {items.map((item) => {
                const isDir = item.type === FileType.DIRECTORY || item.type === 'directory';
                const isSelected = selectedId === item.id;

                if (layout === 'list') {
                  return (
                    <div
                      key={item.id}
                      className={`${style.listItem} ${isSelected ? style.selected : ''}`}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => onItemDoubleClick && onItemDoubleClick(item)}
                    >
                      <div className={style.colName}>
                        <FileTypeIcon item={item} isGrid={false} />
                        <span className={style.textTruncate} title={item.name}>{item.name}</span>
                      </div>
                      <div className={style.colTime}>{formatDate(item.mtime)}</div>
                      <div className={style.colSize}>{isDir ? '--' : formatBytes(item.size)}</div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`${style.gridItem} ${isSelected ? style.selected : ''}`}
                    onClick={() => handleItemClick(item)}
                    onDoubleClick={() => onItemDoubleClick && onItemDoubleClick(item)}
                    title={item.name}
                  >
                    <div className={style.gridIconBox}>
                      <FileTypeIcon item={item} isGrid={true} />
                    </div>
                    <span className={style.gridName}>{item.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <footer className={style.statusBar}>
          <span>{items.length} 个对象</span>
          {selectedItem && (
            <span>已选: {selectedItem.name} ({formatBytes(selectedItem.size)})</span>
          )}
        </footer>
      </section>
    </div>
  );
};

export default React.memo(FileSystemView);
