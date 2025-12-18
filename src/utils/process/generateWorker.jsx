//生成一个可以处理逻辑的worker和内存管理
export const generateWorker = (resId, name, isBundle, userLogicCode, content,metaInfo) => {
  //但是注意目前默认只解析单文件
  //同时注入metaInfo,方便对信息处理,但这里会出现文件版本对那个被放开,无法做篡改检测。
  const safeLogic = userLogicCode || `const initialState = {}; function reducer(s) { return s; }`;
  return `
/* 系统配置 */
const SYS_CONFIG = { resourceId: '${resId}', name: '${name}', isBundle: ${isBundle} };
const APP_METAINFO=${JSON.stringify(metaInfo)};
let _state = null;
/* 驱动 */
const broadcast = () => self.postMessage({ type: 'STATE_UPDATE', payload: { ..._state, config: SYS_CONFIG } });
const save = () => self.postMessage({ type: 'SAVE_STATE', payload: _state });
const dispatch = (action) => {
  let nextState = reducer(_state, action);
  //这个是注入整个关于内部router的操作
  if (SYS_CONFIG.isBundle && action.type === 'NAVIGATE') {
    const currentRouter = nextState.router || { path: 'home' };
    nextState = {
      ...nextState,
      router: { ...currentRouter, path: action.payload }
    };
  }

  if (nextState !== _state) {
    _state = nextState;
    broadcast();
    save();
  }
};

self.onmessage = (e) => {
  const { type, payload } = e.data;
  switch (type) {
    case 'INIT': {
      const base = typeof initialState === 'undefined' ? {} : initialState;
      if (SYS_CONFIG.isBundle && !base.router) {
        base.router = { path: 'home' };
      }
      _state = base;
      if (typeof init === 'function') {
        try {
          init(dispatch, _state);
        } catch (err) {
          // 错误处理
        }
      }
      broadcast();
      break;
    }
    case 'RESTORE': {
      _state = payload;
      broadcast();
      break;
    }
    case 'UI_ACTION':
    case 'APP_INTERACT':{
      dispatch(payload)
    }
    default:
      break;
  }
};

//注入原始组件
const ORGIN_COMPONENT=${JSON.stringify(content)}
Object.freeze(SYS_CONFIG);
Object.freeze(broadcast)
Object.freeze(save)
Object.freeze(ORGIN_COMPONENT)
Object.freeze(dispatch)

/* 用户逻辑 */
${safeLogic}

`;
};

/**
 * 从生成的 Worker 代码中反解析出用户逻辑和配置
 */export const parseWorkerCode = (workerCode) => {
  const result = {
    resourceId: null,
    name: null,
    isBundle: false,
    logic: null,
    initialState: null,
    content: null,
    hasReducer: false,
    hasInitFunction: false,
    originalCode: workerCode,
    metaInfo: null,
  };
  try {
    /* 1. 解析 SYS_CONFIG */
    const sysConfigMatch = workerCode.match(/const\s+SYS_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*\n/);

    if (sysConfigMatch) {
      try {
        const sysConfigStr = sysConfigMatch[1];
        const sysConfig = new Function(`return ${sysConfigStr}`)();
        result.resourceId = sysConfig.resourceId;
        result.name = sysConfig.name;
        result.isBundle = Boolean(sysConfig.isBundle);
      } catch (e) {
        const sysConfigStr = sysConfigMatch[1];
        const resourceIdMatch = sysConfigStr.match(/resourceId:\s*'([^']*)'/);
        const nameMatch = sysConfigStr.match(/name:\s*'([^']*)'/);
        const isBundleMatch = sysConfigStr.match(/isBundle:\s*(true|false)/);

        if (resourceIdMatch) result.resourceId = resourceIdMatch[1];
        if (nameMatch) result.name = nameMatch[1];
        if (isBundleMatch) result.isBundle = isBundleMatch[1] === 'true';
      }
    }

    /* 2. 提取用户逻辑部分 */
    const userLogicStart = workerCode.indexOf('/* 2. 用户逻辑 */');
    const userLogicEnd = workerCode.indexOf('/* 3. 驱动 */');

    if (userLogicStart !== -1 && userLogicEnd !== -1) {
      const userLogicCode = workerCode.substring(
        userLogicStart + '/* 2. 用户逻辑 */'.length,
        userLogicEnd
      ).trim();

      result.logic = userLogicCode;

      // 从用户逻辑中提取 initialState
      const initialStateMatch = userLogicCode.match(/const\s+initialState\s*=\s*([^;]+)(;?)/s);
      if (initialStateMatch) {
        try {
          result.initialState = new Function(`return ${initialStateMatch[1]}`)();
        } catch (e) {
          result.initialState = initialStateMatch[1];
        }
      }

      // 检查是否有 reducer 函数
      result.hasReducer = /function\s+reducer|const\s+reducer\s*=.*=>/s.test(userLogicCode);

      // 检查是否有 init 函数
      result.hasInitFunction = /function\s+init|const\s+init\s*=.*=>/s.test(userLogicCode);
    }

    /* 3. 在整个代码中搜索 ORGIN_COMPONENT */
    const originComponentMatch = workerCode.match(/const\s+ORGIN_COMPONENT\s*=\s*(\{[\s\S]*?\})(;?)/);
    if (originComponentMatch) {
      try {
        const valueStr = originComponentMatch[1].trim();
        // console.log('找到 ORGIN_COMPONENT:', valueStr.substring(0, 100) + '...');

        // 尝试解析为对象
        try {
          // 处理模板字符串
          const processedStr = valueStr.replace(/`([^`]*)`/gs, (match, content) => {
            return JSON.stringify(content);
          });

          result.content = new Function(`return ${processedStr}`)();
        } catch (funcError) {
          console.warn('Function 解析失败，尝试手动解析:', funcError);

          // 手动解析 layout 属性
          const layoutMatch = valueStr.match(/layout:\s*`([^`]*)`/s);
          if (layoutMatch) {
            result.content = {
              layout: layoutMatch[1]
            };
          } else {
            result.content = valueStr;
          }
        }
      } catch (e) {
        console.error('解析 ORGIN_COMPONENT 失败:', e);
        result.content = originComponentMatch[1];
      }
    } else {
      console.log('未找到 ORGIN_COMPONENT 定义');
    }

    if (result.isBundle) {
      const routerPathMatch = workerCode.match(/router:\s*\{\s*path:\s*['"]([^'"]*)['"]/);
      if (routerPathMatch) {
        result.defaultRoute = routerPathMatch[1];
      }
    }

    //解析app信息
    const AppMetaInfoMatch = workerCode.match(/const\s+APP_METAINFO\s*=\s*({[\s\S]*?})\s*;?\s*\n/);
    if (AppMetaInfoMatch) {
      try {
        const appMetaInfoStr = AppMetaInfoMatch[1];
        const appMetInfo = new Function(`return ${appMetaInfoStr}`)();
        result.metaInfo = JSON.parse(appMetInfo)
      } catch (e) {

      }
    }


    const messageHandlers = {
      INIT: /type\s*===\s*'INIT'/.test(workerCode),
      RESTORE: /type\s*===\s*'RESTORE'/.test(workerCode),
      UI_ACTION: /type\s*===\s*'UI_ACTION'/.test(workerCode)
    };
    result.messageHandlers = messageHandlers;

  } catch (error) {
    console.error('反解析 Worker 代码失败:', error);
    result.parseError = error.message;
  }

  return result;
};
