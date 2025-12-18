export const SUKIN_EXT = '.sukin-worker.js';
export const SUKIN_PRE='uuid-'
export const DB_RES = {
  DB_NAME: 'SukinOS_Res',
  STORE_NAME: 'ui_bundles',
  KEY_PATH: 'id',
  VERSION: 1,
  INDEXES: [
    { name: 'name', unique: false }
  ],
  autoTimestamp: true
};
export const DB_SYS = {
  DB_NAME: 'SukinOS_Sys',
  STORE_NAME: 'registry',
  KEY_PATH: 'name',
  VERSION: 1,
  INDEXES: [
    { name: 'pid', unique: true },
    { name: 'status', unique: false }
  ],
  autoTimestamp: true
};

export const FS_CONFIG = {
  DB_NAME: 'SUKIN_OS_VFS',
  STORE_NAME: 'files',
  VERSION: 2,
  KEY_PATH: 'id',
  INDEXES: [
    { name: 'parentId', keyPath: 'parentId', unique: false },
    { name: 'parent_name_idx', keyPath: ['parentId', 'name'], unique: true }
  ]
};
export const SYSTEM_FS_NAME=['SUKIN_OS_VFS','SukinOS_Sys','SukinOS_Res']
export const DefaultWindow = { x: 100, y: 100, w: 500, h: 400 };
export const WindowSize = (() => {
  if (typeof window === 'undefined') {
    return { ...DefaultWindow };
  }
  // 使用 visualViewport API 获取可视区域尺寸
  const visualViewport = window.visualViewport;
  return {
    x: window.screenX !== undefined ? window.screenX :
       window.screenLeft !== undefined ? window.screenLeft :
       DefaultWindow.x,
    y: window.screenY !== undefined ? window.screenY :
       window.screenTop !== undefined ? window.screenTop :
       DefaultWindow.y,
    w: visualViewport ? visualViewport.width :
       window.innerWidth ||
       (document && document.documentElement && document.documentElement.clientWidth) ||
       DefaultWindow.w,
    h: visualViewport ? visualViewport.height :
       window.innerHeight ||
       (document && document.documentElement && document.documentElement.clientHeight) ||
       DefaultWindow.h
  };
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
