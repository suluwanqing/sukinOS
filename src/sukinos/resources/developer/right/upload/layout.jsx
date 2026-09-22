import { useState, useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadIcon from '@mui/icons-material/Upload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import kernel from "@/sukinos/utils/process/kernel"
import { selectorUserInfo, selectorStoreSettingStorePath } from "@/sukinos/store"
import { useSelector } from 'react-redux';
import { ENV_KEY_NAME, ENV_KEY_IS_BUNDLE, ENV_KEY_CONTENT, ENV_KEY_LOGIC, ENV_KEY_META_INFO } from '@/sukinos/utils/config';
import { buildAppEntries } from '@/sukinos/utils/entryConfig';
import { inspectEntryLayering, formatLayeringErrors } from '@/sukinos/utils/process/sourceMapper';
import permissionManageAPI from "@/apis/system/permissionManage";

const bem = createNamespace('upload');

function Uploader({ appMeta, uploadType, entryConfig }) {
  const storePath = useSelector(selectorStoreSettingStorePath)
  const userInfo = useSelector(selectorUserInfo)
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [registerToPool, setRegisterToPool] = useState(false);
  const [canRegister, setCanRegister] = useState(false);

  useEffect(() => {
    if (!userInfo?.id) return;
    permissionManageAPI.checkCanRegister().then(res => {
      if (res.code === 200 && (res.data?.canRegister || res.data?.can_register)) setCanRegister(true);
    }).catch(() => {});
  }, [userInfo?.id]);

  // 从 appMeta 中解构出内部运行时的 sysOptions
  const { appName, appIcon, sysOptions, ...restMetaInfo } = appMeta;
  // 入口识别结果随资源固化：运行时读的是 metaInfo.entries，不是导入方的本机配置
  const buildMetaInfo = (entries) => ({
    seed: Date.now().toString(),
    authorId: userInfo?.id,
    icon: appIcon,
    ...(entries ? { entries } : {}),
    ...restMetaInfo
  });

  // 合并 Redux 中取出的上下文配置到 sysOptions
  const finalSysOptions = { ...sysOptions, userInfo, storePath };

  const registerToPermissionPool = async (resourceId) => {
    if (!resourceId || !registerToPool) return;
    try {
      await permissionManageAPI.registerApp({
        resource_id: resourceId,
        permission_enabled: true,
      });
    } catch (e) {
      console.error("注册权限失败", e);
    }
  };

  // 入口名称仅用于提示文案，实际识别走 entryConfig 的模式匹配
  const viewName = entryConfig?.viewEntry || 'layout.jsx';
  const logicName = (entryConfig?.logicEntries || ['logic.jsx'])[0];

  const getUploadConfig = () => {
    switch (uploadType) {
      case 'logic': return { title: '上传单页 [含逻辑]', desc: `选择包含 ${viewName} 和 ${logicName} 的文件夹`, method: handleUploadLogic };
      case 'bundle': return { title: '上传多页面应用', desc: `选择包含多个 .jsx 文件和 ${viewName} 的文件夹`, method: handleUploadBundle };
      case 'file':
      default: return { title: '上传单文件应用', desc: '选择一个 .jsx 文件作为应用入口', method: handleUploadFile };
    }
  };

  const handleUploadFile = async () => {
    if (!window.showOpenFilePicker) throw new Error('您的浏览器不支持文件选择功能');
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSX / JS 文件', accept: { 'text/jsx': ['.jsx', '.js'] } }],
      multiple: false
    });
    const file = await fileHandle.getFile();
    const fileContent = await file.text();

    const resourceId = await kernel.uploadResource({
      sysOptions: finalSysOptions,
      [ENV_KEY_NAME]: appName || file.name.replace(/\.(jsx|js)$/, ''),
      [ENV_KEY_IS_BUNDLE]: false,
      [ENV_KEY_CONTENT]: fileContent,
      [ENV_KEY_LOGIC]: null,
      [ENV_KEY_META_INFO]: buildMetaInfo()
    });
    await registerToPermissionPool(resourceId);
  };

  // 发布前分层校验：违规以抛错形式汇入 handleMainAction 的错误通道，避免半截资源上传
  const assertLayering = (allFiles, resolved, logicMainCode = '') => {
    const errors = inspectEntryLayering({ files: allFiles, entries: resolved.entries, logicMainCode });
    if (errors.length) throw new Error(`分层校验未通过：${formatLayeringErrors(errors)}`);
  };

  // 递归遍历目录，收集所有 .jsx/.js/.css 文件，key 用相对路径（带扩展名）
  const collectFilesRecursively = async (dirHandle, prefix = '') => {
    const collected = {};
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        const sub = await collectFilesRecursively(entry, prefix ? `${prefix}/${entry.name}` : entry.name);
        Object.assign(collected, sub);
      } else if (entry.kind === 'file' && /\.(jsx|js|css)$/.test(entry.name)) {
        const file = await entry.getFile();
        const text = await file.text();
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        collected[relPath] = text;
      }
    }
    return collected;
  };

  const handleUploadBundle = async () => {
    if (!window.showDirectoryPicker) throw new Error('您的浏览器不支持文件夹选择功能');
    const handle = await window.showDirectoryPicker();

    const allFiles = await collectFilesRecursively(handle);
    const resolved = buildAppEntries(allFiles, entryConfig);
    if (!Object.keys(allFiles).some(k => /\.(jsx|js)$/.test(k))) throw new Error('文件夹中没有找到 .jsx / .js 文件');
    if (!resolved.viewFile) throw new Error(`文件夹中必须包含视图入口 ${viewName}`);
    assertLayering(allFiles, resolved, resolved.logicMainFile ? allFiles[resolved.logicMainFile] : '');

    const modules = {};
    for (const [relPath, text] of Object.entries(allFiles)) {
      // 主逻辑入口单独承载给 worker，不进内容包（内容包会被视图侧编译渲染）
      if (relPath === resolved.logicMainFile) continue;
      // CSS 文件保留 .css 后缀作为 key（供 import './style.css' / import styles from './style.module.css' 解析）
      // .jsx / .js 文件 key 用相对路径去扩展名（如 pages/about/index、components/Button）
      modules[/\.css$/.test(relPath) ? relPath : relPath.replace(/\.(jsx|js)$/, '')] = text;
    }

    const resourceId = await kernel.uploadResource({
      sysOptions: finalSysOptions,
      [ENV_KEY_NAME]: appName || handle.name,
      [ENV_KEY_IS_BUNDLE]: true,
      [ENV_KEY_CONTENT]: modules,
      [ENV_KEY_LOGIC]: resolved.logicMainFile ? allFiles[resolved.logicMainFile] : null,
      [ENV_KEY_META_INFO]: buildMetaInfo(resolved.entries)
    });
    await registerToPermissionPool(resourceId);
  };

  const handleUploadLogic = async () => {
    if (!window.showDirectoryPicker) throw new Error('您的浏览器不支持文件夹选择功能');
    const handle = await window.showDirectoryPicker();

    const rootFiles = {};
    for await (const entry of handle.values()) {
      if (entry.kind !== 'file' || !/\.(jsx|js)$/.test(entry.name)) continue;
      const file = await entry.getFile();
      rootFiles[entry.name] = await file.text();
    }
    const resolved = buildAppEntries(rootFiles, entryConfig);
    const viewPath = resolved.viewFile || resolved.mainFile;
    if (!viewPath) throw new Error(`文件夹中必须包含视图入口 ${viewName}`);
    if (!resolved.logicMainFile) throw new Error(`文件夹中必须包含逻辑入口 ${logicName}`);
    // 单页模式只把视图入口打进内容包，辅逻辑模块与主逻辑块 import 的目标都不会随资源走，worker 侧 require 必炸
    if (resolved.entries.logicAux.length) {
      throw new Error(`单页应用无法携带辅逻辑模块（${resolved.entries.logicAux.join('、')}），请改用多页面上传`);
    }
    // 校验对象换成真实载荷：整个文件夹都在本地，按它校验会放行那些其实发不出去的 import
    assertLayering({ [viewPath]: rootFiles[viewPath] }, resolved, rootFiles[resolved.logicMainFile] || '');

    const resourceId = await kernel.uploadResource({
      sysOptions: finalSysOptions,
      [ENV_KEY_NAME]: appName || handle.name,
      [ENV_KEY_IS_BUNDLE]: false,
      [ENV_KEY_CONTENT]: rootFiles[viewPath],
      [ENV_KEY_LOGIC]: rootFiles[resolved.logicMainFile],
      [ENV_KEY_META_INFO]: buildMetaInfo(resolved.entries)
    });
    await registerToPermissionPool(resourceId);
  };

  const handleMainAction = async () => {
    try {
      setIsUploading(true);
      setMessage('');
      const config = getUploadConfig();
      await config.method();
      setMessage(`上传成功: ${config.title}`);
      setMessageType('success');
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('用户取消了文件选择');
        setMessageType('error');
      } else {
        setMessage(`上传失败: ${error.message}`);
        setMessageType('error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const currentConfig = getUploadConfig();
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('card')]}>
        <div className={style[bem.e('card-header')]}>
          <FolderOpenIcon className={style[bem.e('card-icon')]} fontSize="large" />
          <h2 className={style[bem.e('card-title')]}>{currentConfig.title}</h2>
        </div>
        <p className={style[bem.e('card-description')]}>{currentConfig.desc}</p>
        <div className={style[bem.e('requirements')]}>
          <h4 className={style[bem.e('requirements-title')]}>格式要求：</h4>
          <ul className={style[bem.e('requirements-list')]}>
            {uploadType === 'file' && (
               <li className={style[bem.e('requirements-item')]}><span className={style[bem.e('requirements-bullet')]}>•</span>仅需选择单个 .jsx 文件</li>
            )}
            {(uploadType === 'bundle' || uploadType === 'logic') && (
              <>
                <li className={style[bem.e('requirements-item')]}><span className={style[bem.e('requirements-bullet')]}>•</span>目录必须包含 {viewName}</li>
                <li className={style[bem.e('requirements-item')]}><span className={style[bem.e('requirements-bullet')]}>•</span>{uploadType === 'logic' ? `目录必须包含 ${logicName}` : `${logicName} 为可选配置`}（可在设置-入口约定中调整）</li>
                <li className={style[bem.e('requirements-item')]}><span className={style[bem.e('requirements-bullet')]}>•</span>默认使用文件夹名称作为应用名</li>
              </>
            )}
          </ul>
        </div>
        {canRegister && (
          <div className={style[bem.e('register-option')]}>
            <label className={style[bem.e('register-label')]}>
              <input
                type="checkbox"
                checked={registerToPool}
                onChange={e => setRegisterToPool(e.target.checked)}
              />
              <span>上传后注册到权限控制池</span>
            </label>
          </div>
        )}
        <div className={style[bem.e('upload')]}>
          <button className={style[bem.e('upload-btn')]} onClick={handleMainAction} disabled={isUploading}>
            {isUploading ? (<><span className={style[bem.e('upload-spinner')]}></span>上传处理中...</>) : (<><UploadIcon fontSize="small"/>选择文件上传</>)}
          </button>
        </div>
        {message && (
          <div className={`${style[bem.e('message')]} ${style[bem.e(`message-${messageType}`)]}`}>
            {messageType === 'error' && <ErrorOutlineIcon fontSize="small"/>}
            {messageType === 'success' && <CheckCircleOutlineIcon fontSize="small"/>}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Uploader;