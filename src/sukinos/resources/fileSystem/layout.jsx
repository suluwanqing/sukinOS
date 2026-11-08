import React, { useState, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { FileType} from "@/sukinos/utils/config"
import ContextMenu from "@/component/contextMenu/layout";
import Drawer from '@/component/drawer/layout';
import { Button } from '@/component/button/layout';
import { Input } from '@/component/input/layout';
import { useViewportMode } from '@/sukinos/hooks/useViewportMode';
import { Folder as FolderIcon, File as InsertDriveFileIcon, ArrowLeft as ArrowBackIcon, RefreshCw as RefreshIcon, LayoutGrid as GridViewIcon, List as FormatListBulletedIcon, FolderPlus as CreateNewFolderIcon, FilePlus as NoteAddIcon, Home as HomeIcon, Monitor as ComputerIcon, ArrowLeftRight as SwapHorizIcon, Menu as MenuIcon } from 'lucide-react';
import {useSystemFileSystem} from '@/sukinos/hooks/useFileSystem';
import ExChange from "./exchange/layout";
import InteractiveAwakening from '@/sukinos/middleware/InteractiveAwakening/main';
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
    state: { currentId, items, history, breadcrumbs, isReady },
    navigation: { loadDir, handleBack, handleRefresh },
    operation: { handleCreate, handleRename, handleDelete, handleExportFile }
  } = useSystemFileSystem(mode);

  const [viewMode, setViewMode] = useState('grid');
  const [selectedId, setSelectedId] = useState(null);

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // 唤醒组件控制状态与载荷
  const [awakeningVisible, setAwakeningVisible] = useState(false);
  const [targetFileForOpen, setTargetFileForOpen] = useState(null);

  const [exchangeVisible, setExchangeVisible] = useState(false);

  const onCreate = async (type) => {
    const newItem = await handleCreate({type});
    if (newItem) {
        setRenamingId(newItem.id);
        setRenameValue(newItem.name);
    }
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
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await handleRename({...item,newName:renameValue,parentId:item.parentId });
    setRenamingId(null);
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
      onClick: (item) => {
        setRenamingId(item.id);
        setRenameValue(item.name);
      }
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
  },[mode])

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
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => submitRename(item)}
                            onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename(item);
                            if (e.key === 'Escape') setRenamingId(null);
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
