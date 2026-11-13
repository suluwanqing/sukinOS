import React, { useState, useMemo, useRef } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { FileType} from "@/sukinos/utils/config"
import ContextMenu from "@/component/contextMenu/layout";
import Drawer, { DrawerHeader, DrawerBody, DrawerFooter, DrawerTitle, DrawerDescription } from '@/component/drawer/layout';
import { Button } from '@/component/button/layout';
import { Input } from '@/component/input/layout';
import { useViewportMode } from '@/sukinos/hooks/useViewportMode';
import { Folder as FolderIcon, File as InsertDriveFileIcon, ArrowLeft as ArrowBackIcon, RefreshCw as RefreshIcon, LayoutGrid as GridViewIcon, List as FormatListBulletedIcon, FolderPlus as CreateNewFolderIcon, FilePlus as NoteAddIcon, Home as HomeIcon, Monitor as ComputerIcon, ArrowLeftRight as SwapHorizIcon, Menu as MenuIcon, CornerLeftUp as UpIcon, ChevronRight as ChevronRightIcon, FolderInput as MoveIcon } from 'lucide-react';
import {useSystemFileSystem} from '@/sukinos/hooks/useFileSystem';
import { alert } from '@/component/alert/layout';
import ExChange from "./exchange/layout";
import InteractiveAwakening from '@/sukinos/middleware/InteractiveAwakening/main';
import kernelFs from '@/sukinos/utils/file/fileKernel';
const bem = createNamespace('file-system');

const Sidebar = React.memo(({ mode, setMode }) => {
  return (
    <div className={style[bem.e('sidebar')]}>
      <div className={style[bem.e('sidebar-group')]}>
        <div className={style[bem.e('sidebar-title')]}>文件管理</div>
        <div
          className={[style[bem.e('sidebar-item')], style[bem.is('active', mode === 'virtual')]].join(' ')}
          onClick={() => setMode('virtual')}
        >
          <HomeIcon size={20} /> <span>虚拟盘</span>
        </div>
        <div
          className={[style[bem.e('sidebar-item')], style[bem.is('active', mode === 'local')]].join(' ')}
          onClick={() => setMode('local')}
        >
          <ComputerIcon size={20} /> <span>此电脑</span>
        </div>
        <div
          className={[style[bem.e('sidebar-item')], style[bem.is('active', mode === 'remote')]].join(' ')}
          onClick={() => setMode('remote')}
        >
          <ComputerIcon size={20} /> <span>云端</span>
        </div>
      </div>
    </div>
  );
});

const FileSystem = ({ app }) => {
  const [mode, setMode] = useState('virtual')
  const [navOpen, setNavOpen] = useState(false);
  const { isMobile, isTouch } = useViewportMode();
  const {
    state: { currentId, items, history, breadcrumbs, isReady, handleRegistry },
    navigation: { loadDir, handleBack, handleRefresh },
    operation: { handleCreate, handleRename, handleMove, handleReadDir, handleDelete, handleExportFile }
  } = useSystemFileSystem(mode);

  const [viewMode, setViewMode] = useState('grid');
  const [selectedId, setSelectedId] = useState(null);

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameSessionRef = useRef({ id: null, submitting: false });
  const renameValueRef = useRef('');

  const [moveItem, setMoveItem] = useState(null);
  const [movePath, setMovePath] = useState([]);
  const [moveItems, setMoveItems] = useState([]);
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);

  // 唤醒组件控制状态与载荷
  const [awakeningVisible, setAwakeningVisible] = useState(false);
  const [targetFileForOpen, setTargetFileForOpen] = useState(null);

  const [exchangeVisible, setExchangeVisible] = useState(false);

  const openRename = (item) => {
    renameSessionRef.current = { id: item.id, submitting: false };
    setRenamingId(item.id);
    renameValueRef.current = item.name;
    setRenameValue(item.name);
  };

  const closeRename = () => {
    renameSessionRef.current = { id: null, submitting: false };
    setRenamingId(null);
  };

  const onCreate = async (type) => {
    const newItem = await handleCreate({type});
    if (newItem) openRename(newItem);
  };

  const handleItemClick = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    setRenamingId(null);
  };

  // 简化后的双击逻辑：直接交付状态控制
  const handleItemDbClick = (item) => {
    if (item.type === FileType.DIRECTORY) {
      loadDir(item.id);
      setSelectedId(null);
    } else {
      setTargetFileForOpen(item);
      setAwakeningVisible(true);
    }
  };

  const submitRename = async (item) => {
    const session = renameSessionRef.current;
    if (!session.id || session.id !== item.id || session.submitting) return;
    const nextName = renameValueRef.current.trim();
    if (!nextName || nextName === item.name) {
      closeRename();
      return;
    }
    session.submitting = true;
    try {
      await handleRename({ ...item, newName: nextName, parentId: item.parentId });
    } finally {
      session.submitting = false;
      closeRename();
    }
  };

  const loadMoveDir = async (dirId) => {
    setMoveLoading(true);
    try {
      const list = await handleReadDir(dirId);
      setMoveItems(list.filter(entry => entry.type === FileType.DIRECTORY));
    } catch {
      setMoveItems([]);
    } finally {
      setMoveLoading(false);
    }
  };

  const openMoveDialog = (item) => {
    const path = breadcrumbs.length ? breadcrumbs.map(b => ({ id: b.id, name: b.name })) : [{ id: currentId, name: '/' }];
    setMoveItem(item);
    setMovePath(path);
    loadMoveDir(path[path.length - 1].id);
  };

  const closeMoveDialog = () => {
    setMoveItem(null);
    setMovePath([]);
    setMoveItems([]);
  };

  const enterMoveDir = (dir) => {
    setMovePath(prev => [...prev, { id: dir.id, name: dir.name }]);
    loadMoveDir(dir.id);
  };

  const backMoveDir = () => {
    if (movePath.length <= 1) return;
    const next = movePath.slice(0, -1);
    setMovePath(next);
    loadMoveDir(next[next.length - 1].id);
  };

  const isBlockedTarget = (dirId) => {
    if (!moveItem) return false;
    if (dirId === moveItem.id) return true;
    if (moveItem.type !== FileType.DIRECTORY) return false;
    if (mode === 'virtual') {
      try {
        return (kernelFs.getPath(dirId) || []).some(node => node.id === moveItem.id);
      } catch {
        return false;
      }
    }
    let curr = dirId;
    let safety = 0;
    while (curr && curr !== 'root' && safety < 200) {
      if (curr === moveItem.id) return true;
      curr = handleRegistry.get(curr)?.parentId;
      safety++;
    }
    return false;
  };

  const submitMove = async () => {
    const targetDir = movePath[movePath.length - 1];
    if (!moveItem || !targetDir || moveBusy) return;
    const parentId = moveItem.parentId || currentId;
    if (targetDir.id === parentId) {
      alert.warning('项目已在该目录中');
      return;
    }
    setMoveBusy(true);
    try {
      const ok = await handleMove({
        id: moveItem.id,
        name: moveItem.name,
        parentId,
        targetParentId: targetDir.id,
        type: moveItem.type
      });
      if (ok) {
        closeMoveDialog();
        handleRefresh();
      }
    } finally {
      setMoveBusy(false);
    }
  };

  const itemMenuItems = [
    {
      id: 'open',
      label: '打开',
      onClick: (item) => handleItemDbClick(item)
    },
    {
      id: 'rename',
      label: '重命名',
      onClick: (item) => openRename(item)
    },
    {
      id: 'move',
      label: '移动到…',
      onClick: (item) => openMoveDialog(item)
    },
    {
      type: 'divider'
    },
    {
      id: 'delete',
      label: '删除',
      danger: true,
      func: {
        isNext: true,
        confirm: {
          title: '确认删除',
          content: '您确定要删除此项吗？删除后将无法恢复。',
          onConfirm: async (item) => {
            await handleDelete(item);
          },
          onCancel: () => console.log('取消删除')
        }
      }
    }
  ];

  // 完善虚拟盘特有的导出菜单项点击逻辑，调用 hook 层导出的 handleExportFile 导出真实数据
  const virtualItemMenuItems = [
    {
      type: 'divider'
    },
    {
      id: 'export',
      label: '导出',
      onClick: async (item) => {
        await handleExportFile(item);
      }
    },
  ]

  const itemMenu = useMemo(() => {
        return [...itemMenuItems,...(mode==='virtual' ?  virtualItemMenuItems : [] )]
  },[mode, currentId, breadcrumbs])

  const bgMenuItems = [
    {
      id: 'new_folder',
      label: '新建文件夹',
      onClick: () => onCreate(FileType.DIRECTORY)
    },
    {
      id: 'new_file',
      label: '新建文件',
      onClick: () => onCreate(FileType.FILE)
    },
    {
      type: 'divider'
    },
    {
      id: 'refresh',
      label: '刷新',
      onClick: handleRefresh
    }
  ];

  return (
    <div className={style[bem.b()]}>
      {!isMobile && <Sidebar mode={mode} setMode={setMode} />}
      <div className={style[bem.e('main')]}>
        <div className={style[bem.e('header')]}>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNavOpen(true)}
              aria-label="打开文件导航"
            >
              <MenuIcon size={20} />
            </Button>
          )}
          <div className={style[bem.e('nav-controls')]}>
            <Button variant="ghost" size="icon" onClick={handleBack} disabled={history.length <= 1} aria-label="返回上一级">
              <ArrowBackIcon size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="刷新">
              <RefreshIcon size={20} />
            </Button>
          </div>

          <div className={style[bem.e('breadcrumbs')]}>
            {breadcrumbs.map((b, idx) => (
              <span key={b.id} className={style[bem.e('crumb')]} onClick={() => loadDir(b.id)}>
                {b.name}
                {idx < breadcrumbs.length - 1 && <span className={style[bem.e('crumb-sep')]}>/</span>}
              </span>
            ))}
          </div>

          <div className={style[bem.e('actions')]}>

            <Button variant="ghost" size="icon" onClick={() => setExchangeVisible(true)} title="文件交换/传输" aria-label="文件交换/传输">
              <SwapHorizIcon size={20} />
            </Button>
            <div className={style[bem.e('divider')]}></div>

            <Button variant="ghost" size="icon" onClick={() => onCreate(FileType.DIRECTORY)} title="新建文件夹" aria-label="新建文件夹">
              <CreateNewFolderIcon size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onCreate(FileType.FILE )} title="新建文件" aria-label="新建文件">
              <NoteAddIcon size={20} />
            </Button>
            <div className={style[bem.e('divider')]}></div>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              title="网格视图"
              aria-label="网格视图"
            >
              <GridViewIcon size={20} />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              title="列表视图"
              aria-label="列表视图"
            >
              <FormatListBulletedIcon size={20} />
            </Button>
          </div>
        </div>

        {!isReady ? (
            <div className={style[bem.e('loading')]}>加载中...</div>
        ) : (
            <ContextMenu menuItems={bgMenuItems} metaInfo={{ currentId }}>
            <div className={`${style[bem.e('content')]} ${style[bem.em('content', viewMode)]}`}>
                {items.length === 0 && <div className={style[bem.e('empty')]}>此文件夹为空</div>}

                {items.map(item => (
                <ContextMenu key={item.id} menuItems={itemMenu} metaInfo={item}>
                    <div
                    className={[style[bem.e('item')],style[bem.is('selected', selectedId === item.id)]].join(' ')}
                    onClick={(e) => {
                      if (isTouch) {
                        handleItemDbClick(item);
                        return;
                      }
                      handleItemClick(e, item.id);
                    }}
                    onDoubleClick={() => handleItemDbClick(item)}
                    >
                    <div className={style[bem.e('item-icon')]}>
                        {item.type === FileType.DIRECTORY
                        ? <FolderIcon style={{ color: '#FFCA28', width: viewMode === 'grid' ? 50 : 24, height: viewMode === 'grid' ? 50 : 24, flexShrink: 0 }} />
                        : <InsertDriveFileIcon style={{ color: '#90CAF9', width: viewMode === 'grid' ? 50 : 24, height: viewMode === 'grid' ? 50 : 24, flexShrink: 0 }} />
                        }
                    </div>

                    <div className={style[bem.e('item-name')]}>
                        {renamingId === item.id ? (
                        <Input
                            className={style[bem.e('rename-input')]}
                            size="xsmall"
                            value={renameValue}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              renameValueRef.current = e.target.value;
                              setRenameValue(e.target.value);
                            }}
                            onBlur={() => submitRename(item)}
                            onKeyDown={(e) => {
                            if (e.nativeEvent?.isComposing) return;
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitRename(item);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              closeRename();
                            }
                            }}
                        />
                        ) : (
                        <span>{item.name}</span>
                        )}
                    </div>

                    {viewMode === 'list' && (
                        <>
                        <div className={style[bem.e('item-date')]}>{new Date(item.mtime).toLocaleString()}</div>
                        <div className={style[bem.e('item-size')]}>{item.type === FileType.DIRECTORY ? '--' : `${item.size} B`}</div>
                        </>
                    )}
                    </div>
                </ContextMenu>
                ))}
            </div>
            </ContextMenu>
        )}

        <div className={style[bem.e('statusbar')]}>
          <span>{items.length} 个项目</span>
          <span style={{ marginLeft: 'auto' }}>
            {selectedId ? '已选中 1 个项目' : ''}
          </span>
        </div>
      </div>


      <InteractiveAwakening
        visible={awakeningVisible}
        type="file"
        title={`打开 - ${targetFileForOpen?.name || ''}`}
        description="选择一个程序来运行该文件"
        interactInfo={{
          openType: 'wr',
          mode,
          ...targetFileForOpen
        }}
        onClose={() => {
          setAwakeningVisible(false);
          setTargetFileForOpen(null);
        }}
      />

      <ExChange
        visible={exchangeVisible}
        onClose={() => setExchangeVisible(false)}
      />

      <Drawer
        open={!!moveItem}
        onClose={closeMoveDialog}
        side="bottom"
        size="min(460px, 78%)"
        label="移动到…"
        showCloseButton
      >
        <DrawerHeader>
          <DrawerTitle>移动到…</DrawerTitle>
          <DrawerDescription>
            {moveItem ? `正在移动：${moveItem.name}` : ''}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className={style[bem.e('move-path')]}>
            {movePath.map((p, i) => (
              <React.Fragment key={p.id}>
                <span
                  className={style[bem.e('crumb')]}
                  onClick={() => {
                    if (i === movePath.length - 1) return;
                    const next = movePath.slice(0, i + 1);
                    setMovePath(next);
                    loadMoveDir(p.id);
                  }}
                >
                  {p.name}
                </span>
                {i < movePath.length - 1 && <span className={style[bem.e('crumb-sep')]}>/</span>}
              </React.Fragment>
            ))}
          </div>

          {movePath.length > 1 && (
            <div className={style[bem.e('move-row')]} onClick={backMoveDir}>
              <UpIcon size={18} />
              <span>返回上一级</span>
            </div>
          )}

          {moveLoading ? (
            <div className={style[bem.e('move-empty')]}>读取中…</div>
          ) : moveItems.length === 0 ? (
            <div className={style[bem.e('move-empty')]}>此目录下没有子文件夹</div>
          ) : moveItems.map(dir => {
            const blocked = isBlockedTarget(dir.id);
            return (
              <div
                key={dir.id}
                className={[style[bem.e('move-row')], blocked ? style[bem.is('blocked', true)] : ''].filter(Boolean).join(' ')}
                onClick={() => { if (!blocked) enterMoveDir(dir); }}
              >
                <FolderIcon size={18} style={{ color: '#FFCA28', fill: '#fef3c7', flexShrink: 0 }} />
                <span>{dir.name}</span>
                {blocked && <span className={style[bem.e('move-blocked-tag')]}>不可选</span>}
                <ChevronRightIcon size={16} style={{ marginLeft: 'auto', color: '#c0c4cc' }} />
              </div>
            );
          })}
        </DrawerBody>
        <DrawerFooter>
          <Button onClick={submitMove} disabled={moveBusy || !moveItem}>
            <MoveIcon size={16} />
            {moveBusy ? '移动中…' : '移动到此处'}
          </Button>
        </DrawerFooter>
      </Drawer>

      {isMobile && (
        <Drawer open={navOpen} onClose={() => setNavOpen(false)} label="文件导航">
          <Sidebar
            mode={mode}
            setMode={(next) => {
              setMode(next);
              setNavOpen(false);
            }}
          />
        </Drawer>
      )}
    </div>

  );
};

export default React.memo(FileSystem);
