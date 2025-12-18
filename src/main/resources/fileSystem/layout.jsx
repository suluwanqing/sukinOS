import React, { useState, useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import fs, { FileType } from '@/utils/file/fileKernel';
import { alert } from "@/component/alert/layout";
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
import processKernel from "@/utils/process/kernel";
import BoardSelection from "@/component/select/boardSelection/layout";

const bem = createNamespace('file-system');

const FileSystem = ({ app }) => {
  // --- 核心状态 ---
  const [currentId, setCurrentId] = useState('root');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState(['root']); // 历史记录栈
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // --- UI 状态 ---
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedId, setSelectedId] = useState(null);

  // 重命名状态
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // --- 应用选择状态 (新增) ---
  const [appSelectorVisible, setAppSelectorVisible] = useState(false);
  const [availableApps, setAvailableApps] = useState([]);
  const [targetFileForOpen, setTargetFileForOpen] = useState(null);

  // 初始化文件系统
  useEffect(() => {
    const bootFS = async () => {
      const ok = await fs.boot();
      if (ok) {
        setIsReady(true);
        loadDir('root');
      } else {
        alert.failure("文件系统启动失败");
      }
    };
    bootFS();
  }, []);

  // 监听文件系统变动
  useEffect(() => {
    if (!isReady) return;
    const unsub = fs.watch(() => {
      // 任何变动都刷新当前视图
      loadDir(currentId, false);
    });
    return () => unsub();
  }, [isReady, currentId]);

  // 加载目录逻辑
  const loadDir = (id, pushHistory = true) => {
    const list = fs.readdir(id);
    const path = fs.getPath(id);
    setItems(list);
    setBreadcrumbs(path);
    setCurrentId(id);
    setSelectedId(null);

    // 更新历史记录
    if (pushHistory && id !== history[history.length - 1]) {
      setHistory(prev => [...prev, id]);
    }
  };

  // 后退逻辑
  const handleBack = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // 移除当前
    const prevId = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    loadDir(prevId, false);
  };

  // 创建文件/文件夹逻辑
  const handleCreate = async (type) => {
    const baseName = type === FileType.DIRECTORY ? '新建文件夹' : '新建文件';
    let name = baseName;
    let counter = 1;
    // 简单的自动重名检查
    while (items.some(i => i.name === name)) {
      name = `${baseName} (${counter++})`;
    }
    try {
      let newItem;
      if (type === FileType.DIRECTORY) {
        newItem = await fs.mkdir(currentId, name);
      } else {
        newItem = await fs.writeFile(currentId, name, '');
      }
      loadDir(currentId, false);
      // 创建成功后自动进入重命名模式
      setRenamingId(newItem.id);
      setRenameValue(name);
    } catch (e) {
      alert.warning(e.message);
    }
  };

  // 点击选中
  const handleItemClick = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    setRenamingId(null); // 如果正在重命名别的，点击这个取消
  };

  // 双击打开
  const handleItemDbClick = (item) => {
    if (item.type === FileType.DIRECTORY) {
      loadDir(item.id);
    } else {
      // 获取支持 'editor' 类型的应用列表
      const apps = processKernel.getTypeApps('editor');
      console.log(apps)
      // 格式化数据以适配 BoardSelection 组件
      const formattedApps = apps.map(app => ({
        id: app.pid, // 使用 pid 作为 key
        label: app.name || app.appName || 'Unknown App',
        icon: app.metaInfo?.icon ? (
          <img
            src={app.metaInfo.icon}
            alt="icon"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : null,
      }));

      // 设置状态唤起弹窗
      setAvailableApps(formattedApps);
      setTargetFileForOpen(item);
      setAppSelectorVisible(true);
    }
  };

  //唤起应用
  const handleAppSelect = (selectedOption) => {
    if (!selectedOption || !targetFileForOpen) return;

    const { id: pid } = selectedOption; // 这里的 id 就是 pid

    // 调用 processKernel 唤起应用
    // 关键：payload 中包含 openType: 'wr'
    processKernel.evokeApp({
      pid,
      from: "system",
      interactInfo: {
        fileId: targetFileForOpen.id,
        openType: 'wr' // 读写模式打开
      }
    });

    // 关闭选择器并重置
    setAppSelectorVisible(false);
    setTargetFileForOpen(null);
  };

  // 提交重命名
  const submitRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await fs.rename(renamingId, renameValue);
      setRenamingId(null);
      loadDir(currentId, false);
    } catch (e) {
      alert.warning(`重命名失败: ${e.message}`);
      setRenamingId(null);
    }
  };


  //  针对单个文件/文件夹的菜单
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
            await fs.unlink(item.id);
            loadDir(currentId, false);
          },
          onCancel: () => console.log('取消删除')
        }
      }
    }
  ];

  //  针对背景空白处的菜单
  const bgMenuItems = [
    {
      id: 'new_folder',
      label: '新建文件夹',
      onClick: () => handleCreate(FileType.DIRECTORY)
    },
    {
      id: 'new_file',
      label: '新建文件',
      onClick: () => handleCreate(FileType.FILE)
    },
    {
      type: 'divider'
    },
    {
      id: 'refresh',
      label: '刷新',
      onClick: () => loadDir(currentId, false)
    }
  ];

  if (!isReady) return <div className={style[bem.e('loading')]}>加载中...</div>;

  return (
    <div className={style[bem.b()]}>
      {/* 左侧侧边栏 */}
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('sidebar-group')]}>
          <div className={style[bem.e('sidebar-title')]}>文件管理</div>
          <div
            className={[style[bem.e('sidebar-item')],style[bem.is('active', currentId === 'root')]].join(' ')}
            onClick={() => loadDir('root')}
          >
            <HomeIcon fontSize="small" /> <span>根目录</span>
          </div>
          <div className={style[bem.e('sidebar-item')]}>
            <ComputerIcon fontSize="small" /> <span>此电脑</span>
          </div>
        </div>
      </div>

      {/* 右侧主区域 */}
      <div className={style[bem.e('main')]}>
        {/* 顶部工具栏 */}
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('nav-controls')]}>
            <button className={style[bem.e('icon-btn')]} onClick={handleBack} disabled={history.length <= 1}>
              <ArrowBackIcon fontSize="small" />
            </button>
            <button className={style[bem.e('icon-btn')]} onClick={() => loadDir(currentId, false)}>
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
            <button className={style[bem.e('icon-btn')]} onClick={() => handleCreate(FileType.DIRECTORY)} title="新建文件夹">
              <CreateNewFolderIcon fontSize="small" />
            </button>
            <button className={style[bem.e('icon-btn')]} onClick={() => handleCreate(FileType.FILE)} title="新建文件">
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

        {/* 内容区域：包裹背景右键菜单 */}
        <ContextMenu menuItems={bgMenuItems} metaInfo={{ currentId }}>
          <div className={`${style[bem.e('content')]} ${style[bem.em('content', viewMode)]}`}>
            {items.length === 0 && <div className={style[bem.e('empty')]}>此文件夹为空</div>}

            {items.map(item => (
              // 包裹每一个文件的右键菜单
              <ContextMenu key={item.id} menuItems={itemMenuItems} metaInfo={item}>
                <div
                  className={[style[bem.e('item')],style[bem.is('selected', selectedId === item.id)]].join(' ')}
                  onClick={(e) => handleItemClick(e, item.id)}
                  onDoubleClick={() => handleItemDbClick(item)}
                >
                  {/* 文件图标 */}
                  <div className={style[bem.e('item-icon')]}>
                    {item.type === FileType.DIRECTORY
                      ? <FolderIcon style={{ color: '#FFCA28', fontSize: viewMode === 'grid' ? 50 : 24 }} />
                      : <InsertDriveFileIcon style={{ color: '#90CAF9', fontSize: viewMode === 'grid' ? 50 : 24 }} />
                    }
                  </div>

                  {/* 文件名 (显示或输入框) */}
                  <div className={style[bem.e('item-name')]}>
                    {renamingId === item.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={submitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                    ) : (
                      <span>{item.name}</span>
                    )}
                  </div>

                  {/* 列表模式下的额外详情 */}
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

        {/* 底部状态栏 */}
        <div className={style[bem.e('statusbar')]}>
          <span>{items.length} 个项目</span>
          <span style={{ marginLeft: 'auto' }}>
            {selectedId ? '已选中 1 个项目' : ''}
          </span>
        </div>
      </div>

      {/* 选择打开应用的弹窗 */}
      <BoardSelection
        visible={appSelectorVisible}
        title={`打开 ${targetFileForOpen?.name || '文件'}`}
        options={availableApps}
        onSelect={handleAppSelect}
        onClose={() => setAppSelectorVisible(false)}
      />
    </div>
  );
};

export default React.memo(FileSystem);
