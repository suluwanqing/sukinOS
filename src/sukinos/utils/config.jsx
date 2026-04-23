/* ========================================================================================
 * 核心字段环境变量映射 [动态数据模型契约]
 *
 * 【架构说明】：
 * 为了实现底层数据模型 (IndexedDB / 物理文件) 与前端逻辑的彻底解耦，系统将所有 App 的核心属性键名
 * 抽象为以下常量。内核解析 (generateApp/Worker) 和数据库寻址将严格依赖这些常量获取数据。
 *
 * 【修改警告】：
 * 如果你修改了右侧的字符串值（例如将 'resourceId' 改为 'appId'），系统会自动同步修改 IndexedDB 的
 * 主键 (keyPath) 和 Worker 解析正则。但请注意：
 * 1. 之前基于旧名称存储的本地 IndexedDB 数据将会失效或产生游离！
 * 2. 建议仅在项目初始化、或系统版本产生重大架构重构 (破坏性更新) 时修改这些值。
 * ======================================================================================== */
/**
 * 资源唯一标识符 (Primary Key)
 * @role 核心主键。作为 DB_RES (资源数据库) 和内存 resourceCache 的唯一键。
 * @usage 在 parseWorkerCode 中作为动态正则匹配的锚点，确保源码能够被精准反序列化。
 */
export const ENV_KEY_RESOURCE_ID = 'resourceId';

/**
 * 应用名称与物理文件名标识 (Registry Key)
 * @role 注册表主键。作为 DB_SYS (用户应用注册表数据库) 的唯一键。
 * @usage 决定了本地文件系统中物理文件的名称前缀 (如 uuid-{name}.sukin-worker.js)。同一 name 视为同一应用。
 */
export const ENV_KEY_NAME = 'name';

/**
 * 模块化标记 (Boolean)
 * @role 决定应用是单组件 (Single Component) 还是支持路由的捆绑包 (Bundle)。
 * @usage 值为 true 时，Worker 内部会额外注入 Router 导航逻辑，允许拦截 NAVIGATE 动作。
 */
export const ENV_KEY_IS_BUNDLE = 'isBundle';

/**
 * 业务逻辑纯净代码 (String)
 * @role 承载用户编写的 Web Worker 纯 JS/逻辑层代码 (如 initialState, reducer, init 等)。
 * @usage 在 generateWorker 时被原封不动地注入到系统模板底部，隔离执行。
 */
export const ENV_KEY_LOGIC = 'logic';

/**
 * 界面视图源码 (Object / String)
 * @role 承载渲染层 (UI) 所需的 React 组件字符串树或布局模板。
 * @usage 在生成文件时会被 JSON.stringify 双重序列化保护，并打上 resourceId 锚点防篡改。
 */
export const ENV_KEY_CONTENT = 'content';

/**
 * 操作系统元数据 (Object)
 * @role 决定了应用在 SukinOS 桌面上的外部表象和系统级权限。
 * @usage 包含属性如：authorId, icon, description, initialSize (窗口初始尺寸), version, exposeState, saveState 等。
 */
export const ENV_KEY_META_INFO = 'metaInfo';
// ----------------------------------------------

export const SUKIN_EXT = '.sukin-worker.js';
export const SUKIN_PRE = 'uuid-'
export const DB_INSTANCE_ID='SYSTEM-INSTANCE'

//sukinos::store默认配置相关
export const SUKINOS_STORE_REMOTE_BASE="https://sukin.top/api"
export const SUKINOS_STORE_REMOTE_TOTAL=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/appList`
export const SUKINOS_STORE_REMOTE_UPLOAD=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/upload`
export const SUKINOS_STORE_REMOTE_CHECK_UPDATES=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/checkUpdates`
export const SUKINOS_STORE_REMOTE_SEARCH=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/searchApp`
export const SUKINOS_STORE_REMOTE_MY_UPLOAD=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/myUpload`
export const SUKINOS_STORE_REMOTE_DELETE=`${SUKINOS_STORE_REMOTE_BASE}/sukinos/app/delete`

export const DB_RES = {
  DB_NAME: 'SukinOS_Res',
  STORE_NAME: 'ui_bundles',
  KEY_PATH: ENV_KEY_RESOURCE_ID,
  VERSION: 1,
  INDEXES: [
    { name: ENV_KEY_NAME, keyPath: ENV_KEY_NAME, unique: false }
  ],
  autoTimestamp: true
};

export const DB_SYS = {
  DB_NAME: 'SukinOS_Sys',
  STORE_NAME: 'registry',
  KEY_PATH: ENV_KEY_NAME,
  VERSION: 1,
  INDEXES: [
    { name: 'pid', unique: true },
    { name: 'status', unique: false }
  ],
  autoTimestamp: true
};

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

export const DB_STATE_INSTANCE = {//存储有状态的instance。如文件句柄
  DB_NAME: 'SUKIN_STATE_INSTANCE',
  STORE_NAME: 'instance',
  VERSION: 2,
  KEY_PATH: 'id',
}

//文件类型标记
export const FileType = {
  FILE: 1,
  DIRECTORY: 2
};

export const SYSTEM_FS_NAME=['SUKIN_OS_VFS','SukinOS_Sys','SukinOS_Res','SUKIN_STATE_INSTANCE']
export const DefaultWindow = { x: 100, y: 100, w: 500, h: 400 };

export const WindowSize = (() => {
  if (typeof window === 'undefined') {
    return { ...DefaultWindow };
  }

  // 缓存值
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
  const DEBOUNCE_DELAY = 3000; // 3秒
  let lastUpdateTime = 0;
  const MIN_UPDATE_INTERVAL = 1000; // 最小更新间隔1秒

  // 更新函数
  const updateCache = () => {
    const now = Date.now();

    // 如果距离上次更新时间太短，跳过
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

  // 防抖处理
  const scheduleUpdate = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = window.setTimeout(() => {
      updateCache();
      debounceTimer = null;
    }, DEBOUNCE_DELAY);
  };

  // 监听事件
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

//决策相关
export const TRUTH_ALL_APP = true  //这个就是如果我们扫到了本地worker但是,他没有注册资源文件,是否注册

//默认组件开发代码
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
      .nav { background: var(--su-gray-100); padding: 12px; display: flex; gap: 10px; border-bottom: 1px solid var(--su-border-color); }
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
  showInLauncher: '在启动器中显示'
}
//app用户个人习惯可选
export const appCustom = {
    hasShortcut: true,
    blockEd: false,
    isFullScreen: true,
    autoStart: false,
    allowResize: true,
    showInLauncher: false,
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
    id: 'system_1mp4',
    path:'/video/1.mp4'
  },
  {
    id: 'system_2mp4',
    path:'/video/2.mp4'
  }
]

export const LOCAL_DEV_SYMPLE_LINKS={
      standard: 'https://sukin.top/api/resource/sukinos/static/vite.config.js',
      logic: 'https://sukin.top/api/resource/sukinos/static/sukinOsLocalDevSDK.zip'
    };
// 暂时这么处理后续增加选区认证
export const ADMIN_APP_IDS = [
  'sys-system-userManage-demo'
]
