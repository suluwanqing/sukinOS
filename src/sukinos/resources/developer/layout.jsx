import { useState, useEffect, memo, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';

// 将子面板组件全部改为动态引入
const Uploader = lazy(() => import('./right/upload/layout'));
const UpdatePanel = lazy(() => import('./right/update/layout'));
const DevCenter = lazy(() => import('./right/devCenter/layout'));
const Setting = lazy(() => import('./setting/layout'));
const Explorer = lazy(() => import('./explorer/layout'));
const AppView = lazy(() => import('./right/appView/layout'));
const Helper = lazy(() => import('./right/healper/layout'));

import { Download as GetAppIcon, MonitorDown as SystemUpdateAltIcon, FolderOpen as FolderOpenIcon, Settings as SettingsIcon, BookOpen as MenuBookIcon, Eye as VisibilityIcon } from 'lucide-react';
import Nav from "./nav/layout"
import { selectorUserInfo, selectorStoreSettingStorePath } from "@/sukinos/store"
import { useDispatch, useSelector } from 'react-redux';
import { DEFAULT_LAYOUT, DEFAULT_LOGO} from "@/sukinos/utils/config"
import kernel from "@/sukinos/utils/process/kernel"
import { alert } from "@/component/alert/layout"
import { ENV_KEY_NAME, ENV_KEY_IS_BUNDLE, ENV_KEY_CONTENT, ENV_KEY_LOGIC, ENV_KEY_META_INFO } from '@/sukinos/utils/config';
import { appCustomMapper, appCustom, appTypes } from '@/sukinos/utils/config';
import fs from '@/sukinos/utils/file/fileKernel';
import { loadEntryConfig, saveEntryConfig, buildAppEntries, moduleKeyOf, contentKeyOf, formatMissingViewHint, formatDocEntryUnsupported } from '@/sukinos/utils/entryConfig';
import { inspectEntryLayering, splitLayeringErrors, formatLayeringErrors, isHtmlKey } from '@/sukinos/utils/process/sourceMapper';
import {useSystemFileSystem} from '@/sukinos/hooks/useFileSystem';
import { FileType } from "@/sukinos/utils/config";
import permissionManageAPI from "@/apis/system/permissionManage";

//ENV_KEY_IS_BUNDLE 这注意这个文件和setting的bundle没有区分,因为这里不会对外产生影响不再修改,而且会增加逻辑负担于=》upload
const bem = createNamespace('developer');

// 挂载完成后工作区该定在哪个目录：有可用记忆就用它，否则定在 root。
// 本地模式的目录 id 来自 FSA 授权与本次会话的 handleRegistry，刷新后必然失效，恢复它等于把 root
// 换成一个不存在的目录，因此只对虚拟模式生效；目录被删时 fs.getPath 返回空链，同样按"无记忆"处理。
// 物理/幽灵 realm 下裸 localStorage 访问即抛，取不到记忆就落在 root。
const resolveWorkspaceTarget = (fsMode) => {
  let saved = null;
  try { saved = localStorage.getItem(`dev_center_workspace_dir_${fsMode}`); } catch { saved = null; }
  if (!saved || saved === 'root' || fsMode !== 'virtual') return { dirId: 'root', pathStr: '/' };
  const pathArr = fs.getPath(saved);
  if (pathArr.length === 0) return { dirId: 'root', pathStr: '/' };
  return { dirId: saved, pathStr: pathArr.map(p => (p.name === 'root' ? '' : p.name)).join('/') || '/' };
};

function Developer({ app }) {
  const storePath = useSelector(selectorStoreSettingStorePath)
  const dispatch = useDispatch();

  // VS Code 核心视图状态控制 (分离侧边栏与主工作区)
  const [activeSidebar, setActiveSidebar] = useState('explorer');
  const [activeMain, setActiveMain] = useState('editor');

  const userInfo = useSelector(selectorUserInfo);
  // 判断是否已登录,开发环境直通，生产环境根据 userInfo 判断
  const isLogin = import.meta.env.DEV || (userInfo && Object.keys(userInfo).length !== 0);
  const [uploadType, setUploadType] = useState('bundle');
  const [previewApp, setPreviewApp] = useState(null);

  // 文件系统状态
  const [files, setFiles] = useState({});
  const [activeFile, setActiveFile] = useState('');
  const [isMapped, setIsMapped] = useState(false);
  const [unsavedFiles, setUnsavedFiles] = useState(new Set());
  const [physicalFiles, setPhysicalFiles] = useState(new Map());

  const [appMeta, setAppMeta] = useState({
    sysOptions: { shouldUpload: false, uploadInfo: { isPrivate: false } },
    appName: '', appIcon: DEFAULT_LOGO, initialSize: { w: 600, h: 450, x: 0, y: 0 },
    appType: 'editor', exposeState: false, saveState: false,
    worker: true, hideHeader: false,
    description: '这是一个App', syncLocal: false, custom: { ...appCustom }
  });

  const [fsMode, setFsMode] = useState('virtual');
  const vfs = useSystemFileSystem(fsMode);
  const [workspaceDirId, setWorkspaceDirId] = useState('root');
  const [workspacePathStr, setWorkspacePathStr] = useState('/');
  const [isAutoSave, setIsAutoSave] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [registerToPool, setRegisterToPool] = useState(false);
  const [canRegister, setCanRegister] = useState(false);
  // 入口约定配置：按用户隔离存 localStorage，决定哪些文件是逻辑入口 / 视图入口
  const [entryConfig, setEntryConfig] = useState(() => loadEntryConfig(null));
  const updateEntryConfig = useCallback((next) => {
    setEntryConfig(next);
    saveEntryConfig(userInfo?.id, next);
  }, [userInfo?.id]);
  useEffect(() => {
    if (userInfo?.id) setEntryConfig(loadEntryConfig(userInfo.id));
  }, [userInfo?.id]);
  // loadWorkspaceFiles 需要恒定引用（防止物理同步抖动），配置经 ref 转接而非进依赖数组
  const entryConfigRef = useRef(entryConfig);
  entryConfigRef.current = entryConfig;
  const saveTimeoutRef = useRef({});
  // 写锁：记录进行中的物理写入（新建/保存/重命名/删除），写锁期间 loadWorkspaceFiles 跳过，杜绝物理盘回读覆盖内存的竞态
  const pendingWritesRef = useRef(new Set());

  // 侧边栏宽度
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const sidebarResizingRef = useRef(false);

  const startSidebarResize = useCallback((e) => {
    e.preventDefault();
    sidebarResizingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev) => {
      if (!sidebarResizingRef.current) return;
      const next = Math.min(Math.max(startWidth + (ev.clientX - startX), 180), 480);
      setSidebarWidth(next);
    };
    const onUp = () => {
      sidebarResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    if (!userInfo?.id) return;
    permissionManageAPI.checkCanRegister().then(res => {
      if (res.code === 200 && (res.data?.canRegister || res.data?.can_register)) setCanRegister(true);
    }).catch(() => {});
  }, [userInfo?.id]);

  // 使用 ref 来存储最新的值，避免闭包问题
  const isMappedRef = useRef(isMapped);
  const workspaceDirIdRef = useRef(workspaceDirId);

  // 使用 Refs 缓存内存中的实时编辑状态
  const filesRef = useRef(files);
  const physicalFilesRef = useRef(physicalFiles);
  // 使用 Ref 锁定模块不稳定的 Hook 状态引用，实现 loadWorkspaceFiles 零依赖化
  const vfsRef = useRef(vfs);

  useEffect(() => {
    isMappedRef.current = isMapped;
    workspaceDirIdRef.current = workspaceDirId;
  }, [isMapped, workspaceDirId]);

  useEffect(() => {
    filesRef.current = files;
    physicalFilesRef.current = physicalFiles;
  }, [files, physicalFiles]);

  useEffect(() => {
    vfsRef.current = vfs;
  }, [vfs]);

  // 回读锚点目录的物理介质并解析进内存。全类型读取（不再限制 JS/JSX）。
  // 递归解析工作区目录树，key 用相对路径（如 pages/about/index.jsx），支持嵌套文件夹。
  // 目录以 null 占位写入 files（与空内容文件 '' 区分）。
  // 通过 vfsRef 的代理锁定，使其彻底变为 [] 零依赖项，引用永远保持稳定
  const loadWorkspaceFiles = useCallback(async () => {
    const currentVfs = vfsRef.current;
    // 解析目标始终是工作区锚点目录：handleReadDir 按 id 直读，与 VFS 当前浏览到哪个目录无关。
    // 早前这里额外要求 vfs.state.currentId === workspaceDirId，于是导航没真正落地时就是
    // "路径显示对了、目录树为空"，非得打开一次目录弹窗（它会补一次 loadDir）才恢复。
    if (!isMappedRef.current) return;
    // 写锁期间跳过：新建的 mkdir/writeFile 会触发 fs.watch→loadDir→items 变化，
    // 若此时回读物理盘整体覆盖内存，会把刚写入内存的新建项抹掉
    if (pendingWritesRef.current.size > 0) return;
    const anchorId = workspaceDirIdRef.current;

    try {
      const currentFiles = filesRef.current;
      const currentPhysicalFiles = physicalFilesRef.current;

      // 递归遍历工作区目录，收集所有文件与目录（含子文件夹），返回 { relPath, item, isDir }
      const collectRecursive = async (dirId, prefix) => {
        const result = [];
        const list = await currentVfs.operation.handleReadDir(dirId);
        for (const item of list) {
          const relPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.type === FileType.DIRECTORY) {
            result.push({ relPath, item, isDir: true });
            const sub = await collectRecursive(item.id, relPath);
            result.push(...sub);
          } else {
            result.push({ relPath, item, isDir: false });
          }
        }
        return result;
      };

      const allFiles = await collectRecursive(anchorId, '');
      // 回读是异步的：期间锚点可能已被记忆恢复或"重选"切走，晚到的结果不能再覆写当前内容
      if (!isMappedRef.current || workspaceDirIdRef.current !== anchorId) return;
      const incomingKeys = allFiles.map(f => f.relPath);
      const currentFilesKeys = Object.keys(currentFiles);

      // 判断物理盘的文件树结构是否真的改变了（基于递归收集的相对路径，含目录）
      const isStructuralChange =
        currentFilesKeys.length === 0 ||
        currentFilesKeys.length !== incomingKeys.length ||
        !currentFilesKeys.every(k => incomingKeys.includes(k));

      // 如果只是保存、更新内容，文件结构无增减变动，组件层直接拦截
      //    绝对不重新读取物理磁盘去覆写代码中的 files，防止根除闪烁与内容回弹
      if (!isStructuralChange && currentPhysicalFiles.size > 0) {
        const updatedPhysicalFiles = new Map(currentPhysicalFiles);
        for (const { relPath, item } of allFiles) {
          updatedPhysicalFiles.set(relPath.toLowerCase(), item);
        }
        setPhysicalFiles(updatedPhysicalFiles);
        return;
      }

      // 只有当结构发生改变（新建/删除文件）或首次挂载工作区时，才读取物理文件覆盖状态
      const newFiles = {};
      const newPhysicalFiles = new Map();
      let hasViewFile = false;

      for (const { relPath, item, isDir } of allFiles) {
        newPhysicalFiles.set(relPath.toLowerCase(), item);
        if (isDir) {
          newFiles[relPath] = null; // 目录占位
          continue;
        }
        const fileData = await currentVfs.operation.handleOpenFile(item);
        if (!fileData) continue;
        newFiles[relPath] = fileData.content ?? '';
        hasViewFile = true;
      }
      // 空工作区按入口约定播种视图文件
      const viewEntryName = entryConfigRef.current?.viewEntry || 'layout.jsx';
      if (!hasViewFile && Object.keys(newFiles).length === 0) newFiles[viewEntryName] = DEFAULT_LAYOUT;

      setPhysicalFiles(newPhysicalFiles);
      setFiles(newFiles);
      setActiveFile(prev => (newFiles[prev] !== undefined && newFiles[prev] !== null ? prev : (Object.keys(newFiles).find(k => newFiles[k] !== null) || viewEntryName)));

    } catch (e) { console.error("[Developer] 物理文件同步内存失败", e); }
  }, []); // 零依赖项，永远保持引用绝对恒定

  // 写锁执行器：物理写入期间挂锁，锁清空后补一次对齐（此时物理与内存一致，走"无结构变化"分支只更新 physicalFiles）
  const runWithWriteLock = useCallback(async (key, fn) => {
    pendingWritesRef.current.add(key);
    try {
      return await fn();
    } finally {
      pendingWritesRef.current.delete(key);
      if (pendingWritesRef.current.size === 0) loadWorkspaceFiles();
    }
  }, [loadWorkspaceFiles]);

  // 生成 items 列表的特征签名，规避因 VFS 内部加载状态变化导致的频繁刷新
  const itemsSignature = useMemo(() => {
    if (!vfs.state.items) return '';
    return vfs.state.items.map(item => `${item.id}:${item.name}:${item.type}`).join('|');
  }, [vfs.state.items]);

  // 落锚：把工作区定在该模式记忆里的目录（无记忆则定在 root），并把 VFS 的浏览态一起挪过去。
  // 可重复调用：三个 setState 传同值时 React 直接 bail out，loadDir 只在浏览态与锚点不一致时补，
  // 因此挂载、换模式、换登录态、VFS 重挂完成这几处都能安全地调它。
  const applyWorkspaceMapping = useCallback((mode) => {
    const { dirId, pathStr } = resolveWorkspaceTarget(mode);
    const currentVfs = vfsRef.current;
    // 只设锚点不导航，资源管理器会停在 root；只导航不设锚点，路径显示对了而解析目标错——两头都要
    if (currentVfs.state.currentId !== dirId) currentVfs.navigation.loadDir(dirId);
    setWorkspaceDirId(dirId);
    setWorkspacePathStr(pathStr);
    setIsMapped(true);
  }, []);

  // 监听 VFS 物理结构变动与锚点变化。解析目标始终是锚点目录本身，所以不再要求
  // vfs.state.currentId 与锚点相等——浏览态与锚点分叉时（在目录弹窗里逛到别的文件夹）
  // 少一次覆写、也多了"导航没落地就永远不解析"的容错。
  useEffect(() => {
    if (vfs.state.isReady && isMapped) loadWorkspaceFiles();
  }, [itemsSignature, isMapped, workspaceDirId, vfs.state.isReady, loadWorkspaceFiles]);

  // 切换盘符模式：清掉上一个模式的编辑缓存并收掉映射权，锚点交给下面那段等挂载完成的 Effect 去定。
  // 不在这里定锚：此刻 VFS 可能还没挂载完，读记忆会误判成"无记忆"而先扫一遍 root。
  useEffect(() => {
    setFiles({});
    setPhysicalFiles(new Map());
    setUnsavedFiles(new Set());
    setActiveFile('');
    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};
    pendingWritesRef.current.clear();
    setIsMapped(false);
  }, [fsMode]);

  // 落锚时机：挂载完成（含换模式后的重挂）、换模式、换登录态（VFS 换用户库后旧锚点在新库里根本不存在）。
  // 两个条件都从内容推导，不设"每个模式只恢复一次"的标记——标记正是原缺陷的成因：首次导航被 boot 的
  // loadDir('root') 抢跑之后就没人补第二次，于是路径显示对了、目录树要重开一次弹窗才加载。
  // 注意 currentId / workspaceDirId 只作为闸门读取、不进依赖：浏览目录会把 currentId 挪到 root，
  // 进了依赖就会在用户逛弹窗时把工作区强行拽回记忆目录。
  useEffect(() => {
    if (!vfs.state.isReady) return;
    const parkedAtRoot = vfs.state.currentId === 'root'; // bootFS 收尾固定停在 root
    const anchorStale = workspaceDirId !== 'root' && fs.getPath(workspaceDirId).length === 0;
    if (!parkedAtRoot && !anchorStale) return;
    applyWorkspaceMapping(fsMode);
  }, [vfs.state.isReady, fsMode, userInfo?.id, applyWorkspaceMapping]); // eslint-disable-line react-hooks/exhaustive-deps

  // 移除旧版 handleCreate 临时过渡阶段，不管是否存在，直接扔给 handleSave
  // 支持相对路径：当 fileName 含 '/' 时，逐级 handleEnsureDir 解析/创建父目录（virtual/local 统一）
  // content === null 表示仅创建目录（文件夹落盘通路）
  const cancelPendingSave = useCallback((fileName) => {
    if (saveTimeoutRef.current[fileName]) {
      clearTimeout(saveTimeoutRef.current[fileName]);
      delete saveTimeoutRef.current[fileName];
    }
  }, []);

  const triggerVfsSave = useCallback((fileName, content, isManual = false) => {
    if (!isMapped) return;
    if (saveTimeoutRef.current[fileName]) clearTimeout(saveTimeoutRef.current[fileName]);

    const delay = isManual ? 0 : 2000;
    saveTimeoutRef.current[fileName] = setTimeout(async () => {
      await runWithWriteLock(fileName, async () => {
        try {
          const lowerName = fileName.toLowerCase();
          let targetItem = physicalFiles.get(lowerName);
          let targetId = targetItem?.id;
          let parentId = workspaceDirId;
          let name = fileName;

          // 拆出父目录路径与文件名，逐级解析/创建父目录
          if (fileName.includes('/')) {
            const parts = fileName.split('/');
            name = parts.pop();
            let currentId = workspaceDirId;
            for (const part of parts) {
              const ensured = await vfs.operation.handleEnsureDir({ parentId: currentId, name: part });
              if (!ensured) throw new Error(`目录创建失败: ${part}`);
              currentId = ensured.id;
            }
            parentId = currentId;
          }

          // 仅创建目录
          if (content === null) {
            await vfs.operation.handleEnsureDir({ parentId, name });
            return;
          }

          // 直接写入最新编辑的内容，由 Hook 底层自动判断并以“一步写入”形式直接在磁盘生成，规避任何时序空隙
          const res = await vfs.operation.handleSave({
             id: targetId, content, parentId, name
          });

          if (res) {
           setUnsavedFiles(prev => { const next = new Set(prev); next.delete(fileName); return next; });
           if (isManual) alert.success(`${fileName} 已同步`);
          }
        } catch (err) {
          console.log(err)
          if (isManual) alert.failure(`${fileName} 保存失败`);
        }
      });
    }, delay);
  }, [workspaceDirId, isMapped, physicalFiles, vfs.operation, runWithWriteLock]);

  const handleContentChange = useCallback((fileName, content) => {
    setFiles(prev => ({ ...prev, [fileName]: content }));
    setUnsavedFiles(prev => new Set(prev).add(fileName));
    if (isAutoSave) triggerVfsSave(fileName, content, false);
  }, [isAutoSave, triggerVfsSave]);

  //保持默认多页优先。
  useEffect(() => {
    const fileCount = Object.keys(files).length;
    if (fileCount > 1) {
      setUploadType('bundle');
    }
  }, [files]);

  // 入口解析：命中 logicEntries 的第一个文件为主逻辑入口（状态机，单独承载），
  // 其余为辅逻辑入口（服务模块，留在内容包内由 worker 侧模块运行时 require）
  const appEntries = useMemo(() => buildAppEntries(files, entryConfig), [files, entryConfig]);
  const mainLogicCode = appEntries.logicMainFile ? files[appEntries.logicMainFile] : null;

  const cleanFiles = useMemo(() => {
    // 文档包（视图入口是 html）的 key 保留完整相对路径：<script src="./assets/x.js"> 按文件路径找载荷，
    // 去扩展名会把它变成对不上的 key；JSX 包的 key 是导入路径，必须去扩展名
    const asDocument = isHtmlKey(appEntries.viewFile || '');
    const result = {};
    for (const [key, value] of Object.entries(files)) {
      if (value === null) continue; // 目录占位不打入内容包
      if (key === appEntries.logicMainFile) continue; // 主逻辑入口由 ENV_KEY_LOGIC 单独承载
      result[contentKeyOf(key, asDocument)] = value;
    }
    return result;
  }, [files, appEntries]);

  const updateAppMeta = (updates) => {
    setAppMeta(prev => ({ ...prev, ...updates }));
  };

  // 分层校验的对象必须是「这次真正会被发出去的载荷」：单页只装一个视图字符串，
  // 按整个工作区校验会放行主逻辑块里那些随不了走的 import，装完才在 worker 里 require 必炸。
  // 解析不到视图文件时回落全量——那种形态本来就发不出去，不该用一串 missing 把真因盖掉。
  const layeringFiles = useMemo(() => {
    if (uploadType === 'bundle') return files;
    const viewFile = appEntries.viewFile || appEntries.mainFile || activeFile;
    return viewFile && typeof files[viewFile] === 'string' ? { [viewFile]: files[viewFile] } : files;
  }, [uploadType, files, appEntries, activeFile]);

  // 分层校验只在发布/预览动作时跑一次，不进按键路径：工作区文件多时正则扫描会有可感延迟
  const layeringErrors = useCallback(
    () => inspectEntryLayering({ files: layeringFiles, entries: appEntries.entries, logicMainCode: mainLogicCode || '' }),
    [layeringFiles, appEntries, mainLogicCode]
  );

  /**
   * @param strict 发布路径 true：四类问题全部拦下。预览路径 false：只拦 worker 必炸的硬故障，
   *   page-imports-aux 降级为提示——入口规则写得较宽（如 utils/**）时它不影响求值，硬拦会让应用无法预览
   */
  const blockByLayering = useCallback((strict = true) => {
    const { hard, soft } = splitLayeringErrors(layeringErrors());
    const blocking = strict ? [...hard, ...soft] : hard;
    if (blocking.length) {
      alert.warning(formatLayeringErrors(blocking), { duration: 6000 });
      return true;
    }
    if (soft.length) alert.warning(formatLayeringErrors(soft), { duration: 4000 });
    return false;
  }, [layeringErrors]);

  const handleDevCenterCreate = () => {
    if (!appMeta.appName) { alert.warning("请输入应用名称"); return; }
    const installedApps = kernel.getInstalledApps();
    if (installedApps.some(app => app?.[ENV_KEY_NAME] === appMeta.appName)) {
      alert.warning(`名称占用`); return;
    }
    if (blockByLayering(true)) return;
    // 视图入口缺失时运行时会回落到 'layout' 而白屏：多页面靠 entries.view 选页，
    // 文档档更是只有这一条路（内容按文件路径寻址），所以两者都必须点名
    if ((uploadType === 'bundle' || isHtmlKey(entryConfig.viewEntry || '')) && !appEntries.viewFile) {
      alert.warning(formatMissingViewHint(entryConfig.viewEntry), { duration: 6000 }); return;
    }
    // 文档包只有 map 这一种形态：单页档装不下它引用的样式与资源，而且是静默装不下
    const asDocEntry = isHtmlKey(appEntries.viewFile || '');
    if (asDocEntry && uploadType !== 'bundle' && Object.keys(cleanFiles).length > 1) {
      alert.warning(formatDocEntryUnsupported(uploadType === 'logic' ? '单页 [含逻辑]' : '单文件'), { duration: 6000 }); return;
    }
    // 单页载荷只有一个视图字符串：辅逻辑模块即便命中入口约定也不会随资源走，
    // 主逻辑块 import 的目标同理（那部分交给按载荷跑的分层校验拦）
    if (uploadType !== 'bundle' && appEntries.entries.logicAux.length) {
      alert.warning(`单页应用无法携带辅逻辑模块（${appEntries.entries.logicAux.join('、')}），请改用多页面发布`); return;
    }
    const { appName, appIcon, sysOptions, ...restMetaInfo } = appMeta;
    // 入口约定随资源固化：运行时读的是 metaInfo.entries，不是本机 localStorage 配置
    const baseMetaInfo = { seed: Date.now().toString(), authorId: userInfo?.id, icon: appIcon, entries: appEntries.entries, ...restMetaInfo };

    /*
      为了简化传输配置:
        外层是相对固定的
        [ENV_KEY_RESOURCE_ID]
        [ENV_KEY_NAME]
        [ENV_KEY_IS_BUNDLE]
        [ENV_KEY_CONTENT]
        [ENV_KEY_LOGIC]
        [ENV_KEY_META_INFO]

        // 内部运行时选项（不会上传等都是判断条件）
        sysOptions 内部已包含了 shouldUpload 和 uploadInfo
    */
    // 将运行时上下文注入到 sysOptions
    const finalSysOptions = { ...sysOptions, userInfo, storePath };

    let payload;
    if (uploadType !== 'bundle' && !asDocEntry) {
      // 单页内容只装一个视图字符串：口径与预览/上传面板一致（视图入口优先，其次单文件入口，最后当前编辑文件）
      const entryKey = moduleKeyOf(appEntries.viewFile || appEntries.mainFile || activeFile);
      const content = cleanFiles[entryKey] || Object.values(cleanFiles)[0];
      payload = {
        sysOptions: finalSysOptions, [ENV_KEY_NAME]: appName, [ENV_KEY_IS_BUNDLE]: false,
        [ENV_KEY_CONTENT]: content, [ENV_KEY_LOGIC]: mainLogicCode, [ENV_KEY_META_INFO]: baseMetaInfo
      };
    } else {
      // 文档档落在这里：哪怕工作区只有那个 html，也必须以 map + isBundle 的形态发出去
      payload = {
        sysOptions: finalSysOptions, [ENV_KEY_NAME]: appName, [ENV_KEY_IS_BUNDLE]: true,
        [ENV_KEY_CONTENT]: cleanFiles, [ENV_KEY_LOGIC]: mainLogicCode, [ENV_KEY_META_INFO]: baseMetaInfo
      };
    }
    kernel.uploadResource(payload).then(resourceId => {
      if (registerToPool && resourceId) {
        permissionManageAPI.registerApp({
          resource_id: resourceId,
          permission_enabled: true,
        }).catch(e => console.error("注册权限失败", e));
      }
    }).catch(e => console.error("上传失败", e));
    alert.success(`应用指令已发送`);
    setRegisterToPool(false);
  };

  const handlePreviewApp = () => {
    // 预览只拦硬故障：worker 求不到值的场景预览出来也是假象；软约束降级为提示
    if (blockByLayering(false)) return;
    let viewCodeForPreview = null; let filesForPreview = null;
    // 文档档的预览与发布同形态（map + isBundle），否则子文档拿不到它引用的样式与脚本
    const isBundle = uploadType === 'bundle' || isHtmlKey(appEntries.viewFile || '');
    // 预览文件集只剔除目录占位(null)与主逻辑入口；辅逻辑入口留在集合内交给 worker 侧模块运行时
    const previewFiles = Object.fromEntries(
      Object.entries(files).filter(([k, v]) => v !== null && k !== appEntries.logicMainFile)
    );
    if (isBundle) filesForPreview = previewFiles;
    else {
      const viewFile = appEntries.viewFile || appEntries.mainFile || activeFile;
      viewCodeForPreview = previewFiles[viewFile] || Object.values(previewFiles)[0];
    }
    setPreviewApp({
      //这里无需过多处理因为这个不会实际应用到上传,安装这里
      appName: appMeta.appName || '未命名', viewCode: viewCodeForPreview,
      files: filesForPreview, isBundle: isBundle, logicCode: mainLogicCode,
      entries: appEntries.entries,
      initialSize: appMeta.initialSize, appIcon: appMeta.appIcon, appType: appMeta.appType
    });
    setActiveMain('preview');
  };

  // 活动栏菜单
  const funcItems = [
    { id: 'explorer', icon: <FolderOpenIcon />, title: '资源管理器', onClick: () => { setActiveSidebar('explorer'); setActiveMain('editor'); } },
    { id: 'setting', icon: <SettingsIcon />, title: '配置', onClick: () => setActiveSidebar('setting') },
    { id: 'upload', icon: <GetAppIcon />, title: '导入', onClick: () => setActiveMain('upload') },
    { id: 'update', icon: <SystemUpdateAltIcon />, title: '更新', onClick: () => setActiveMain('update') },
    { id: 'preview', icon: <VisibilityIcon />, title: '预览', onClick: () => handlePreviewApp(), hidden: !previewApp && activeMain !== 'preview' },
    { id: 'helper', icon: <MenuBookIcon />, title: '手册', onClick: () => setActiveMain('helper') },
  ];

  // 如果未登录，显示未登录提示
  if (!isLogin) {
    return (
      <div className={style[bem.b()]}>
        <div className={style[bem.e('unlogin-state')]}>
          <div className={style[bem.e('unlogin-content')]}>
            <h3>请先登录</h3>
            <p>您需要登录后才能使用开发者工具</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('activity-bar')]}>
        <Nav navItems={funcItems.filter(i => !i.hidden)} currentSidebar={activeSidebar} currentMain={activeMain} />
      </div>
      {activeSidebar !== 'none' && (
        <>
        <div className={style[bem.e('sidebar-wrapper')]} style={{ width: sidebarWidth }}>
          <Suspense fallback={<div style={{ padding: '20px', color: '#999', textAlign: 'center' }}>载入中...</div>}>
            {activeSidebar === 'explorer' && (
               <Explorer
                  files={files} setFiles={setFiles} activeFile={activeFile} setActiveFile={setActiveFile}
                  isMapped={isMapped} unsavedFiles={unsavedFiles} triggerVfsSave={triggerVfsSave}
                  physicalFiles={physicalFiles} setPhysicalFiles={setPhysicalFiles}
                  vfs={vfs} workspaceDirId={workspaceDirId} setWorkspaceDirId={setWorkspaceDirId}
                  workspacePathStr={workspacePathStr} setWorkspacePathStr={setWorkspacePathStr}
                  isAutoSave={isAutoSave} setIsAutoSave={setIsAutoSave}
                  showWorkspaceModal={showWorkspaceModal} setShowWorkspaceModal={setShowWorkspaceModal}
                  showImportModal={showImportModal} setShowImportModal={setShowImportModal}
                  loadWorkspaceFiles={loadWorkspaceFiles} fsMode={fsMode} setFsMode={setFsMode}
                  setIsMapped={setIsMapped} runWithWriteLock={runWithWriteLock}
                  setUnsavedFiles={setUnsavedFiles} cancelPendingSave={cancelPendingSave}
                  entryFiles={appEntries}
               />
            )}
            {activeSidebar === 'setting' && (
               <Setting appCustomMapper={appCustomMapper} appMeta={appMeta} appTypes={appTypes} onUpdateAppMeta={updateAppMeta} onCreate={handleDevCenterCreate} onPreview={handlePreviewApp} uploadType={uploadType} setUploadType={setUploadType} canRegister={canRegister} registerToPool={registerToPool} onRegisterToggle={setRegisterToPool} entryConfig={entryConfig} updateEntryConfig={updateEntryConfig} appEntries={appEntries} onLayeringCheck={layeringErrors} />
            )}
          </Suspense>
        </div>
        <div className={style[bem.e('sidebar-resizer')]} onMouseDown={startSidebarResize} />
      </>
      )}
      <div className={style[bem.e('main-wrapper')]}>
        <Suspense fallback={<div style={{ padding: '40px', color: '#999', textAlign: 'center' }}>工作区加载中...</div>}>
          {activeMain === 'editor' && (
            <DevCenter files={files} activeFile={activeFile} handleContentChange={handleContentChange} triggerVfsSave={triggerVfsSave} isMapped={isMapped} unsavedFiles={unsavedFiles} />
          )}
          {activeMain === 'preview' && <AppView app={previewApp} />}
          {activeMain === 'upload' && <Uploader appMeta={appMeta} uploadType={uploadType} entryConfig={entryConfig} />}
          {activeMain === 'update' && <UpdatePanel appMeta={appMeta} uploadType={uploadType} entryConfig={entryConfig} />}
          {activeMain === 'helper' && <Helper />}
        </Suspense>
      </div>
    </div>
  );
}

export default memo(Developer);
