import { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadIcon from '@mui/icons-material/Upload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import kernel from "@/utils/process/kernel"
import {selectorUserInfo} from "@/store"
import { useSelector } from 'react-redux';
const bem = createNamespace('upload');
function Uploader({ appMeta, uploadType}) {
  const userInfo = useSelector(selectorUserInfo)
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const getUploadConfig = () => {
    switch (uploadType) {
      case 'logic':
        return {
          title: '上传单页[含逻辑]',
          desc: '选择包含 layout.jsx 和 logic.jsx 的文件夹',
          method: handleUploadLogic
        };
      case 'bundle':
        return {
          title: '上传多页应用',
          desc: '选择包含多个 .jsx 文件和 layout.jsx 的文件夹',
          method: handleUploadBundle
        };
      case 'file':
      default:
        return {
          title: '上传单页文件',
          desc: '选择一个 .jsx 文件作为应用入口',
          method: handleUploadFile
        };
    }
  };

  const handleUploadFile = async () => {
    if (!window.showOpenFilePicker) throw new Error('您的浏览器不支持文件选择功能');
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSX 文件', accept: { 'text/jsx': ['.jsx'] } }],
      multiple: false
    });
    const file = await fileHandle.getFile();
    const fileContent = await file.text();
    kernel.uploadResource({
      name: appMeta.appName || file.name.replace('.jsx', ''),
      isBundle: false,
      content: fileContent,
      logic: null,
      metaInfo: {
        seed: Date.now().toString(),
        initialSize: appMeta.initialSize,
        icon: appMeta.appIcon,
        authorId: userInfo.userId,
        appType: appMeta.appType,
        custom: appMeta.custom
      }
    })
  };

  const handleUploadBundle = async () => {
    if (!window.showDirectoryPicker) throw new Error('您的浏览器不支持文件夹选择功能');
    const handle = await window.showDirectoryPicker();
    const modules = {};
    let logic = "";
    let hasLayout = false;
    let hasJsxFiles = false;

    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const text = await file.text();
        if (entry.name.endsWith('.jsx')) {
          hasJsxFiles = true;
          const moduleName = entry.name.replace('.jsx', '');
          modules[moduleName] = text;
          if (moduleName === 'layout') hasLayout = true;
        }
        if (entry.name === 'logic.jsx') logic = text;
      }
    }

    if (!hasJsxFiles) throw new Error('文件夹中没有找到 .jsx 文件');
    if (!hasLayout) throw new Error('文件夹中必须包含 layout.jsx 文件');
    if (!logic) logic = "const initialState={};\nfunction reducer(s){\n  return s;\n}";

     kernel.uploadResource( {
      name: appMeta.appName || handle.name,
      isBundle: true,
      content: modules,
      logic,
      metaInfo: {
        seed: Date.now().toString(),
        initialSize: appMeta.initialSize,
        icon: appMeta.appIcon,
        authorId: userInfo.userId,
            appType: appMeta.appType,
       custom: appMeta.custom
      }
    })
  };

  const handleUploadLogic = async () => {
    if (!window.showDirectoryPicker) throw new Error('您的浏览器不支持文件夹选择功能');
    const handle = await window.showDirectoryPicker();
    let content = "export default () => <div>Hello World</div>";
    let logic = "";
    let hasLayout = false;
    let hasLogic = false;

    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const fileName = entry.name;
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
    kernel.uploadResource({
      name: appMeta.appName || handle.name,
      isBundle: false,
      content,
      logic,
      metaInfo: {
        seed: Date.now().toString(),
        initialSize: appMeta.initialSize,
        icon: appMeta.appIcon,
        authorId: userInfo.userId,
            appType: appMeta.appType,
       custom: appMeta.custom
      }
    })
  };

  const handleMainAction = async () => {
    try {
      setIsUploading(true);
      setMessage('');
      const config = getUploadConfig();
      const payload = await config.method();

      window.dispatchEvent(new CustomEvent('kernel_call', {
        detail: { method: 'UPLOAD_RESOURCE', args: payload }
      }));

      setMessage(`成功: ${config.title}`);
      setMessageType('success');
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('用户取消了操作');
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
          <FolderOpenIcon className={style[bem.e('card-icon')]} />
          <h2 className={style[bem.e('card-title')]}>{currentConfig.title}</h2>
        </div>

        <p className={style[bem.e('card-description')]}>
          {currentConfig.desc}
        </p>

        <div className={style[bem.e('requirements')]}>
          <h4 className={style[bem.e('requirements-title')]}>当前模式要求：</h4>
          <ul className={style[bem.e('requirements-list')]}>
            {uploadType === 'file' && (
               <li className={style[bem.e('requirements-item')]}>
                <span className={style[bem.e('requirements-bullet')]}>•</span>
                仅需一个 .jsx 文件
               </li>
            )}
            {(uploadType === 'bundle' || uploadType === 'logic') && (
              <>
                <li className={style[bem.e('requirements-item')]}>
                  <span className={style[bem.e('requirements-bullet')]}>•</span>
                  必须包含 layout.jsx
                </li>
                <li className={style[bem.e('requirements-item')]}>
                  <span className={style[bem.e('requirements-bullet')]}>•</span>
                  {uploadType === 'logic' ? '必须包含 logic.jsx' : '可选 logic.jsx'}
                </li>
                <li className={style[bem.e('requirements-item')]}>
                  <span className={style[bem.e('requirements-bullet')]}>•</span>
                  文件夹名为应用名
                </li>
              </>
            )}
          </ul>
        </div>

        <div className={style[bem.e('upload')]}>
          <button
            className={style[bem.e('upload-btn')]}
            onClick={handleMainAction}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span className={style[bem.e('upload-spinner')]}></span>
                处理中...
              </>
            ) : (
              <>
                <UploadIcon />
                开始上传
              </>
            )}
          </button>
        </div>
        {message && (
          <div className={`${style[bem.e('message')]} ${style[bem.e(`message-${messageType}`)]}`}>
            {messageType === 'error' && <ErrorOutlineIcon />}
            {messageType === 'success' && <CheckCircleOutlineIcon />}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
export default  Uploader
