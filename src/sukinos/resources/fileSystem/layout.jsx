import React, { useState, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { FileType} from "@/sukinos/utils/config"
import ContextMenu from "@/component/contextMenu/layout.jsx";
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import GridViewIcon from '@mui/icons-material/GridView';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import HomeIcon from '@mui/icons-material/Home';
import ComputerIcon from '@mui/icons-material/Computer';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import processKernel from "@/sukinos/utils/process/kernel";
import BoardSelection from "@/component/select/boardSelection/layout";
import useFileSystem from '@/sukinos/hooks/useFileSystem';
import ExChange from "./exchange/layout";

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
          <HomeIcon fontSize="small" /> <span>虚拟盘</span>
        </div>
        <div
          className={[style[bem.e('sidebar-item')], style[bem.is('active', mode === 'local')]].join(' ')}
          onClick={() => setMode('local')}
        >
          <ComputerIcon fontSize="small" /> <span>此电脑</span>
        </div>
        <div
          className={[style[bem.e('sidebar-item')], style[bem.is('active', mode === 'remote')]].join(' ')}
          onClick={() => setMode('remote')}
        >
          <ComputerIcon fontSize="small" /> <span>云端</span>
        </div>
      </div>
    </div>
  );
});

const FileSystem = ({ app }) => {
  const [mode,setMode]=useState('virtual')
  const {
    state: { currentId, items, history, breadcrumbs, isReady },
    navigation: { loadDir, handleBack, handleRefresh },
    operation: { handleCreate, handleRename, handleDelete }
  } = useFileSystem(mode);

  const [viewMode, setViewMode] = useState('grid');
  const [selectedId, setSelectedId] = useState(null);

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [appSelectorVisible, setAppSelectorVisible] = useState(false);
  const [availableApps, setAvailableApps] = useState([]);
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

  const handleItemDbClick = (item) => {
    if (item.type === FileType.DIRECTORY) {
      loadDir(item.id);
      setSelectedId(null);
    } else {
      const apps = processKernel.getTypeApps('editor');
      const formattedApps = apps.map(app => ({
        id: app.pid,
        label: app.name || app.appName || 'Unknown App',
        icon: app.metaInfo?.icon ? (
          <img
            src={app.metaInfo.icon}
            alt="icon"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : null,
      }));

      setAvailableApps(formattedApps);
      setTargetFileForOpen(item);
      setAppSelectorVisible(true);
    }
  };

  const handleAppSelect = (selectedOption) => {
    if (!selectedOption || !targetFileForOpen) return;

    const { id: pid } = selectedOption;

    processKernel.evokeApp({
      pid,
      from: "system",
      interactInfo: {
        openType: 'wr',
        mode,
        ...targetFileForOpen,
      }
    });

    setAppSelectorVisible(false);
    setTargetFileForOpen(null);
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

  const virtualItemMenuItems = [
    {
      type: 'divider'
    },
    {
      id: 'export',
      label: '导出',
      onClick: (item) => {
        setRenamingId(item.id);
        setRenameValue(item.name);
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
      <Sidebar mode={mode} setMode={setMode} />
      <div className={style[bem.e('main')]}>
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('nav-controls')]}>
            <button className={style[bem.e('icon-btn')]} onClick={handleBack} disabled={history.length <= 1}>
              <ArrowBackIcon fontSize="small" />
            </button>
            <button className={style[bem.e('icon-btn')]} onClick={handleRefresh}>
              <RefreshIcon fontSize="small" />
            </button>
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

            <button className={style[bem.e('icon-btn')]} onClick={() => setExchangeVisible(true)} title="文件交换/传输">
              <SwapHorizIcon fontSize="small" />
            </button>
            <div className={style[bem.e('divider')]}></div>

            <button className={style[bem.e('icon-btn')]} onClick={() => onCreate(FileType.DIRECTORY)} title="新建文件夹">
              <CreateNewFolderIcon fontSize="small" />
            </button>
            <button className={style[bem.e('icon-btn')]} onClick={() => onCreate(FileType.FILE )} title="新建文件">
              <NoteAddIcon fontSize="small" />
            </button>
            <div className={style[bem.e('divider')]}></div>
            <button
              className={[style[bem.e('icon-btn')],style[bem.is('active', viewMode === 'grid')]].join(' ')}
              onClick={() => setViewMode('grid')}
            >
              <GridViewIcon fontSize="small" />
            </button>
            <button
              className={[style[bem.e('icon-btn')],style[bem.is('active', viewMode === 'list')]].join(' ')}
              onClick={() => setViewMode('list')}
            >
              <FormatListBulletedIcon fontSize="small" />
            </button>
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
                    onClick={(e) => handleItemClick(e, item.id)}
                    onDoubleClick={() => handleItemDbClick(item)}
                    >
                    <div className={style[bem.e('item-icon')]}>
                        {item.type === FileType.DIRECTORY
                        ? <FolderIcon style={{ color: '#FFCA28', fontSize: viewMode === 'grid' ? 50 : 24, width: viewMode === 'grid' ? 50 : 24, height: viewMode === 'grid' ? 50 : 24, flexShrink: 0 }} />
                        : <InsertDriveFileIcon style={{ color: '#90CAF9', fontSize: viewMode === 'grid' ? 50 : 24, width: viewMode === 'grid' ? 50 : 24, height: viewMode === 'grid' ? 50 : 24, flexShrink: 0 }} />
                        }
                    </div>

                    <div className={style[bem.e('item-name')]}>
                        {renamingId === item.id ? (
                        <input
                            type="text"
                            value={renameValue}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={()=>submitRename(item)}
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

      <BoardSelection
        visible={appSelectorVisible}
        title={`打开 ${targetFileForOpen?.name || '文件'}`}
        options={availableApps}
        onSelect={handleAppSelect}
        onClose={() => setAppSelectorVisible(false)}
      />
      <ExChange
        visible={exchangeVisible}
        onClose={() => setExchangeVisible(false)}
      />
    </div>

  );
};

export default React.memo(FileSystem);
