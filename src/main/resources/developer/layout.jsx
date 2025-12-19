import { useState, useEffect, memo,useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import Uploader from './right/upload/layout';
import Login from './login/layout';
import DevCenter from './right/devCenter/layout';
import Config from './config/layout';
import AppView from './right/appView/layout';
import GetAppIcon from '@mui/icons-material/GetApp';
import Nav from "./nav/layout"
import CodeIcon from '@mui/icons-material/Code';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { selectorUserInfo, adminActions } from "@/store"
import { useDispatch, useSelector } from 'react-redux';
import Helper from './right/healper/layout';
import { DEFAULT_HOME, DEFAULT_LAYOUT, DEFAULT_LOGIC } from "@/utils/config"
import kernel from "@/utils/process/kernel"
/*
  注意这里我们为了能够擦稍微方便区分upload的部分单独在uoload。
  但是手写代码[即在编辑器开发的]重新写一个函数
*/
const bem = createNamespace('developer');
function Developer({ app }) {
  const dispatch = useDispatch();
  const [currentView, setCurrentView] = useState('login');
  const userInfo = useSelector(selectorUserInfo);
  const [isLogin, setIsLogin] = useState(false);
  const [uploadType, setUploadType] = useState('file');
  const [previewApp, setPreviewApp] = useState(null);

  const [files, setFiles] = useState({
    'layout.jsx': DEFAULT_LAYOUT,
    'home.jsx': DEFAULT_HOME,
  });
  const [activeFile, setActiveFile] = useState('layout.jsx');

  const [appMeta, setAppMeta] = useState({
    appName: '',
    appIcon: '/logo.jpg',
    initialSize: { w: 600, h: 450, x: 0, y: 0 },
    logicCode: DEFAULT_LOGIC,
    appType: 'editor',
    custom: {
      hasShortcut:true //注意这里先写死,如果有需要请自行处理
    }
  });
  const appTypes = [
    { label: '编辑器应用', value: 'editor' },
    { label: '游戏应用', value: 'game' },
    { label: '工具应用', value: 'tool' }
  ];

  useEffect(() => {
    const fileCount = Object.keys(files).length;
    if (fileCount > 1) {
      setUploadType('bundle');
    } else {
      setUploadType('file');
    }
  }, [files]);
   const cleanFiles = useMemo(() => {
      const result = {};
      for (const [key, value] of Object.entries(files)) {
        result[key.replace('.jsx', '')] = value;
      }
      return result;
    }, [files]);
 useEffect(() => {
  const loggedIn = userInfo?.devloper && Object.keys(userInfo.devloper).length !== 0;
  setIsLogin(loggedIn);

  if (loggedIn) {
    setCurrentView("devCenter");
  }
}, [userInfo]);

  // 统一更新 helper
  const updateAppMeta = (updates) => {
    setAppMeta(prev => ({ ...prev, ...updates }));
  };

  const handleChangeView = (view) => {
    setCurrentView(view);
  };

  const funcItems = [
    {
      id: 'dev-center',
      icon: <CodeIcon />,
      title: '开发者中心',
      onClick: () => handleChangeView('devCenter')
    },
    {
      id: 'upload',
      icon: <GetAppIcon />,
      title: '导入',
      onClick: () => handleChangeView('upload')
    },
    {
      id: 'preview',
      icon: <VisibilityIcon />,
      title: '应用预览',
      onClick: () => handleChangeView('preview'),
      hidden: !previewApp
    },
    {
      id: 'healper',
      icon: <MenuBookIcon />,
      title: '开发手册',
      onClick: () => handleChangeView('healper')
    },
  ];

  const handleDevCenterCreate = () => {
    if (!appMeta.appName) {
      alert("请输入应用名称");
      return;
    }

    let payload;

    if (uploadType !== 'bundle') {
        const content = cleanFiles[activeFile] || Object.values(cleanFiles)[0];
        payload = {
            name: appMeta.appName,
            isBundle: false,
            content: content,
            logic: appMeta.logicCode,
            metaInfo: {
                seed: Date.now().toString(),
                initialSize: appMeta.initialSize,
                icon: appMeta.appIcon,
                authorId: userInfo.userId,
              appType: appMeta.appType,
                custom:appMeta.custom
            }
        };
    } else {
        payload = {
            name: appMeta.appName,
             isBundle: true,
            content: cleanFiles,
            logic: appMeta.logicCode,
            metaInfo: {
                seed: Date.now().toString(),
                initialSize: appMeta.initialSize,
                icon: appMeta.appIcon,
                authorId: userInfo.userId,
              appType: appMeta.appType,
                  custom:appMeta.custom
            }
        };
    }
     kernel.uploadResource(payload)
     alert(`应用 "${appMeta.appName}" 创建指令已发送。`);
  };

  const handlePreviewApp = () => {
    let viewCodeForPreview = null;
    let filesForPreview = null;
    const isBundle = uploadType === 'bundle';

    if (isBundle) {
        filesForPreview = files;
    } else {
        viewCodeForPreview = files[activeFile] || Object.values(files)[0];
    }

    setPreviewApp({
      appName: appMeta.appName || '未命名应用',
      viewCode: viewCodeForPreview,
      files: filesForPreview,
      isBundle: isBundle,
      logicCode: appMeta.logicCode,
      initialSize: appMeta.initialSize,
      appIcon: appMeta.appIcon,
      // 预览时可能也需要 appType，虽然主要由 renderWindow 决定
      appType: appMeta.appType
    });
    setCurrentView('preview');
  };

  const handleLogin = (userId, name) => {
    //这里只是简单标记一下
    dispatch(adminActions.setUserInfo({ devloper: { userId, name } }))
       setCurrentView("editor");
  }

  const renderRightContent = () => {
    switch (currentView) {
      case 'upload':
        return (
          <Uploader
                appMeta={appMeta}
                uploadType={uploadType}
                initialSize={appMeta.initialSize}
                appName={appMeta.appName}
                appIcon={appMeta.appIcon}
            />
        );
      case 'healper':
        return <Helper/>;
      case 'preview':
        return <AppView app={previewApp} />;
      case 'devCenter':
      default:
        return (
          <DevCenter
            files={files}
            setFiles={setFiles}
            activeFile={activeFile}
            setActiveFile={setActiveFile}
            logicCode={appMeta.logicCode}
            onLogicCodeChange={(v) => updateAppMeta({ logicCode: v })}
          />
        );
    }
  }

  return (
    <div className={style[bem.b()]}>
      {isLogin && (
        <div className={style[bem.e('left')]}>
            <div className={style[bem.e('nav')]}>
              <Nav navItems={funcItems.filter(i => !i.hidden)} currentView={currentView} />
            </div>
            <div className={style[bem.e('config')]}>
              <Config
                appMeta={appMeta}
                appTypes={appTypes}
                onUpdateAppMeta={updateAppMeta}
                currentView={currentView}
                onCreate={handleDevCenterCreate}
                onPreview={handlePreviewApp}
                uploadType={uploadType}
                setUploadType={setUploadType}
              />
            </div>
        </div>
      )}
      <div className={style[bem.e('right')]}>
        {isLogin ? renderRightContent() : <Login onLogin={handleLogin} />}
      </div>
    </div>
  );
}

export default memo(Developer);


