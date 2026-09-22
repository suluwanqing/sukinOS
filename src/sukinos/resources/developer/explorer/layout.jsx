import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
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
import { DndContext, PointerSensor, closestCenter, pointerWithin, DragOverlay, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
    // 值为 null 的 key 视为文件夹（占位），否则视为文件（空文件内容是 ''）
    const isDir = files[key] === null;
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

// 取相对路径的父目录（根级返回 ''）
const parentOf = (p) => p.includes('/') ? p.split('/').slice(0, -1).join('/') : '';

function TreeNode({ node, depth, expanded, onToggleExpand, activeFile, setActiveFile, unsavedFiles, onDelete, onAdd, onRename, dropHint, isEntry }) {
  const isDir = node.type === 'dir';
  const isExpanded = expanded.has(node.path);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.path });
  // 拖动项本身不加 transform：由 DragOverlay 承担跟随指针的图像，原行留在原位作为占位
  const dragStyle = isDragging ? { transition } : { transform: CSS.Transform.toString(transform), transition };
  const indent = 8 + depth * 14;
  const hint = dropHint && dropHint.id === node.path ? dropHint.position : null;

  const fileMenu = [
    { id: 'open', label: '打开', onClick: () => setActiveFile(node.path) },
    { type: 'divider' },
    { id: 'rename', label: '重命名', onClick: () => onRename(node) },
    // 入口文件按配置命中，删除会让应用失去状态机/视图入口，故不提供删除项
    ...(isEntry ? [] : [
      { type: 'divider' },
      { id: 'delete', label: '删除', danger: true, func: { isNext: true, confirm: { title: '确认删除', content: `确定删除 ${node.path} 吗？`, onConfirm: () => onDelete(node) } } }
    ])
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

  const rowClass = [
    style[bem.e('node')],
    style[bem.is('active', activeFile === node.path)],
    style[bem.is('dir', isDir)],
    isDragging ? style[bem.e('node-dragging')] : '',
    hint === 'into' ? style[bem.e('node-drop-into')] : ''
  ].filter(Boolean).join(' ');

  return (
    <div ref={setNodeRef} style={dragStyle} className={style[bem.e('node-row')]}>
      {hint === 'before' && <div className={style[bem.e('drop-line')]} style={{ top: -1, left: indent }} />}
      <ContextMenu menuItems={isDir ? dirMenu : fileMenu} metaInfo={node}>
        <div
          className={rowClass}
          style={{ paddingLeft: indent }}
          onClick={() => isDir ? onToggleExpand(node.path) : setActiveFile(node.path)}
          {...attributes}
          {...listeners}
        >
          <span className={style[bem.e('arrow')]} onClick={(e) => { e.stopPropagation(); onToggleExpand(node.path); }}>
            {isDir ? (isExpanded ? <ExpandMoreIcon style={{ fontSize: 16 }} /> : <ChevronRightIcon style={{ fontSize: 16 }} />) : <span className={style[bem.e('arrow-spacer')]} />}
          </span>
          {isDir ? <FolderIcon style={{ fontSize: 16, color: '#f59e0b' }} /> : <DescriptionIcon style={{ fontSize: 16 }} />}
          <span className={style[bem.e('node-text')]}>{node.name}</span>
          {isEntry && <span className={style[bem.e('entry-flag')]}>入口</span>}
          {unsavedFiles.has(node.path) && <span className={style[bem.e('unsaved-dot')]}></span>}
          <span className={style[bem.e('drag-handle')]}><DragIndicatorIcon style={{ fontSize: 14 }} /></span>
        </div>
      </ContextMenu>
      {hint === 'after' && <div className={style[bem.e('drop-line')]} style={{ bottom: -1, left: indent }} />}
    </div>
  );
}

// 拖拽浮动预览：单行小块，避免把整棵子树作为拖拽图像
function DragChip({ path, isDir }) {
  return (
    <div className={style[bem.e('drag-chip')]}>
      {isDir ? <FolderIcon style={{ fontSize: 15, color: '#f59e0b' }} /> : <DescriptionIcon style={{ fontSize: 15 }} />}
      <span className={style[bem.e('drag-chip-text')]}>{path.split('/').pop()}</span>
    </div>
  );
}

function Explorer({
  files, setFiles, activeFile, setActiveFile, isMapped, unsavedFiles, triggerVfsSave,
  physicalFiles, setPhysicalFiles,
  vfs, workspaceDirId, setWorkspaceDirId, workspacePathStr, setWorkspacePathStr,
  isAutoSave, setIsAutoSave, showWorkspaceModal, setShowWorkspaceModal, showImportModal, setShowImportModal,
  loadWorkspaceFiles, fsMode, setFsMode, setIsMapped, runWithWriteLock,
  setUnsavedFiles, cancelPendingSave, entryFiles
}) {
  const [expanded, setExpanded] = useState(() => new Set(['']));
  // 拖拽状态：dragId 用于 DragOverlay 预览，dropHint 用于放置位置提示
  const [dragId, setDragId] = useState(null);
  const [dropHint, setDropHint] = useState(null);
  const dropHintRef = useRef(null);

  const tree = useMemo(() => buildTree(files), [files]);

  // 启动所需入口（主逻辑 / 视图 / 单文件内容）由入口约定解析得出，禁止在文件树里删除
  const entrySet = useMemo(() => new Set(
    [entryFiles?.logicMainFile, entryFiles?.viewFile, entryFiles?.mainFile].filter(Boolean)
  ), [entryFiles]);
  // 删除入口文件后回退到的默认打开文件
  const fallbackFile = entryFiles?.viewFile || entryFiles?.logicMainFile || entryFiles?.mainFile || '';

  // 拍平成单层列表：每个可见节点占一行，droppable 矩形互不重叠
  const flatItems = useMemo(() => {
    const out = [];
    const walk = (children, depth) => {
      for (const child of children) {
        out.push({ node: child, depth });
        if (child.type === 'dir' && expanded.has(child.path)) walk(child.children, depth + 1);
      }
    };
    walk(tree.children, 0);
    return out;
  }, [tree, expanded]);

  // 优先按指针命中，指针不在任何行上时退回最近中心（避免空白处无 over）
  const collisionDetection = useCallback((args) => {
    const within = pointerWithin(args);
    return within.length > 0 ? within : closestCenter(args);
  }, []);

  // 整行可起手拖拽：位移超过 6px 才判定为拖拽，保证单击仍能打开/展开
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onToggleExpand = useCallback((path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  // 展开某路径的所有祖先目录（新建后立即可见）
  const expandTo = useCallback((path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      const parts = path.split('/').slice(0, -1);
      let cur = '';
      for (const p of parts) { cur = cur ? `${cur}/${p}` : p; next.add(cur); }
      return next;
    });
  }, []);

  const handleAddFile = (parentPath = '', type = 'file') => {
    const isDir = type === 'dir';
    confirm.show({
      title: isDir ? '新建文件夹' : '新建文件',
      content: isDir ? '请输入文件夹名称：' : '请输入文件名称（.jsx/.js 将生成组件模板，其他类型原样创建）：',
      showInput: true,
      inputPlaceholder: isDir ? 'NewFolder' : 'Page.jsx',
      onConfirm: (name) => {
        if (!name) return;
        const trimmed = name.trim();
        const fullPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
        if (files[fullPath] !== undefined) { alert.warning('已存在'); return; }
        if (isDir) {
          // 目录用 null 占位，并立即落盘（triggerVfsSave 的 content === null 通路）
          setFiles(prev => ({ ...prev, [fullPath]: null }));
          expandTo(fullPath);
          triggerVfsSave(fullPath, null, true);
          return;
        }
        const isComponent = /\.(jsx|js)$/i.test(trimmed);
        const initialCode = isComponent ? `export default ({ state, dispatch }) => <div>New Page: ${trimmed}</div>` : '';
        setFiles(prev => ({ ...prev, [fullPath]: initialCode }));
        expandTo(fullPath);
        setActiveFile(fullPath);
        triggerVfsSave(fullPath, initialCode, true);
      }
    });
  };

  const handleDelete = (node) => {
    // 入口由配置解析得出：入口文件本身、或包含入口文件的目录都不允许移除
    const blocked = node.type === 'file'
      ? entrySet.has(node.path)
      : [...entrySet].some(p => p === node.path || p.startsWith(node.path + '/'));
    if (blocked) {
      alert.warning('入口文件不可移除，请先在设置里调整入口约定');
      return;
    }
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
        // 取消挂起的自动保存并清理未保存标记，防止已删文件被复活写出
        for (const k of affectedKeys) cancelPendingSave?.(k);
        setUnsavedFiles?.(prev => { const next = new Set(prev); for (const k of affectedKeys) next.delete(k); return next; });
        if (shouldDeleteSource) {
          await runWithWriteLock(node.path, async () => {
            for (const k of affectedKeys) {
              const target = physicalFiles.get(k.toLowerCase());
              if (target) await vfs.operation.handleDelete({ id: target.id, name: target.name, parentId: target.parentId || workspaceDirId });
            }
          });
        }
        const newFiles = { ...files };
        for (const k of affectedKeys) delete newFiles[k];
        setFiles(newFiles);
        if (activeFile === node.path || activeFile.startsWith(node.path + '/')) setActiveFile(fallbackFile);
      }
    });
  };

  const handleRename = (node) => {
    confirm.show({
      title: '重命名',
      content: '请输入新名称：',
      showInput: true,
      inputDefaultValue: node.name,
      onConfirm: async (newName) => {
        if (!newName || newName === node.name) return;
        const parentPath = parentOf(node.path);
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;
        if (files[newPath] !== undefined) { alert.warning('已存在'); return; }
        const newFiles = { ...files };
        if (node.type === 'dir') {
          // 文件夹：递归重命名其下所有文件路径（含文件夹占位本身）
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
        // 取消旧路径挂起的自动保存，防止旧路径被复活写出
        const renamedKeys = Object.keys(files).filter(k => k === node.path || k.startsWith(node.path + '/'));
        for (const k of renamedKeys) cancelPendingSave?.(k);
        setFiles(newFiles);
        // 未保存标记跟随新路径
        setUnsavedFiles?.(prev => {
          const next = new Set();
          for (const k of prev) next.add((k === node.path || k.startsWith(node.path + '/')) ? k.replace(node.path, newPath) : k);
          return next;
        });
        if (activeFile === node.path || activeFile.startsWith(node.path + '/')) setActiveFile(activeFile.replace(node.path, newPath));
        // 物理重命名
        const target = physicalFiles.get(node.path.toLowerCase());
        if (target) await runWithWriteLock(node.path, async () => {
          await vfs.operation.handleRename({ id: target.id, name: target.name, newName, parentId: target.parentId || workspaceDirId, type: target.type });
          // 有未保存改动：按新路径立即写入内存最新内容
          if (node.type !== 'dir' && unsavedFiles.has(node.path)) await triggerVfsSave(newPath, newFiles[newPath], true);
        });
      }
    });
  };

  // 解析目标目录的物理 id（缺失时逐级 ensureDir 补齐）
  const resolveDirId = async (dirPath) => {
    if (!dirPath) return workspaceDirId;
    const existing = physicalFiles.get(dirPath.toLowerCase());
    if (existing?.id) return existing.id;
    let currentId = workspaceDirId;
    for (const part of dirPath.split('/')) {
      const ensured = await vfs.operation.handleEnsureDir({ parentId: currentId, name: part });
      currentId = ensured.id;
    }
    return currentId;
  };

  // 跨层级移动：内存先行（路径前缀换算），物理层 handleMove 包写锁对齐
  // anchor: { anchorKey, after } —— 按放置提示精确插入顺序，缺省追加到末尾
  const moveNode = async (srcPath, targetDirPath, anchor = null) => {
    const isDir = files[srcPath] === null;
    const name = srcPath.split('/').pop();
    if (parentOf(srcPath) === targetDirPath && !anchor) return;
    if (isDir && (targetDirPath === srcPath || targetDirPath.startsWith(srcPath + '/'))) {
      alert.warning('不能移动到自身内部');
      return;
    }
    const base = targetDirPath ? `${targetDirPath}/${name}` : name;
    const affected = Object.keys(files).filter(k => k === srcPath || k.startsWith(srcPath + '/'));
    const mapping = affected.map(k => [k, k === srcPath ? base : base + k.slice(srcPath.length)]);
    if (mapping.some(([, np]) => files[np] !== undefined)) { alert.warning('目标位置已存在同名项目'); return; }

    // 内存先行：剔除旧 key 后按 anchor 位置插入新 key（自身子树紧随父目录）
    const srcSet = new Set(affected);
    const remaining = Object.keys(files).filter(k => !srcSet.has(k));
    let insertAt = remaining.length;
    if (anchor?.anchorKey) {
      const ai = remaining.indexOf(anchor.anchorKey);
      if (ai >= 0) insertAt = anchor.after ? ai + 1 : ai;
    }
    const orderedKeys = [...remaining.slice(0, insertAt), ...affected, ...remaining.slice(insertAt)];
    const newFiles = {};
    for (const k of orderedKeys) {
      const hit = mapping.find(([ok]) => ok === k);
      if (hit) { newFiles[hit[1]] = files[k]; cancelPendingSave?.(k); }
      else newFiles[k] = files[k];
    }
    setFiles(newFiles);
    setPhysicalFiles(prev => {
      const next = new Map(prev);
      for (const [ok, nk] of mapping) {
        const item = next.get(ok.toLowerCase());
        if (item) { next.delete(ok.toLowerCase()); next.set(nk.toLowerCase(), item); }
      }
      return next;
    });
    // 未保存标记跟随新路径
    setUnsavedFiles?.(prev => {
      const next = new Set();
      for (const k of prev) {
        const hit = mapping.find(([ok]) => ok === k);
        next.add(hit ? hit[1] : k);
      }
      return next;
    });
    if (activeFile === srcPath || activeFile.startsWith(srcPath + '/')) {
      setActiveFile(activeFile === srcPath ? base : base + activeFile.slice(srcPath.length));
    }
    // 展开目标目录链，移动结果立即可见
    expandTo(base);

    // 物理对齐
    const wasUnsaved = unsavedFiles.has(srcPath);
    await runWithWriteLock(srcPath, async () => {
      const target = physicalFiles.get(srcPath.toLowerCase());
      const targetParentId = await resolveDirId(targetDirPath);
      if (target) {
        if (parentOf(srcPath) !== targetDirPath) {
          await vfs.operation.handleMove({ id: target.id, name: target.name, parentId: target.parentId || workspaceDirId, targetParentId, type: target.type });
        }
        // 有未保存改动：按新路径立即写入内存最新内容
        if (!isDir && wasUnsaved) await triggerVfsSave(base, newFiles[base], true);
      } else if (!isDir) {
        // 未落盘的新文件：直接按新路径保存
        await triggerVfsSave(base, files[srcPath], true);
      }
    });
  };

  const resetDragState = () => {
    dropHintRef.current = null;
    setDragId(null);
    setDropHint(null);
  };

  const handleDragStart = ({ active }) => setDragId(active.id);

  // 实时提示：指针在目标行的上/下边缘 → 同级插入线，落在文件夹行中部 → 整行高亮（移入）
  const handleDragMove = ({ active, over, delta, activatorEvent }) => {
    let next = null;
    if (over && over.id !== active.id && !over.id.startsWith(active.id + '/')) {
      const overVal = files[over.id];
      if (overVal !== undefined) {
        const rect = over.rect;
        const rel = rect?.height ? ((activatorEvent?.clientY ?? 0) + delta.y - rect.top) / rect.height : 0.5;
        if (overVal === null) {
          // 文件夹行：中间 50% 移入，上下 25% 作为同级插入
          const position = rel < 0.25 ? 'before' : rel > 0.75 ? 'after' : 'into';
          next = { id: over.id, position };
        } else {
          next = { id: over.id, position: rel < 0.5 ? 'before' : 'after' };
        }
      }
    }
    const prev = dropHintRef.current;
    if (prev === next) return;
    if (prev && next && prev.id === next.id && prev.position === next.position) return;
    dropHintRef.current = next;
    setDropHint(next);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const hint = dropHintRef.current;
    resetDragState();
    if (!over || active.id === over.id) return;
    if (over.id.startsWith(active.id + '/')) return;
    const overVal = files[over.id];
    if (files[active.id] === undefined || overVal === undefined) return;

    // 落在文件夹行中部 → 移入该文件夹
    if (overVal === null && (!hint || hint.id !== over.id || hint.position === 'into')) {
      moveNode(active.id, over.id);
      return;
    }

    const after = hint?.id === over.id && hint.position === 'after';
    const overParent = parentOf(over.id);
    // 跨父级 → 移入目标所在目录，并按插入线定位
    if (parentOf(active.id) !== overParent) { moveNode(active.id, overParent, { anchorKey: over.id, after }); return; }

    // 同父级：按插入线精确重排
    const keys = Object.keys(files);
    const remaining = keys.filter(k => k !== active.id);
    const ai = remaining.indexOf(over.id);
    if (ai < 0) return;
    const insertAt = after ? ai + 1 : ai;
    const ordered = [...remaining.slice(0, insertAt), active.id, ...remaining.slice(insertAt)];
    const newFiles = {};
    for (const k of ordered) newFiles[k] = files[k];
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
                 <button className={style[bem.e('icon-btn')]} onClick={() => handleAddFile('', 'file')} title="新建文件"><AddIcon fontSize="small" /></button>
                 <button className={style[bem.e('icon-btn')]} onClick={() => handleAddFile('', 'dir')} title="新建文件夹"><CreateNewFolderIcon fontSize="small" /></button>
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
          <ContextMenu menuItems={[
            { id: 'new-file', label: '新建文件', onClick: () => handleAddFile('', 'file') },
            { id: 'new-dir', label: '新建文件夹', onClick: () => handleAddFile('', 'dir') },
          ]}>
            <div className={style[bem.e('file-list')]}>
              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onDragCancel={resetDragState}
              >
                <SortableContext items={flatItems.map(i => i.node.path)} strategy={verticalListSortingStrategy}>
                  {flatItems.map(({ node, depth }) => (
                    <TreeNode key={node.path} node={node} depth={depth} expanded={expanded} onToggleExpand={onToggleExpand} activeFile={activeFile} setActiveFile={setActiveFile} unsavedFiles={unsavedFiles} onDelete={handleDelete} onAdd={handleAddFile} onRename={handleRename} dropHint={dropHint} isEntry={node.type === 'file' && entrySet.has(node.path)} />
                  ))}
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {dragId && files[dragId] !== undefined ? <DragChip path={dragId} isDir={files[dragId] === null} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          </ContextMenu>
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
