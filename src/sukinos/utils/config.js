/**
 * 核心字段键名映射（动态数据模型契约）：底层数据模型（IndexedDB / 物理文件）与前端逻辑靠这组常量解耦，
 * 内核解析（generateApp / generateWorker）与数据库寻址都严格取值于它们。
 * 改右侧字符串会连带改走 IndexedDB 主键 (keyPath) 与 Worker 解析正则，代价是旧数据的键名对不上、
 * 本地库里已存的记录读不到 —— 所以只在项目初始化或破坏性架构重构时改。
 */
/** DB_RES 与内存 resourceCache 的唯一键；parseWorkerCode 用它做动态正则锚点反解源码 */
export const ENV_KEY_RESOURCE_ID = 'resourceId';

/** DB_SYS（用户应用注册表）的唯一键，同时决定本地文件名 uuid-{name}.sukin-worker.js；同名即同一应用 */
export const ENV_KEY_NAME = 'name';

/** 为 true 时 Worker 内额外注入 Router 导航逻辑，可拦截 NAVIGATE；否则按单组件处理 */
export const ENV_KEY_IS_BUNDLE = 'isBundle';

/** 用户写的 Web Worker 逻辑层源码（initialState / reducer / init），generateWorker 原封注入模板底部 */
export const ENV_KEY_LOGIC = 'logic';

/** 渲染层源码（组件字符串树或多文件内容包），生成文件时 JSON.stringify 双重序列化并打上 resourceId 锚点 */
export const ENV_KEY_CONTENT = 'content';

/**
 * ENV_KEY_CONTENT 的预编译产物，结构一致（单文件字符串或多文件对象）。双份存储：CONTENT 留原始 JSX
 * （供调试 / 反编译 / 提取），本字段供运行时直接执行；缺失或执行失败时降级回原始 JSX 重编译。
 * 系统 APP 不生成此字段，始终走 JSX 编译链路。
 */
export const ENV_KEY_CONTENT_PRECOMPILED = 'precompiledContent';

/**
 * ENV_KEY_LOGIC 的预编译产物（commonjs，import 已变 require）。双份存储同上，
 * generateWorker 按「本字段 → ENV_KEY_LOGIC → 兜底 reducer」取值，所以未预编译的存量应用与系统 APP 行为不变。
 * 主块由内核按名字识别 initialState/reducer/init，因此原始源码不接受 export。
 */
export const ENV_KEY_LOGIC_PRECOMPILED = 'precompiledLogic';

/** 应用在外壳上的表现与系统级权限：authorId, icon, description, initialSize（窗口初始尺寸）, version, exposeState, saveState 等 */
export const ENV_KEY_META_INFO = 'metaInfo';

export const SUKIN_EXT = '.sukin-worker.js';
export const SUKIN_PRE = 'uuid-'
export const DB_INSTANCE_ID='SYSTEM-INSTANCE'

import {BASE_URL} from '/utils/js/getBaseUrl'
export const SUKINOS_STORE_REMOTE_BASE=BASE_URL
export const SUKINOS_STORE_REMOTE_TOTAL=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/appList`
export const SUKINOS_STORE_REMOTE_UPLOAD=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/upload`
export const SUKINOS_STORE_REMOTE_UPDATE=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/update`
export const SUKINOS_STORE_REMOTE_CHECK_UPDATES=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/checkUpdates`
export const SUKINOS_STORE_REMOTE_SEARCH=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/searchApp`
export const SUKINOS_STORE_REMOTE_MY_UPLOAD=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/myUpload`
export const SUKINOS_STORE_REMOTE_DELETE=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/delete`
export const SUKINOS_STORE_REMOTE_WITH_PERMISSION=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/appList/withPermission`
export const SUKINOS_STORE_REMOTE_AUTHORIZED=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/appList/authorized`

export const DEFAULT_USER_ID = 'default';
export const GUEST_INFO = {
  id: DEFAULT_USER_ID,
  role: 'guest',
  name: '游客',
  nickname: '游客用户',
};

export const createResDbConfig = (userId) => ({
  DB_NAME: `SukinOS_Res_${userId || DEFAULT_USER_ID}`,
  STORE_NAME: 'ui_bundles',
  KEY_PATH: ENV_KEY_RESOURCE_ID,
  VERSION: 1,
  INDEXES: [
    { name: ENV_KEY_NAME, keyPath: ENV_KEY_NAME, unique: false }
  ],
  autoTimestamp: true
});

export const createSysDbConfig = (userId) => ({
  DB_NAME: `SukinOS_Sys_${userId || DEFAULT_USER_ID}`,
  STORE_NAME: 'registry',
  KEY_PATH: ENV_KEY_NAME,
  VERSION: 1,
  INDEXES: [
    { name: 'pid', unique: true },
    { name: 'status', unique: false }
  ],
  autoTimestamp: true
});

export const DB_VFILE = {
  DB_NAME: 'SUKIN_OS_VFS',
  STORE_NAME: 'files',
  VERSION: 2,
  KEY_PATH: 'id',
  INDEXES: [
    { name: 'parentId', keyPath: 'parentId', unique: false },
    { name: 'parent_name_idx', keyPath: ['parentId', 'name'], unique: true }
  ]
};

export const createInstanceDbConfig = (userId) => ({// 存不能 JSON 化的实例（如文件句柄）
  DB_NAME: `SUKIN_STATE_INSTANCE_${userId || DEFAULT_USER_ID}`,
  STORE_NAME: 'instance',
  VERSION: 2,
  KEY_PATH: 'id',
})
// 系统 App 要持久化的用户数据也放这个库
export const DB_SYSTEM_APP='sukin_system_app'

export const FileType = {
  FILE: 1,
  DIRECTORY: 2
};

// 库名已按用户隔离（SukinOS_Sys_{userId} 等），只有 VFS 仍全局共享，所以名单里只剩它
export const SYSTEM_FS_NAME=['SUKIN_OS_VFS']
export const DefaultWindow = { x: 100, y: 100, w: 500, h: 400 };

export const WindowSize = (() => {
  if (typeof window === 'undefined') {
    return { ...DefaultWindow };
  }

  const cache = {
    x: window.screenX !== undefined ? window.screenX :
       window.screenLeft !== undefined ? window.screenLeft :
       DefaultWindow.x,
    y: window.screenY !== undefined ? window.screenY :
       window.screenTop !== undefined ? window.screenTop :
       DefaultWindow.y,
    w: window.visualViewport ? window.visualViewport.width :
       window.innerWidth ||
       document.documentElement?.clientWidth ||
       DefaultWindow.w,
    h: window.visualViewport ? window.visualViewport.height :
       window.innerHeight ||
       document.documentElement?.clientHeight ||
       DefaultWindow.h
  };

  let debounceTimer= null;
  const DEBOUNCE_DELAY = 3000;
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000;

  const updateCache = () => {
    const now = Date.now();

    if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
      return;
    }

    const visualViewport = window.visualViewport;
    const newW = visualViewport ? visualViewport.width :
                window.innerWidth ||
                document.documentElement?.clientWidth ||
                DefaultWindow.w;
    const newH = visualViewport ? visualViewport.height :
                window.innerHeight ||
                document.documentElement?.clientHeight ||
                DefaultWindow.h;

    // 只有在值变化超过1px时才更新
    if (Math.abs(newW - cache.w) > 1 || Math.abs(newH - cache.h) > 1) {
      cache.x = window.screenX !== undefined ? window.screenX :
               window.screenLeft !== undefined ? window.screenLeft :
               DefaultWindow.x;
      cache.y = window.screenY !== undefined ? window.screenY :
               window.screenTop !== undefined ? window.screenTop :
               DefaultWindow.y;
      cache.w = newW;
      cache.h = newH;
      lastUpdateTime = now;
    }
  };

  const scheduleUpdate = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      updateCache();
      debounceTimer = null;
    }, DEBOUNCE_DELAY);
  };

  const eventHandler = () => {
    scheduleUpdate();
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', eventHandler, { passive: true });
  }
  window.addEventListener('resize', eventHandler, { passive: true });

  // orientationchange 不防抖，立即更新
  window.addEventListener('orientationchange', () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    setTimeout(updateCache, 100);
  }, { passive: true });

  return cache;
})();

export const TRUTH_ALL_APP = true  // 扫到未注册的本地 worker 时是否补注册（僵尸文件）

export const DEFAULT_LAYOUT = `/*
      const {
          React, useState,
          useEffect, useMemo,
          useCallback, useRef,
          useContext,useReducer
        } = AppSDK || {};
      注意我们已经将常用注入到了App顶层中,请勿重新在顶层结构您可以在作用域块中解构更多您需要的其他未解构的数据
*/

    export const style = \`
      .nav { background: #f3f4f6; padding: 12px; display: flex; gap: 10px; border-bottom: 1px solid #dcdfe6; }
      .link { cursor: pointer; color: #007bff; font-weight: 500; }
      .body { padding: 20px; }
    \`;

export default ({ PageComponent, navigate, dispatch, state }) => {
  return (
  <div style={{height:'100%', display:'flex', flexDirection:'column'}}>
    <div className="nav">
      <span className="link" onClick={()=>navigate('home')}>Home</span>
      <span className="link" onClick={()=>navigate('about')}>About{/*默认没有产生这个组件文件,需要手动生成*/}</span>
    </div>
    <div>
        <button onClick={() => dispatch({type:"INCREMENT"})}>count++</button>
    </div>
    <div className="body">
      <PageComponent />
    </div>
  </div>
)}`;

export const DEFAULT_HOME = `export default ({ state }) => (
  <div>
    <h1>{state.message}</h1>
    <p>Counter: {state.count}</p>
  </div>
);`;

export const DEFAULT_LOGIC = `
const initialState = {
  count: 0,
  message: 'Hello World'
};

function reducer(state, action) {
  switch(action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    default:
      return state;
  }
}`;

// 测试账户相关:由于服务器容量较小,暂且不以api方式处理,后续可能会考虑
export const USER_ADMIN = {
  account: "Sukin",
  password: "sukinOs",
  code:'0110',
  phone:'18888888888'
}
//用于app用户个人习惯设置的mapper
export const appCustomMapper = {
  hasShortcut: '创建桌面图标',
  blockEd: '固定至状态栏',
  isFullScreen: '默认全屏启动',
  autoStart: '开机自动运行',
  allowResize: '允许调整窗口大小',
  showInLauncher: '在启动器中显示',
  backgroundSleep: '后台静默(暂停订阅)',
  adaptiveMount: '后台自适应挂载(不保存APP内部状态)',
  autoSaveStateInterval: '自动保存状态间隔(秒)',
  autoSaveWindowInterval: '自动保存窗口位置间隔(秒)'
}
//app用户个人习惯可选
export const appCustom = {
    hasShortcut: true,
    blockEd: false,
    isFullScreen: true,
    autoStart: false,
    allowResize: true,
    showInLauncher: false,
    backgroundSleep: false,
    adaptiveMount: false,
    autoSaveStateInterval: 0,
    autoSaveWindowInterval: 0,
}
//应用类似
export const appTypes = [
    { label: '编辑器应用', value: 'editor' },
    { label: '游戏应用', value: 'game' },
    { label: '工具应用', value: 'tool' }
];

//用于设置配置提示语
export const AppSettingTitles = [
    { label: '编辑器应用', value: 'editor'},
    { label: '游戏应用', value: 'game' },
    { label: '工具应用', value: 'tool' }
]
import {getLogoBase64Url} from "@/component/logo/layout";
export const DEFAULT_LOGO = getLogoBase64Url() || '/logo.jpg';
export const DEFAULT_USER_AVATOR_URL = 'https://sukin.top/media/avatars/user.jpg'
export const TRUSTED_CDN_WHITELIST=[
  // 全球CDN
  'https://unpkg.com/',
  'https://cdn.jsdelivr.net/',

  // 国内镜像/替代源
  'https://cdn.bytedance.com/',
  'https://lf3-cdn-tos.bytecdntp.com/cdn/',
  'https://cdn.bootcdn.net/',
  'https://cdn.bootcss.com/',
  'https://cdn.staticfile.org/',
  'https://g.alicdn.com/',
  'https://npm.elemecdn.com/',
];

export const preSystemFileData = [
  {
    id: 'system_1jpg',
    path:'/img/index/1.jpg'
  },
  {
    id: 'system_2jpg',
    path:'/img/index/2.jpg'
  },
    {
    id: 'system_3jpg',
    path:'/img/3.jpg'
  },
  {
    id: 'system_4jpeg',
    path:'/img/4.jpeg'
  },

  {
    id: 'system_2mp4',
    path:'/video/2.mp4'
  }
]

// 系统预置配置文件：与 preSystemFileData 不同，这里装系统运行所需的 JSON 配置，挂载时缺文件就直接写默认内容，免得被误删后功能失效。
// 布局文件按用户隔离：结构为 { [userId]: { [pid]: "row-col" } }
export const DESK_LAYOUT_FILENAME = 'deskbook-layout.json';
export const preSystemConfigFiles = [
  {
    id: 'system_desk_layout',
    name: DESK_LAYOUT_FILENAME,
    content: '{}' // 默认空布局，运行时按用户写入
  }
]

// 内置示例应用（预制文件）：与 preSystemFileData 一样只登记清单，正文放 resources/developer/template/sukinOS 下按文件读入。
// path 是相对示例根目录的路径，父级目录按 path 自动补建，不必在此登记。
// 挂载后根层直接是 layout.jsx / logic.jsx，开发者中心选这一个目录即可命中默认入口。
export const SAMPLE_APP_DIR = { id: 'system_sukinos_sample', name: '示例应用' };
export const preSystemSampleFiles = [
  { id: 'system_sample_layout', path: 'layout.jsx' },
  { id: 'system_sample_logic', path: 'logic.jsx' },
  { id: 'system_sample_page_home', path: 'pages/home/index.jsx' },
  { id: 'system_sample_page_about', path: 'pages/about/index.jsx' },
  { id: 'system_sample_page_contact', path: 'pages/contact/index.jsx' },
  { id: 'system_sample_page_windemo', path: 'pages/windowDemo/index.jsx' },
  { id: 'system_sample_counter', path: 'components/Counter.jsx' },
  { id: 'system_sample_sidebar', path: 'components/Sidebar.jsx' },
  { id: 'system_sample_button', path: 'components/ui/Button.jsx' },
  { id: 'system_sample_button_css', path: 'components/ui/Button.module.css' },
  { id: 'system_sample_store_counter', path: 'store/counter.js' },
  { id: 'system_sample_global_css', path: 'styles/global.css' },
  { id: 'system_sample_utils_format', path: 'utils/format.js' },
]

export const LOCAL_DEV_SYMPLE_LINKS={
      standard: 'https://sukin.top/api/resource/sukinos/static/vite.config.js',
      logic: 'https://sukin.top/api/resource/sukinos/static/sukinOsLocalDevSDK.zip'
    };

// 暂时这么处理后续增加选区认证，这是前端处理的硬性要求,禁止被获取到非root用户
export const ADMIN_APP_IDS = [
  'sys-systemManage'
]
