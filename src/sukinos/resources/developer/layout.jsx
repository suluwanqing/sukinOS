import { useState, useEffect, memo, useMemo, useRef, useCallback } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Uploader from './right/upload/layout';
// import Login from './login/layout';
import DevCenter from './right/devCenter/layout';
import Setting from './setting/layout';
import Explorer from './explorer/layout';
import AppView from './right/appView/layout';
import GetAppIcon from '@mui/icons-material/GetApp';
import Nav from "./nav/layout"
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { selectorUserInfo, sukinOsActions, selectorStoreSettingStorePath } from "@/sukinos/store"
import { useDispatch, useSelector } from 'react-redux';
import Helper from './right/healper/layout';
import { DEFAULT_HOME, DEFAULT_LAYOUT, DEFAULT_LOGIC } from "@/sukinos/utils/config"
import kernel from "@/sukinos/utils/process/kernel"
import { alert } from "@/component/alert/layout"
import { ENV_KEY_NAME, ENV_KEY_IS_BUNDLE, ENV_KEY_CONTENT, ENV_KEY_LOGIC, ENV_KEY_META_INFO } from '@/sukinos/utils/config';
import { appCustomMapper, appCustom, appTypes } from '@/sukinos/utils/config';
import fs from '@/sukinos/utils/file/fileKernel';
import useFileSystem from '@/sukinos/hooks/useFileSystem';
import { FileType } from "@/sukinos/utils/config";

//ENV_KEY_IS_BUNDLE 这注意这个文件和setting的bundle没有区分,因为这里不会对外产生影响不再修改,而且会增加逻辑负担于=》upload
const bem = createNamespace('developer');

function Developer({ app }) {
  const storePath = useSelector(selectorStoreSettingStorePath)
  const dispatch = useDispatch();

  // VS Code 核心视图状态控制 (分离侧边栏与主工作区)
  const [activeSidebar, setActiveSidebar] = useState('explorer'); // 'explorer' | 'setting' | 'none'
  const [activeMain, setActiveMain] = useState('editor'); // 'editor' | 'preview' | 'upload' | 'helper'

  const userInfo = useSelector(selectorUserInfo);
  // 判断是否已登录
  const isLogin = userInfo && Object.keys(userInfo).length !== 0;
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
    appName: '', appIcon: '/logo.jpg', initialSize: { w: 600, h: 450, x: 0, y: 0 },
    logicCode: DEFAULT_LOGIC, appType: 'editor', exposeState: false, saveState: false,
    description: '这是一个App', syncLocal: false, custom: { ...appCustom }
  });

  const [fsMode, setFsMode] = useState('virtual');
  const vfs = useFileSystem(fsMode);
  const [workspaceDirId, setWorkspaceDirId] = useState('root');
  const [workspacePathStr, setWorkspacePathStr] = useState('/');
  const [isAutoSave, setIsAutoSave] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const saveTimeoutRef = useRef({});

  // 使用 ref 来存储最新的值，避免闭包问题
  const isMappedRef = useRef(isMapped);
  const workspaceDirIdRef = useRef(workspaceDirId);

  useEffect(() => {
    isMappedRef.current = isMapped;
    workspaceDirIdRef.current = workspaceDirId;
  }, [isMapped, workspaceDirId]);

  // 根据 items 物理介质列表解析内存。严格限制仅同步 JS/JSX。
  const loadWorkspaceFiles = useCallback(async (currentItems) => {
    // 只有映射开启，且当前浏览的目录 ID 确实是工作区确认的 ID 时，才执行解析
    if (!isMappedRef.current || vfs.state.currentId !== workspaceDirIdRef.current) return;

    try {
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
            const fileData = await vfs.operation.handleOpenFile(item);
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
  }, [vfs.operation, vfs.state.currentId]);

  // 监听 VFS。物理变动 + ID 匹配 + 映射开启 = 内存刷新。
  useEffect(() => {
    if (vfs.state.isReady && isMapped && vfs.state.currentId === workspaceDirId) {
      loadWorkspaceFiles(vfs.state.items);
    }
  }, [vfs.state.items, isMapped, workspaceDirId, vfs.state.currentId, vfs.state.isReady, loadWorkspaceFiles]);

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
          setWorkspaceDirId(savedDirId);
          setIsMapped(true);
          const pathArr = fsMode === 'virtual' ? fs.getPath(savedDirId) : vfs.state.breadcrumbs;
          setWorkspacePathStr(pathArr.map(p => p.name === 'root' ? '' : p.name).join('/') || '/');
        } catch(e) { /* 保持 root 映射 */ }
      }
    }
  }, [vfs.state.isReady, fsMode, vfs.state.breadcrumbs]);

  const triggerVfsSave = useCallback((fileName, content, isManual = false) => {
    if (!isMapped) return;
    if (saveTimeoutRef.current[fileName]) clearTimeout(saveTimeoutRef.current[fileName]);

    const delay = isManual ? 0 : 2000;
    saveTimeoutRef.current[fileName] = setTimeout(async () => {
      try {
        const lowerName = fileName.toLowerCase();
        let targetItem = physicalFiles.get(lowerName);
        let targetId = targetItem?.id;

        if (!targetItem) {
           const newItem = await vfs.operation.handleCreate({ type: FileType.FILE });
           if (newItem) {
              await vfs.operation.handleRename({
                 id: newItem.id, name: newItem.name, newName: fileName,
                 parentId: workspaceDirId, type: FileType.FILE
              });
              targetId = newItem.id;
           }
        }

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
    kernel.uploadResource(payload);
    alert.success(`应用指令已发送`);
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
             <Setting appCustomMapper={appCustomMapper} appMeta={appMeta} appTypes={appTypes} onUpdateAppMeta={updateAppMeta} onCreate={handleDevCenterCreate} onPreview={handlePreviewApp} uploadType={uploadType} setUploadType={setUploadType} />
          )}
        </div>
      )}
      <div className={style[bem.e('main-wrapper')]}>
        {activeMain === 'editor' && (
          <DevCenter files={files} activeFile={activeFile} logicCode={appMeta.logicCode} handleContentChange={handleContentChange} triggerVfsSave={triggerVfsSave} isMapped={isMapped} unsavedFiles={unsavedFiles} />
        )}
        {activeMain === 'preview' && <AppView app={previewApp} />}
        {activeMain === 'upload' && <Uploader appMeta={appMeta} uploadType={uploadType} />}
        {activeMain === 'helper' && <Helper />}
      </div>
    </div>
  );
}

export default memo(Developer);
