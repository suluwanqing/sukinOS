import React, { useState, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { FileType } from "@/sukinos/utils/config";

const bem = createNamespace('file-view');

const formatBytes = (bytes) => {
  if (bytes === 0 || !bytes) return '--';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
  if (!timestamp || timestamp === '--') return '--';
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};


const Icons = {
  Folder: () => <svg viewBox="0 0 24 24" fill="var(--su-yellow-500)" width="1em" height="1em"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>,
  File: () => <svg viewBox="0 0 24 24" fill="var(--su-gray-400)" width="1em" height="1em"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  Back: () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>,
  Grid: () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>,
  List: () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
};

const FileSystemView = ({
  items = [],                // 目录列表数据 [{id, name, type, size, mtime}]
  breadcrumbs = [],          // 面包屑数据 [{id, name}]
  isLoading = false,         // 加载状态
  onItemClick,               // 单击项目 (主要用于选中)
  onItemDoubleClick,         // 双击项目 (进入文件夹或打开文件)
  onBreadcrumbClick,         // 点击面包屑导航
  onBack,                    // 返回上一级
  onRefresh,                 // 刷新当前目录
  defaultLayout = 'list'     // 默认视图 'list' | 'grid'
}) => {
  const [layout, setLayout] = useState(defaultLayout);
  const [selectedId, setSelectedId] = useState(null);

  const isRoot = breadcrumbs.length <= 1;

  const handleItemClick = (item) => {
    setSelectedId(item.id);
    if (onItemClick) onItemClick(item);
  };

  return (
    <div className={style[bem.b()]}>
      {/* 顶部工具栏 */}
      <div className={style[bem.e('toolbar')]}>
        <div className={style[bem.e('nav')]}>
          <button
            className={`${style[bem.e('icon-btn')]} ${isRoot ? style[bem.is('disabled', true)] : ''}`}
            onClick={onBack}
            disabled={isRoot}
            title="返回上一级"
          >
            <Icons.Back />
          </button>
          <button className={style[bem.e('icon-btn')]} onClick={onRefresh} title="刷新">
            <Icons.Refresh />
          </button>

          {/* 面包屑导航 */}
          <div className={style[bem.e('breadcrumbs')]}>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <span
                  className={style[bem.e('crumb')]}
                  onClick={() => onBreadcrumbClick && onBreadcrumbClick(crumb.id)}
                >
                  {crumb.name}
                </span>
                {index < breadcrumbs.length - 1 && <span className={style[bem.e('separator')]}>/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 视图切换 */}
        <div className={style[bem.e('actions')]}>
          <button
            className={`${style[bem.e('icon-btn')]} ${layout === 'list' ? style[bem.is('active', true)] : ''}`}
            onClick={() => setLayout('list')}
            title="列表视图"
          >
            <Icons.List />
          </button>
          <button
            className={`${style[bem.e('icon-btn')]} ${layout === 'grid' ? style[bem.is('active', true)] : ''}`}
            onClick={() => setLayout('grid')}
            title="网格视图"
          >
            <Icons.Grid />
          </button>
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className={style[bem.e('body')]}>
        {isLoading ? (
          <div className={style[bem.e('empty')]}>加载中...</div>
        ) : items.length === 0 ? (
          <div className={style[bem.e('empty')]}>该文件夹为空</div>
        ) : (
          <div className={`${style[bem.e('content')]} ${style[bem.m(layout)]}`}>

            {/* 列表视图专属的表头 */}
            {layout === 'list' && (
              <div className={style[bem.e('list-header')]}>
                <div className={style[bem.em('col', 'name')]}>名称</div>
                <div className={style[bem.em('col', 'mtime')]}>修改时间</div>
                <div className={style[bem.em('col', 'size')]}>大小</div>
              </div>
            )}

            {/* 渲染项目列表 */}
            {items.map(item => {
              const isDir = item.type === FileType.DIRECTORY || item.type === 'directory';
              const isSelected = selectedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`${style[bem.e('item')]} ${isSelected ? style[bem.is('selected', true)] : ''}`}
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => onItemDoubleClick && onItemDoubleClick(item)}
                >
                  <div className={style[bem.em('item', 'icon')]}>
                    {isDir ? <Icons.Folder /> : <Icons.File />}
                  </div>
                  <div className={style[bem.em('item', 'name')]} title={item.name}>
                    {item.name}
                  </div>
                  {/* 列表模式特有的列 */}
                  {layout === 'list' && (
                    <>
                      <div className={style[bem.em('col', 'mtime')]}>{formatDate(item.mtime)}</div>
                      <div className={style[bem.em('col', 'size')]}>{isDir ? '--' : formatBytes(item.size)}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className={style[bem.e('statusbar')]}>
        {items.length} 个项目
      </div>
    </div>
  );
};

export default React.memo(FileSystemView);
