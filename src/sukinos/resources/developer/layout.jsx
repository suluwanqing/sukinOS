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

import GetAppIcon from '@mui/icons-material/GetApp';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import Nav from "./nav/layout"
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { selectorUserInfo, selectorStoreSettingStorePath } from "@/sukinos/store"
import { useDispatch, useSelector } from 'react-redux';
import { DEFAULT_LAYOUT, DEFAULT_LOGIC ,DEFAULT_LOGO} from "@/sukinos/utils/config"
import kernel from "@/sukinos/utils/process/kernel"
import { alert } from "@/component/alert/layout"
import { ENV_KEY_NAME, ENV_KEY_IS_BUNDLE, ENV_KEY_CONTENT, ENV_KEY_LOGIC, ENV_KEY_META_INFO } from '@/sukinos/utils/config';
import { appCustomMapper, appCustom, appTypes } from '@/sukinos/utils/config';
import fs from '@/sukinos/utils/file/fileKernel';
import {useSystemFileSystem} from '@/sukinos/hooks/useFileSystem';
import { FileType } from "@/sukinos/utils/config";
import permissionManageAPI from "@/apis/system/permissionManage";

//ENV_KEY_IS_BUNDLE 这注意这个文件和setting的bundle没有区分,因为这里不会对外产生影响不再修改,而且会增加逻辑负担于=》upload
const bem = createNamespace('developer');

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
    logicCode: DEFAULT_LOGIC, appType: 'editor', exposeState: false, saveState: false,
    worker: true,
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
  const saveTimeoutRef = useRef({});

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
  // 使用 Ref 锁定不稳定的 Hook 状态引用，实现 loadWorkspaceFiles 零依赖化
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

  // 根据 items 物理介质列表解析内存。严格限制仅同步 JS/JSX。
  // 通过 vfsRef 的代理锁定，使其彻底变为 [] 零依赖项，引用永远保持稳定
  const loadWorkspaceFiles = useCallback(async (currentItems) => {
    const currentVfs = vfsRef.current;
    // 只有映射开启，且当前浏览的目录 ID 确实是工作区确认的 ID 时，才执行解析
    if (!isMappedRef.current || currentVfs.state.currentId !== workspaceDirIdRef.current) return;

    try {
      const currentFiles = filesRef.current;
      const currentPhysicalFiles = physicalFilesRef.current;

      // 提取物理侧属于 JS/JSX 的普通视图文件（过滤 logic 保留文件）
      const incomingFileNames = currentItems
        .filter(item => {
           if (item.type !== FileType.FILE) return false;
           const lowerName = item.name.toLowerCase();
           return (lowerName.endsWith('.js') || lowerName.endsWith('.jsx')) &&
                  lowerName !== 'logic.jsx' && lowerName !== 'logic.js';
        })
        .map(i => i.name);

      const currentFilesKeys = Object.keys(currentFiles);

      //判断物理盘的文件树结构是否真的改变了
      const isStructuralChange =
        currentFilesKeys.length === 0 ||
        currentFilesKeys.length !== incomingFileNames.length ||
        !currentFilesKeys.every(k => incomingFileNames.includes(k));

      // 如果只是保存、更新内容，文件结构无增减变动，组件层直接拦截
      //    绝对不重新读取物理磁盘去覆写内存中的 files，彻底根除闪烁与内容回弹
      if (!isStructuralChange && currentPhysicalFiles.size > 0) {
        const updatedPhysicalFiles = new Map(currentPhysicalFiles);
        for (const item of currentItems) {
          if (item.type === FileType.FILE) {
             updatedPhysicalFiles.set(item.name.toLowerCase(), item);
          }
        }
        setPhysicalFiles(updatedPhysicalFiles);
        return;
      }

      // 只有当结构发生改变（新建/删除文件）或首次挂载工作区时，才读取物理文件覆盖状态
      const newFiles = {};
      const newPhysicalFiles = new Map();
      let hasViewFile = false;
      let loadedLogic = DEFAULT_LOGIC;

      for (const item of currentItems) {
        if (item.type === FileType.FILE) {
          const lowerName = item.name.toLowerCase();
          // 如果识别到的是保留逻辑文件（Logic.jsx / logic.js），不混入普通视图 files 中
          const isLogic = lowerName === 'logic.jsx' || lowerName === 'logic.js';
          const isView = lowerName.endsWith('.js') || lowerName.endsWith('.jsx');

          if (isLogic || isView) {
            const fileData = await currentVfs.operation.handleOpenFile(item);
            if (!fileData) continue;

            const content = fileData.content;
            newPhysicalFiles.set(lowerName, item);

            if (isLogic) loadedLogic = content;
            else {
              newFiles[item.name] = content;
              hasViewFile = true;
            }
          }
        }
      }
      if (!hasViewFile && Object.keys(newFiles).length === 0) newFiles['layout.jsx'] = DEFAULT_LAYOUT;

      setPhysicalFiles(newPhysicalFiles);
      setFiles(newFiles);
      setAppMeta(prev => ({ ...prev, logicCode: loadedLogic }));
      setActiveFile(prev => (newFiles[prev] ? prev : (Object.keys(newFiles)[0] || 'layout.jsx')));

    } catch (e) { console.error("[Developer] 物理文件同步内存失败", e); }
  }, []); // 零依赖项，永远保持引用绝对恒定

  // 生成 items 列表的特征签名，规避因 VFS 内部加载状态变化导致的频繁刷新
  const itemsSignature = useMemo(() => {
    if (!vfs.state.items) return '';
    return vfs.state.items.map(item => `${item.id}:${item.name}:${item.type}`).join('|');
  }, [vfs.state.items]);

  // 监听 VFS 物理结构变动。
  useEffect(() => {
    if (vfs.state.isReady && isMapped && vfs.state.currentId === workspaceDirId) {
      loadWorkspaceFiles(vfs.state.items);
    }
  }, [itemsSignature, isMapped, workspaceDirId, vfs.state.currentId, vfs.state.isReady, loadWorkspaceFiles]);

  // 切换盘符模式时，直接执行一次根映射
  useEffect(() => {
    // 清理旧缓存
    setFiles({});
    setPhysicalFiles(new Map());
    setUnsavedFiles(new Set());
    setActiveFile('');
    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};

    // 直接执行根映射 (强制设为 root 并开启映射权限)
    setWorkspaceDirId('root');
    setWorkspacePathStr('/');
    setIsMapped(true);

    // 注意：此时 vfs 钩子内部会因为 mode 变化重新 boot 并 loadDir('root')
    // loadWorkspaceFiles 会在下一步的 items 变化 Effect 中自动被触发
  }, [fsMode]);

  // 记忆恢复 [可选：如果上次有记忆则覆盖 root]
  useEffect(() => {
    if (vfs.state.isReady) {
      const storageKey = `dev_center_workspace_dir_${fsMode}`;
      const savedDirId = localStorage.getItem(storageKey);
      if (savedDirId && savedDirId !== 'root') {
        try {
          if (fsMode === 'virtual') fs.readdir(savedDirId);

          setWorkspaceDirId(prev => (prev !== savedDirId ? savedDirId : prev));
          setIsMapped(prev => (prev !== true ? true : prev));

          const pathArr = fsMode === 'virtual' ? fs.getPath(savedDirId) : vfs.state.breadcrumbs;
          const nextPathStr = pathArr.map(p => p.name === 'root' ? '' : p.name).join('/') || '/';
          setWorkspacePathStr(prev => (prev !== nextPathStr ? nextPathStr : prev));
        } catch(e) { /* 保持 root 映射 */ }
      }
    }
  }, [vfs.state.isReady, fsMode, vfs.state.breadcrumbs]);

  // 移除旧版 handleCreate 临时过渡阶段，不管是否存在，直接扔给 handleSave
  const triggerVfsSave = useCallback((fileName, content, isManual = false) => {
    if (!isMapped) return;
    if (saveTimeoutRef.current[fileName]) clearTimeout(saveTimeoutRef.current[fileName]);

    const delay = isManual ? 0 : 2000;
    saveTimeoutRef.current[fileName] = setTimeout(async () => {
      try {
        const lowerName = fileName.toLowerCase();
        let targetItem = physicalFiles.get(lowerName);
        let targetId = targetItem?.id;

        // 直接写入最新编辑的内容，由 Hook 底层自动判断并以“一步写入”形式直接在磁盘生成，规避任何时序空隙
        const res = await vfs.operation.handleSave({
           id: targetId, content, parentId: workspaceDirId, name: fileName
        });

        if (res) {
           setUnsavedFiles(prev => { const next = new Set(prev); next.delete(fileName); return next; });
           if (isManual) alert.success(`${fileName} 已同步`);
        }
      } catch (err) {
        console.log(err)
        if (isManual) alert.failure(`${fileName} 保存失败`);
      }
    }, delay);
  }, [workspaceDirId, isMapped, physicalFiles, vfs.operation]);

  const handleContentChange = useCallback((fileName, content) => {
    if (fileName === 'Logic.jsx') setAppMeta(prev => ({ ...prev, logicCode: content }));
    else setFiles(prev => ({ ...prev, [fileName]: content }));
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

  const cleanFiles = useMemo(() => {
    const result = {};
    for (const [key, value] of Object.entries(files)) {
      result[key.replace('.jsx', '')] = value;
    }
    return result;
  }, [files]);

  const updateAppMeta = (updates) => {
    setAppMeta(prev => ({ ...prev, ...updates }));
  };

  const handleDevCenterCreate = () => {
    if (!appMeta.appName) { alert.warning("请输入应用名称"); return; }
    const installedApps = kernel.getInstalledApps();
    if (installedApps.some(app => app?.[ENV_KEY_NAME] === appMeta.appName)) {
      alert.warning(`名称占用`); return;
    }
    const { appName, appIcon, logicCode, sysOptions, ...restMetaInfo } = appMeta;
    const baseMetaInfo = { seed: Date.now().toString(), authorId: userInfo?.id, icon: appIcon, ...restMetaInfo };

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
    if (uploadType !== 'bundle') {
      const content = cleanFiles[activeFile] || Object.values(cleanFiles)[0];
      payload = {
        sysOptions: finalSysOptions, [ENV_KEY_NAME]: appName, [ENV_KEY_IS_BUNDLE]: false,
        [ENV_KEY_CONTENT]: content, [ENV_KEY_LOGIC]: logicCode, [ENV_KEY_META_INFO]: baseMetaInfo
      };
    } else {
      payload = {
        sysOptions: finalSysOptions, [ENV_KEY_NAME]: appName, [ENV_KEY_IS_BUNDLE]: true,
        [ENV_KEY_CONTENT]: cleanFiles, [ENV_KEY_LOGIC]: logicCode, [ENV_KEY_META_INFO]: baseMetaInfo
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
    let viewCodeForPreview = null; let filesForPreview = null;
    const isBundle = uploadType === 'bundle';
    if (isBundle) filesForPreview = files; else viewCodeForPreview = files[activeFile] || Object.values(files)[0];
    setPreviewApp({
      //这里无需过多处理因为这个不会实际应用到上传,安装这里
      appName: appMeta.appName || '未命名', viewCode: viewCodeForPreview,
      files: filesForPreview, isBundle: isBundle, logicCode: appMeta.logicCode,
      initialSize: appMeta.initialSize, appIcon: appMeta.appIcon, appType: appMeta.appType
    });
    setActiveMain('preview');
  };

  // 活动栏菜单
  const funcItems = [
    { id: 'explorer', icon: <FolderOpenIcon fontSize="medium" />, title: '资源管理器', onClick: () => { setActiveSidebar('explorer'); setActiveMain('editor'); } },
    { id: 'setting', icon: <SettingsIcon fontSize="medium" />, title: '配置', onClick: () => setActiveSidebar('setting') },
    { id: 'upload', icon: <GetAppIcon fontSize="medium" />, title: '导入', onClick: () => setActiveMain('upload') },
    { id: 'update', icon: <SystemUpdateAltIcon fontSize="medium" />, title: '更新', onClick: () => setActiveMain('update') },
    { id: 'preview', icon: <VisibilityIcon fontSize="medium" />, title: '预览', onClick: () => handlePreviewApp(), hidden: !previewApp && activeMain !== 'preview' },
    { id: 'helper', icon: <MenuBookIcon fontSize="medium" />, title: '手册', onClick: () => setActiveMain('helper') },
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
        <div className={style[bem.e('sidebar-wrapper')]}>
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
                  setIsMapped={setIsMapped}
               />
            )}
            {activeSidebar === 'setting' && (
               <Setting appCustomMapper={appCustomMapper} appMeta={appMeta} appTypes={appTypes} onUpdateAppMeta={updateAppMeta} onCreate={handleDevCenterCreate} onPreview={handlePreviewApp} uploadType={uploadType} setUploadType={setUploadType} canRegister={canRegister} registerToPool={registerToPool} onRegisterToggle={setRegisterToPool} />
            )}
          </Suspense>
        </div>
      )}
      <div className={style[bem.e('main-wrapper')]}>
        <Suspense fallback={<div style={{ padding: '40px', color: '#999', textAlign: 'center' }}>工作区加载中...</div>}>
          {activeMain === 'editor' && (
            <DevCenter files={files} activeFile={activeFile} logicCode={appMeta.logicCode} handleContentChange={handleContentChange} triggerVfsSave={triggerVfsSave} isMapped={isMapped} unsavedFiles={unsavedFiles} />
          )}
          {activeMain === 'preview' && <AppView app={previewApp} />}
          {activeMain === 'upload' && <Uploader appMeta={appMeta} uploadType={uploadType} />}
          {activeMain === 'update' && <UpdatePanel appMeta={appMeta} uploadType={uploadType} />}
          {activeMain === 'helper' && <Helper />}
        </Suspense>
      </div>
    </div>
  );
}

export default memo(Developer);
