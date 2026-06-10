import { useState, useEffect, useCallback, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useSelector } from 'react-redux';
import { selectorUserInfo, selectorStoreSettingStorePath } from '@/sukinos/store';
import { sukinOs as sukinApi } from '@/apis/main';
import { extUpdateCloud } from '@/sukinos/utils/process/generateApp';
import { parseWorkerCode } from '@/sukinos/utils/process/generateWorker';
import RenderProcess from '@/sukinos/utils/process/renderProcess';
import { confirm } from '@/component/confirm/layout';
import kernel from '@/sukinos/utils/process/kernel';
import {
  ENV_KEY_NAME,
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config';

const bem = createNamespace('dev-update');

const buildPreviewFromSource = (source) => {
  if (!source) return null;
  if (source.isBundle && source.content && typeof source.content === 'object') {
    return {
      localFiles: source.content,
      logicCode: source.logic || '',
      isBundle: true
    };
  }
  const viewCode = typeof source.content === 'string' ? source.content : '';
  return {
    localFiles: { 'main.jsx': viewCode },
    logicCode: source.logic || '',
    isBundle: false
  };
};

const buildPreviewFromWorker = (workerCode) => {
  if (!workerCode) return null;
  const parsed = parseWorkerCode(workerCode);
  const isBundle = Boolean(parsed?.[ENV_KEY_IS_BUNDLE]);
  const content = parsed?.[ENV_KEY_CONTENT];
  const logicCode = parsed?.[ENV_KEY_LOGIC] || '';

  if (isBundle && content && typeof content === 'object') {
    const restoredFiles = {};
    for (const [k, v] of Object.entries(content)) {
      const keyWithExt = k.endsWith('.jsx') || k.endsWith('.js') ? k : `${k}.jsx`;
      restoredFiles[keyWithExt] = v;
    }
    return { localFiles: restoredFiles, logicCode, isBundle: true };
  }
  const viewCode = typeof content === 'string' ? content : '';
  return { localFiles: { 'main.jsx': viewCode }, logicCode, isBundle: false };
};

function UpdatePreviewModal({ open, app, source, onClose, onConfirmPreview }) {
  const [oldPreview, setOldPreview] = useState(null);
  const [newPreview, setNewPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  const [previewState, setPreviewState] = useState({});
  const [compiling, setCompiling] = useState(false);
  const [compileErr, setCompileErr] = useState('');

  const previewSeed = useMemo(() => `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, [app?.resourceId, source]);

  useEffect(() => {
    if (!open || !app || !source) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setErrorMsg('');
      setActiveTab('new');
      try {
        const workerCode = await sukinApi.app.downLoadApp({ url: app.url });
        if (cancelled) return;

        const oldData = buildPreviewFromWorker(workerCode);
        const newData = buildPreviewFromSource(source);

        setOldPreview(oldData);
        setNewPreview(newData);
      } catch (e) {
        if (!cancelled) setErrorMsg('预览加载失败: ' + (e.message || '网络或解析错误'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, app, source]);

  if (!open) return null;

  return (
    <div className={style[bem.e('modal')]}>
      <div className={style[bem.e('modal-mask')]} onClick={onClose} />
      <div className={style[bem.e('modal-panel')]} role="dialog" aria-modal="true">
        <div className={style[bem.e('modal-header')]}>
          <div className={style[bem.e('modal-title')]}>
            应用更新预览核验
          </div>
          <button className={style[bem.e('modal-close')]} onClick={onClose}>&times;</button>
        </div>

        <div className={style[bem.e('modal-tabs')]}>
          <button
            className={`${style[bem.e('tab-btn')]} ${activeTab === 'new' ? style[bem.e('tab-btn--active')] : ''}`}
            onClick={() => setActiveTab('new')}
            disabled={loading || !!errorMsg}
          >
            新版本 (本地)
          </button>
          <button
            className={`${style[bem.e('tab-btn')]} ${activeTab === 'old' ? style[bem.e('tab-btn--active')] : ''}`}
            onClick={() => setActiveTab('old')}
            disabled={loading || !!errorMsg}
          >
            旧版本 (云端)
          </button>
        </div>

        <div className={style[bem.e('modal-body')]}>
          {loading && (
            <div className={style[bem.e('modal-loading')]}>
              <div className={style[bem.e('spinner')]}></div>
              <span>正在拉取云端代码并构建沙箱...</span>
            </div>
          )}
          {!loading && errorMsg && (
            <div className={style[bem.e('modal-error')]}>
              <ErrorOutlineIcon fontSize="large" />
              <span>{errorMsg}</span>
            </div>
          )}
          {!loading && !errorMsg && (
            <div className={style[bem.e('preview-container')]}>
              <div
                className={`${style[bem.e('preview-wrapper')]} ${activeTab === 'new' ? style[bem.e('preview-wrapper--active')] : style[bem.e('preview-wrapper--inactive')]}`}
                id={`proc-new-${previewSeed}`}
              >
                <RenderProcess
                  key={`new-${previewSeed}`}
                  localFiles={newPreview?.localFiles || {}}
                  localLogicCode={newPreview?.logicCode || ''}
                  previewId={`new-${previewSeed}`}
                  onStateChange={setPreviewState}
                  onLogAction={() => {}}
                  onCompileStart={() => setCompiling(true)}
                  onCompileEnd={() => setCompiling(false)}
                  onCompileError={setCompileErr}
                />
              </div>
              <div
                className={`${style[bem.e('preview-wrapper')]} ${activeTab === 'old' ? style[bem.e('preview-wrapper--active')] : style[bem.e('preview-wrapper--inactive')]}`}
                id={`proc-old-${previewSeed}`}
              >
                <RenderProcess
                  key={`old-${previewSeed}`}
                  localFiles={oldPreview?.localFiles || {}}
                  localLogicCode={oldPreview?.logicCode || ''}
                  previewId={`old-${previewSeed}`}
                  onStateChange={setPreviewState}
                  onLogAction={() => {}}
                  onCompileStart={() => setCompiling(true)}
                  onCompileEnd={() => setCompiling(false)}
                  onCompileError={setCompileErr}
                />
              </div>
            </div>
          )}
        </div>

        <div className={style[bem.e('modal-footer')]}>
          <div className={style[bem.e('footer-hint')]}>提示: 切换顶部 Tab 以在后台无缝比对差异，导航交互状态将完美保留。</div>
          <div className={style[bem.e('footer-actions')]}>
            <button className={style[bem.e('btn-ghost')]} onClick={onClose}>取消</button>
            <button
              className={style[bem.e('btn-solid')]}
              onClick={() => { onConfirmPreview(); onClose(); }}
              disabled={loading || !!errorMsg}
            >
              确认更新内容无误
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdatePanel({ appMeta, uploadType }) {
  const storePath = useSelector(selectorStoreSettingStorePath);
  const userInfo = useSelector(selectorUserInfo);
  const [myUploads, setMyUploads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewedId, setPreviewedId] = useState(null);
  const [updateSources, setUpdateSources] = useState({});
  const [previewTarget, setPreviewTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { appName, appIcon, sysOptions, ...restMetaInfo } = appMeta;
  const baseMetaInfo = {
    seed: Date.now().toString(),
    authorId: userInfo?.id,
    icon: appIcon,
    ...restMetaInfo
  };
  const finalSysOptions = { ...sysOptions, userInfo, storePath };

  const refreshUploads = useCallback(async () => {
    if (!userInfo?.id) return;
    setIsLoading(true);
    setMessage('');
    try {
      const res = await sukinApi.app.getMyUploadApps({ url: storePath?.myUploadUrl });
      if (res.code === 200) {
        setMyUploads(res.data || []);
      } else {
        setMessage(res.message || '获取失败');
        setMessageType('error');
      }
    } catch (e) {
      setMessage('获取失败');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  }, [storePath?.myUploadUrl, userInfo?.id]);

  useEffect(() => {
    refreshUploads();
  }, [refreshUploads]);

  const pickUploadSource = async () => {
    if (uploadType === 'file') {
      if (!window.showOpenFilePicker) throw new Error('您的浏览器不支持文件选择功能');
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'JSX 文件', accept: { 'text/jsx': ['.jsx'] } }],
        multiple: false
      });
      const file = await fileHandle.getFile();
      const fileContent = await file.text();
      return { isBundle: false, content: fileContent, logic: null };
    }

    if (!window.showDirectoryPicker) throw new Error('您的浏览器不支持文件夹选择功能');
    const handle = await window.showDirectoryPicker();

    if (uploadType === 'bundle') {
      const modules = {};
      let logic = "";
      let hasLayout = false;
      let hasJsxFiles = false;

      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const text = await file.text();
          if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
            hasJsxFiles = true;
            modules[entry.name] = text;
            if (entry.name.replace(/\.(jsx|js)$/, '') === 'layout') hasLayout = true;
          }
          if (entry.name.toLowerCase() === 'logic.jsx' || entry.name.toLowerCase() === 'logic.js') {
            logic = text;
          }
        }
      }

      if (!hasJsxFiles) throw new Error('文件夹中没有找到视图文件');
      if (!hasLayout) throw new Error('多页面应用必须包含 layout.jsx 入口');
      if (!logic) logic = "const initialState={};\nfunction reducer(s){\n  return s;\n}";

      return { isBundle: true, content: modules, logic };
    }

    let content = "export default () => <div>Hello World</div>";
    let logic = "";
    let hasLayout = false;
    let hasLogic = false;

    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const fileName = entry.name.toLowerCase();
        if (fileName === 'layout.jsx' || fileName === 'logic.jsx') {
          const file = await entry.getFile();
          const text = await file.text();
          if (fileName === 'layout.jsx') {
            hasLayout = true;
            content = text;
          } else if (fileName === 'logic.jsx') {
            hasLogic = true;
            logic = text;
          }
        }
      }
    }
    if (!hasLayout || !hasLogic) throw new Error('文件夹中必须包含 layout.jsx 和 logic.jsx 文件');

    return { isBundle: false, content, logic };
  };

  const selectApp = (resourceId) => {
    setSelectedId(resourceId);
    setMessage('');
    setMessageType('');
    if (previewedId && previewedId !== resourceId) setPreviewedId(null);
  };

  const handleSelectSource = async (e, resourceId) => {
    e.stopPropagation();
    try {
      const source = await pickUploadSource();
      setUpdateSources(prev => ({ ...prev, [resourceId]: source }));
      if (previewedId === resourceId) setPreviewedId(null);
      selectApp(resourceId);
      setMessage('');
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('取消文件选择');
      } else {
        setMessage(`选择失败: ${error.message}`);
      }
      setMessageType('error');
    }
  };

  const openPreview = (e, app) => {
    e.stopPropagation();
    const source = updateSources[app.resourceId];
    if (!source) {
      setMessage('请先选择本地更新文件');
      setMessageType('error');
      return;
    }
    setPreviewTarget({ app, source });
  };

  const markPreviewed = (resourceId) => {
    setPreviewedId(resourceId);
  };

  const runUpdate = async () => {
    setIsUpdating(true);
    setMessage('');
    try {
      const app = myUploads.find(item => item.resourceId === selectedId);
      if (!app) throw new Error('目标应用不存在');
      const source = updateSources[app.resourceId];

      let cleanContent = source.content;
      if (source.isBundle && typeof source.content === 'object') {
        cleanContent = {};
        for (const [k, v] of Object.entries(source.content)) {
          cleanContent[k.replace(/\.(jsx|js)$/, '')] = v;
        }
      }

      const mergedMeta = { ...(app.metaInfo || {}), ...baseMetaInfo };
      await extUpdateCloud(kernel, {
        resource: {
          [ENV_KEY_NAME]: app.appName || appName,
          [ENV_KEY_RESOURCE_ID]: app.resourceId,
          [ENV_KEY_IS_BUNDLE]: source.isBundle,
          [ENV_KEY_CONTENT]: cleanContent,
          [ENV_KEY_LOGIC]: source.logic,
          [ENV_KEY_META_INFO]: mergedMeta
        },
        sysOptions: finalSysOptions
      });
      setMessage('应用更新部署已完成！');
      setMessageType('success');
      setSelectedId(null);
      setPreviewedId(null);
      setUpdateSources({});
      refreshUploads();
    } catch (error) {
      setMessage('更新失败: ' + error.message);
      setMessageType('error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSelected = () => {
    if (!finalSysOptions?.shouldUpload) {
      setMessage('请先开启云端上传');
      setMessageType('error');
      return;
    }
    if (!selectedId) {
      setMessage('请在列表中选择要更新的应用');
      setMessageType('error');
      return;
    }
    const source = updateSources[selectedId];
    if (!source) {
      setMessage('尚未为该应用选择本地更新文件');
      setMessageType('error');
      return;
    }
    if (previewedId !== selectedId) {
      setMessage('为了保证更新质量，请先点击预览确认');
      setMessageType('error');
      return;
    }
    confirm.show({
      title: '确认提交更新',
      content: '即将使用新版本覆盖云端，应用商店中的所有用户将收到此更新。是否继续？',
      onConfirm: () => runUpdate(),
      onCancel: () => {}
    });
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <div className={style[bem.e('header-icon')]}>
          <FolderOpenIcon fontSize="medium" />
        </div>
        <div className={style[bem.e('header-text')]}>
          <div className={style[bem.e('title')]}>应用云端更新与部署</div>
          <div className={style[bem.e('desc')]}>提供安全的热更新机制，更新前强制双开沙箱预览比对验证。</div>
        </div>
      </div>

      <div className={style[bem.e('grid')]}>
        <div className={style[bem.e('column')]}>
          <div className={style[bem.e('column-header')]}>
            <div className={style[bem.e('column-title')]}>我发布的应用</div>
            <button className={style[bem.e('ghost-btn')]} onClick={refreshUploads} disabled={isLoading}>
              刷新列表
            </button>
          </div>

          <div className={style[bem.e('list')]}>
            {myUploads.length === 0 ? (
              <div className={style[bem.e('empty')]}>
                {isLoading ? '加载中...' : '暂无可更新的线上应用'}
              </div>
            ) : (
              myUploads.map(app => {
                const isSelected = selectedId === app.resourceId;
                const hasFile = !!updateSources[app.resourceId];
                const isPreviewed = previewedId === app.resourceId;
                return (
                  <div
                    key={app.resourceId}
                    className={`${style[bem.e('row')]} ${isSelected ? style[bem.e('row--active')] : ''}`}
                    onClick={() => selectApp(app.resourceId)}
                  >
                    <div className={style[bem.e('row-left')]}>
                      <label className={style[bem.e('row-check')]}>
                        <input
                          type="radio"
                          name="dev-update-select"
                          checked={isSelected}
                          readOnly
                        />
                      </label>
                      <div className={style[bem.e('row-main')]}>
                        <div className={style[bem.e('row-name')]}>{app.appName}</div>
                        <div className={style[bem.e('row-meta')]}>线上版本: v{app.version}</div>
                      </div>
                    </div>

                    <div className={style[bem.e('row-actions')]}>
                      <div className={style[bem.e('state-badges')]}>
                        <span className={`${style[bem.e('badge')]} ${hasFile ? style[bem.e('badge--success')] : ''}`}>
                          {hasFile ? '已挂载本地' : '待挂载文件'}
                        </span>
                        <span className={`${style[bem.e('badge')]} ${isPreviewed ? style[bem.e('badge--primary')] : ''}`}>
                          {isPreviewed ? '已通过核验' : '待预览核验'}
                        </span>
                      </div>
                      <div className={style[bem.e('btn-group')]}>
                        <button
                          className={style[bem.e('action-btn')]}
                          onClick={(e) => handleSelectSource(e, app.resourceId)}
                        >
                          <FileUploadIcon fontSize="inherit" />
                          重载文件
                        </button>
                        <button
                          className={`${style[bem.e('action-btn')]} ${style[bem.e('action-btn--primary')]}`}
                          onClick={(e) => openPreview(e, app)}
                          disabled={!hasFile}
                        >
                          <VisibilityIcon fontSize="inherit" />
                          对比预览
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className={style[bem.e('footer')]}>
        <div className={style[bem.e('msg-container')]}>
          {message && (
            <div className={`${style[bem.e('message')]} ${style[bem.e(`message-${messageType}`)]}`}>
              {messageType === 'error' && <ErrorOutlineIcon fontSize="small" />}
              {messageType === 'success' && <CheckCircleOutlineIcon fontSize="small" />}
              {message}
            </div>
          )}
        </div>
        <button
          className={style[bem.e('update-btn')]}
          onClick={handleUpdateSelected}
          disabled={isUpdating || isLoading || !selectedId || previewedId !== selectedId}
        >
          {isUpdating ? '部署中...' : '确认发布更新'}
        </button>
      </div>

      <UpdatePreviewModal
        open={!!previewTarget}
        app={previewTarget?.app}
        source={previewTarget?.source}
        onClose={() => setPreviewTarget(null)}
        onConfirmPreview={() => { if (previewTarget?.app?.resourceId) markPreviewed(previewTarget.app.resourceId); }}
      />
    </div>
  );
}

export default UpdatePanel;
