import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import ComputerIcon from '@mui/icons-material/Computer';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { FileType } from "@/sukinos/utils/config";
import { alert } from '@/component/alert/layout'
import { confirm } from '@/component/confirm/layout';
import ContextMenu from '@/component/contextMenu/layout.jsx';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const bem = createNamespace('explorer');

// 把 files 的相对路径 key 构建成树
const buildTree = (files) => {
  const root = { name: '', type: 'folder', children: [], path: '' };
  const dirMap = { '': root };
  for (const key of Object.keys(files)) {
    const parts = key.split('/');
    let node = root;
    let curPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      curPath = curPath ? `${curPath}/${parts[i]}` : parts[i];
      if (!dirMap[curPath]) {
        const dir = { name: parts[i], type: 'dir', children: [], path: curPath };
        dirMap[curPath] = dir;
        node.children.push(dir);
      }
      node = dirMap[curPath];
    }
    const leafName = parts[parts.length - 1];
    // 值为空字符串的 key 视为空文件夹（占位），否则视为文件
    const isDir = files[key] === '';
    if (isDir) {
      if (!dirMap[key]) {
        const dir = { name: leafName, type: 'dir', children: [], path: key };
        dirMap[key] = dir;
        node.children.push(dir);
      }
    } else {
      node.children.push({ name: leafName, type: 'file', path: key });
    }
  }
  return root;
};

// 递归收集某路径下所有文件 key（用于拖拽排序重建 files）
const collectKeys = (node) => {
  const keys = [];
  for (const child of node.children) {
    if (child.type === 'file') keys.push(child.path);
    else keys.push(...collectKeys(child));
  }
  return keys;
};

function TreeNode({ node, depth, expanded, onToggleExpand, activeFile, setActiveFile, unsavedFiles, onDelete, onAdd, onRename }) {
  const isDir = node.type === 'dir';
  const isExpanded = expanded.has(node.path);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.path });
  const dragStyle = { transform: CSS.Transform.toString(transform), transition };

  const fileMenu = [
    { id: 'open', label: '打开', onClick: () => setActiveFile(node.path) },
    { type: 'divider' },
    { id: 'rename', label: '重命名', onClick: () => onRename(node) },
    { type: 'divider' },
    { id: 'delete', label: '删除', danger: true, func: { isNext: true, confirm: { title: '确认删除', content: `确定删除 ${node.path} 吗？`, onConfirm: () => onDelete(node) } } }
  ];

  const dirMenu = [
    { id: 'expand', label: isExpanded ? '收起' : '展开', onClick: () => onToggleExpand(node.path) },
    { id: 'new-file', label: '新建文件', onClick: () => onAdd(node.path, 'file') },
    { id: 'new-dir', label: '新建文件夹', onClick: () => onAdd(node.path, 'dir') },
    { type: 'divider' },
    { id: 'rename', label: '重命名', onClick: () => onRename(node) },
    { type: 'divider' },
    { id: 'delete', label: '删除', danger: true, func: { isNext: true, confirm: { title: '确认删除', content: `确定删除文件夹 ${node.path} 吗？`, onConfirm: () => onDelete(node) } } }
  ];

  return (
    <div ref={setNodeRef} style={dragStyle} className={isDragging ? style[bem.e('node-dragging')] : ''}>
      <ContextMenu menuItems={isDir ? dirMenu : fileMenu} metaInfo={node}>
        <div
          className={[style[bem.e('node')], style[bem.is('active', activeFile === node.path)], style[bem.is('dir', isDir)]].join(' ')}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => isDir ? onToggleExpand(node.path) : setActiveFile(node.path)}
        >
          <span className={style[bem.e('arrow')]} onClick={(e) => { e.stopPropagation(); onToggleExpand(node.path); }}>
            {isDir ? (isExpanded ? <ExpandMoreIcon style={{ fontSize: 16 }} /> : <ChevronRightIcon style={{ fontSize: 16 }} />) : <span className={style[bem.e('arrow-spacer')]} />}
          </span>
          {isDir ? <FolderIcon style={{ fontSize: 16, color: '#f59e0b' }} /> : <DescriptionIcon style={{ fontSize: 16 }} />}
          <span className={style[bem.e('node-text')]}>{node.name}</span>
          {unsavedFiles.has(node.path) && <span className={style[bem.e('unsaved-dot')]}></span>}
          <span className={style[bem.e('drag-handle')]} {...attributes} {...listeners}><DragIndicatorIcon style={{ fontSize: 14 }} /></span>
        </div>
      </ContextMenu>
      {isDir && isExpanded && (
        <SortableContext items={node.children.map(c => c.path)} strategy={verticalListSortingStrategy}>
          {node.children.map(child => (
            <TreeNode key={child.path} node={child} depth={depth + 1} expanded={expanded} onToggleExpand={onToggleExpand} activeFile={activeFile} setActiveFile={setActiveFile} unsavedFiles={unsavedFiles} onDelete={onDelete} onAdd={onAdd} onRename={onRename} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

function Explorer({
  files, setFiles, activeFile, setActiveFile, isMapped, unsavedFiles, triggerVfsSave,
  physicalFiles, setPhysicalFiles,
  vfs, workspaceDirId, setWorkspaceDirId, workspacePathStr, setWorkspacePathStr,
  isAutoSave, setIsAutoSave, showWorkspaceModal, setShowWorkspaceModal, showImportModal, setShowImportModal,
  loadWorkspaceFiles, fsMode, setFsMode, setIsMapped
}) {
  const [expanded, setExpanded] = useState(() => new Set(['']));

  const tree = useMemo(() => buildTree(files), [files]);

  const onToggleExpand = useCallback((path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const handleAddFile = (parentPath = '', type = 'file') => {
    const isDir = type === 'dir';
    confirm.show({
      title: isDir ? '新建文件夹' : '新建组件',
      content: isDir ? '请输入文件夹名称：' : '请输入文件名称（支持 .jsx / .js，未填后缀默认 .jsx）：',
      showInput: true,
      inputPlaceholder: isDir ? 'NewFolder' : 'Page.jsx',
      onConfirm: (name) => {
        if (!name) return;
        const trimmed = name.trim();
        if (isDir) {
          const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
          if (files[fullPath]) { alert.warning('已存在'); return; }
          // 文件夹用空字符串占位，buildTree 会将其识别为目录
          setFiles(prev => ({ ...prev, [fullPath]: '' }));
          return;
        }
        const fileName = /\.(jsx|js)$/i.test(trimmed) ? trimmed : `${trimmed}.jsx`;
        const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName;
        if (fullPath.toLowerCase() === 'logic.jsx' || fullPath.toLowerCase() === 'logic.js') { alert.warning('保留字'); return; }
        if (files[fullPath]) { alert.warning('已存在'); return; }
        const initialCode = `export default ({ state, dispatch }) => <div>New Page: ${fileName}</div>`;
        setFiles(prev => ({ ...prev, [fullPath]: initialCode }));
        setActiveFile(fullPath);
        triggerVfsSave(fullPath, initialCode, true);
      }
    });
  };

  const handleDelete = (node) => {
    if (node.path === 'layout.jsx') return;
    let shouldDeleteSource = false;
    const CustomConfirmContent = () => (
      <div>
        <p>移除 <strong>{node.path}</strong> 映射？</p>
        <label><input type="checkbox" onChange={(e) => { shouldDeleteSource = e.target.checked; }} /> 同时删除物理介质文件</label>
      </div>
    );
    confirm.show({
      title: '移除文件',
      children: <CustomConfirmContent />,
      onConfirm: async () => {
        // 收集该节点及其子目录下的所有文件 key
        const affectedKeys = Object.keys(files).filter(k => k === node.path || k.startsWith(node.path + '/'));
        if (shouldDeleteSource) {
          for (const k of affectedKeys) {
            const target = physicalFiles.get(k.toLowerCase());
            if (target) await vfs.operation.handleDelete({ id: target.id, name: target.name, parentId: target.parentId || workspaceDirId });
          }
        }
        const newFiles = { ...files };
        for (const k of affectedKeys) delete newFiles[k];
        setFiles(newFiles);
        if (activeFile === node.path || activeFile.startsWith(node.path + '/')) setActiveFile('layout.jsx');
      }
    });
  };

  const handleRename = (node) => {
    confirm.show({
      title: '重命名',
      content: '请输入新名称：',
      showInput: true,
      inputDefaultValue: node.name,
      onConfirm: (newName) => {
        if (!newName || newName === node.name) return;
        const parentPath = node.path.includes('/') ? node.path.split('/').slice(0, -1).join('/') : '';
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;
        if (files[newPath]) { alert.warning('已存在'); return; }
        const newFiles = { ...files };
        if (node.type === 'dir') {
          // 文件夹：递归重命名其下所有文件路径（含空文件夹占位本身）
          for (const k of Object.keys(files)) {
            if (k === node.path || k.startsWith(node.path + '/')) {
              newFiles[k.replace(node.path, newPath)] = files[k];
              delete newFiles[k];
            }
          }
        } else {
          newFiles[newPath] = files[node.path];
          delete newFiles[node.path];
        }
        setFiles(newFiles);
        if (activeFile === node.path || activeFile.startsWith(node.path + '/')) setActiveFile(activeFile.replace(node.path, newPath));
        // 物理重命名
        const target = physicalFiles.get(node.path.toLowerCase());
        if (target) vfs.operation.handleRename({ id: target.id, newName, parentId: target.parentId || workspaceDirId });
      }
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // 仅对文件排序（文件夹是动态派生的，不参与 files 顺序）
    if (!files[active.id] || !files[over.id]) return;
    const activeParent = active.id.includes('/') ? active.id.split('/').slice(0, -1).join('/') : '';
    const overParent = over.id.includes('/') ? over.id.split('/').slice(0, -1).join('/') : '';
    if (activeParent !== overParent) return;
    const keys = Object.keys(files);
    const siblings = keys.filter(k => {
      const p = k.includes('/') ? k.split('/').slice(0, -1).join('/') : '';
      return p === activeParent;
    });
    const oldIndex = siblings.indexOf(active.id);
    const newIndex = siblings.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const newSiblings = arrayMove(siblings, oldIndex, newIndex);
    const newFiles = {};
    for (const k of newSiblings) newFiles[k] = files[k];
    for (const k of keys) if (!newSiblings.includes(k)) newFiles[k] = files[k];
    setFiles(newFiles);
  };

  const handleToggleFsMode = () => {
    const targetMode = fsMode === 'virtual' ? 'local' : 'virtual';
    confirm.show({
      title: '切换存储',
      content: `确定切换至 ${targetMode === 'local' ? '本地模式' : '虚拟模式'}？这会重置当前开发工作区内容。`,
      onConfirm: () => { setFsMode(targetMode); alert.success(`已切换: ${targetMode}`); }
    });
  };

  const openWorkspaceModal = () => { vfs.navigation.loadDir(workspaceDirId); setShowWorkspaceModal(true); };

  // 确认按钮逻辑
  const confirmWorkspace = async () => {
    const targetDirId = vfs.state.currentId;
    if (!targetDirId) return;

    // 先保存持久化记忆
    localStorage.setItem(`dev_center_workspace_dir_${fsMode}`, targetDirId);

    // 更新目录 ID。
    // 由于 Developer 中的重置 Effect 现在只看 fsMode，
    // 所以这一步不会误触发 setFiles({}) 和 setIsMapped(false)。
    setWorkspaceDirId(targetDirId);
    setWorkspacePathStr(vfs.state.breadcrumbs.map(b => b.name === 'root' ? '' : b.name).join('/') || '/');

    // 最后明确开启映射标记。
    // 这将触发 Developer 的 items 监听器，开始准时解析新目录下的文件。
    setIsMapped(true);
    setShowWorkspaceModal(false);
    alert.success("映射成功");
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <span className={style[bem.e('title')]}>资源管理器</span>
        <div className={style[bem.e('actions')]}>
          <button className={style[bem.e('icon-btn')]} onClick={handleToggleFsMode} title={fsMode === 'local' ? '本地模式' : '虚拟模式'}>
            {fsMode === 'local' ? <ComputerIcon style={{ fontSize: 16, color: 'var(--su-primary)' }} /> : <SyncIcon style={{ fontSize: 16 }} />}
          </button>
        </div>
      </div>

      {!isMapped ? (
        <div className={style[bem.e('unmapped-state')]}>
          <FolderOpenIcon style={{ fontSize: 48, color: 'var(--su-gray-300)', marginBottom: 8 }} />
          <button className={style[bem.e('modal-action-btn')]} onClick={openWorkspaceModal} style={{ margin: '0 auto' }}>
            {fsMode === 'local' ? '选择本地目录' : '选择工作区目录'}
          </button>
        </div>
      ) : (
        <>
          <div className={style[bem.e('mapping')]}>
            <div className={style[bem.e('mapping-header')]}>
              <span style={{ fontSize: '10px' }}>WORKSPACE ({fsMode.toUpperCase()})</span>
              <div className={style[bem.e('actions')]}>
                <button className={style[bem.e('icon-btn')]} onClick={openWorkspaceModal} title="重选"><SettingsIcon fontSize="small" /></button>
                 {/* <button className={style[bem.e('icon-btn')]} onClick={() => setShowImportModal(true)} title="导入"><FileDownloadIcon fontSize="small" /></button> */}
                 <button className={style[bem.e('icon-btn')]} onClick={handleAddFile} title="新建"><AddIcon fontSize="small" /></button>
              </div>
            </div>
            <div className={style[bem.e('mapping-body')]}>
              <div className={style[bem.e('mapping-info')]} title={workspacePathStr}>
                <FolderOpenIcon style={{ fontSize: 16, color: '#f59e0b' }} />
                <span className={style[bem.e('mapping-path-text')]}>{workspacePathStr}</span>
              </div>
              <label className={style[bem.e('mapping-toggle')]}>
                <input type="checkbox" checked={isAutoSave} onChange={e => setIsAutoSave(e.target.checked)} />
                <SyncIcon style={{ fontSize: 14, color: isAutoSave ? 'var(--su-primary)' : 'var(--su-gray-400)' }} />
                实时自动保存
              </label>
            </div>
          </div>
          <div className={style[bem.e('file-list')]}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tree.children.map(c => c.path)} strategy={verticalListSortingStrategy}>
                {tree.children.map(child => (
                  <TreeNode key={child.path} node={child} depth={0} expanded={expanded} onToggleExpand={onToggleExpand} activeFile={activeFile} setActiveFile={setActiveFile} unsavedFiles={unsavedFiles} onDelete={handleDelete} onAdd={handleAddFile} onRename={handleRename} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </>
      )}

      {showWorkspaceModal && (
        <div className={style[bem.e('modal-overlay')]} onClick={() => setShowWorkspaceModal(false)}>
          <div className={style[bem.e('modal')]} onClick={e => e.stopPropagation()}>
            <div className={style[bem.e('modal-header')]}>
              <span className={style[bem.e('modal-title')]}>选择工作区目录</span>
              <button className={style[bem.e('modal-close')]} onClick={() => setShowWorkspaceModal(false)}><CloseIcon fontSize="small" /></button>
            </div>
            <div className={style[bem.e('modal-toolbar')]}>
              <button className={style[bem.e('modal-action-btn')]} onClick={vfs.navigation.handleBack} disabled={vfs.state.history.length <= 1}><ArrowBackIcon style={{ fontSize: 14 }} /> 返回</button>
              <div className={style[bem.e('modal-path-container')]}>
                <span className={style[bem.e('modal-path')]}>{vfs.state.breadcrumbs.map(b => b.name === 'root' ? '' : b.name).join(' / ') || '/'}</span>
              </div>
            </div>
            <div className={style[bem.e('modal-body')]}>
              {vfs.state.items.filter(i => i.type === FileType.DIRECTORY).map(item => (
                <div key={item.id} className={style[bem.e('fs-item')]} onClick={() => vfs.navigation.loadDir(item.id)}>
                  <FolderIcon style={{ fontSize: 18, color: '#f59e0b' }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
            <div className={style[bem.e('modal-footer')]}>
              <button className={style[bem.e('btn-confirm')]} onClick={confirmWorkspace}>确认关联此目录</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Explorer;
