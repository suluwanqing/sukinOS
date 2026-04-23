import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config'
import {
  getWorkerSandboxPreamble,
  createStorageProxy,
  createIndexedDBProxy,
  createSecureFetch
} from '@/sukinos/utils/security'

/**
 * 内部辅助：生成唯一且复杂的区块标记位
 */
const getMarkers = (key) => ({
  start: `/* <<<SUKIN_OS_${key}_BLOCK_START_V2>>> */`,
  end: `/* <<<SUKIN_OS_${key}_BLOCK_END_V2>>> */`
});

/**
 * 内部辅助：精准截取标记位之间的内容
 * 不使用正则表达式，直接通过字符串索引查找，性能最优且最安全
 */
const extractByMarkers = (source, key) => {
  const { start, end } = getMarkers(key);
  const sIdx = source.indexOf(start);
  const eIdx = source.indexOf(end);
  if (sIdx !== -1 && eIdx !== -1) {
    return source.substring(sIdx + start.length, eIdx).trim();
  }
  return null;
};

/**
 * 生成 Worker 代码
 */
export const generateWorker = (args) => {
  const resId = args?.[ENV_KEY_RESOURCE_ID];
  const name = args?.[ENV_KEY_NAME];
  const isBundle = args?.[ENV_KEY_IS_BUNDLE];
  const userLogicCode = args?.[ENV_KEY_LOGIC];
  const content = args?.[ENV_KEY_CONTENT];
  const metaInfo = args?.[ENV_KEY_META_INFO];

  const safeLogic = userLogicCode || `const initialState = {}; function reducer(s) { return s; }`;

  // 将 SDK 中的代理逻辑函数源码提取出来 (包含 fetch)
  const storageProxySource = createStorageProxy.toString();
  const indexedDBProxySource = createIndexedDBProxy.toString();
  const secureFetchSource = createSecureFetch.toString();

  // 精细标记位，用于物理隔离数据块
  const mSys = getMarkers('SYS_CONFIG');
  const mMeta = getMarkers('APP_METAINFO');
  const mComp = getMarkers('ORIGIN_COMPONENT');
  const mLogic = getMarkers('USER_LOGIC');

  const sysConfigObj = {
    [ENV_KEY_RESOURCE_ID]: resId,
    [ENV_KEY_NAME]: name,
    [ENV_KEY_IS_BUNDLE]: isBundle
  };

  return `
// 调用 security 模块提供的 Preamble 接口
${getWorkerSandboxPreamble(resId, storageProxySource, indexedDBProxySource, secureFetchSource)}

/* --- 进入 Worker 沙箱块级作用域 --- */
{
  const window = _safeGlobalProxy;
  const self = _safeGlobalProxy;
  const globalThis = _safeGlobalProxy;

  const eval = _safeGlobalProxy.eval;
  const Function = _safeGlobalProxy.Function;
  const setTimeout = _safeGlobalProxy.setTimeout;
  const setInterval = _safeGlobalProxy.setInterval;
  const fetch = _safeGlobalProxy.fetch;
  const indexedDB = _safeGlobalProxy.indexedDB;
  const navigator = _safeGlobalProxy.navigator;
  const URL = _safeGlobalProxy.URL;
  const Blob = _safeGlobalProxy.Blob;

  const XMLHttpRequest = undefined;
  const importScripts = undefined;

  /* 系统配置核心块 */
  const SYS_CONFIG = ${mSys.start}${JSON.stringify(sysConfigObj)}${mSys.end};

  /* 应用元数据块 */
  const APP_METAINFO = ${mMeta.start}${JSON.stringify(metaInfo)}${mMeta.end};

  let _state = null;

  /* 基本驱动代码 */
  const broadcast = () => _safeGlobalProxy.postMessage({ type: 'STATE_UPDATE', payload: { ..._state, config: SYS_CONFIG } });
  const save = () => _safeGlobalProxy.postMessage({ type: 'SAVE_STATE', payload: _state });
  const dispatch = (action) => {
    try {
      // 安全获取 reducer，防止用户漏写导致 Worker 直接抛出异常静默死机！
      const reducerFn = typeof reducer === 'function' ? reducer : (s) => s;
      let nextState = reducerFn(_state, action);

      //这个是注入整个关于内部router的操作
      if (SYS_CONFIG["${ENV_KEY_IS_BUNDLE}"] && action.type === 'NAVIGATE') {
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
    } catch (err) {
      console.error('[Worker] dispatch 执行出错:', err);
    }
  };

  _safeGlobalProxy.onmessage = (e) => {
    const { type, payload } = e.data;
    switch (type) {
      case 'INIT': {
        try {
          // 安全获取 initialState
          const base = typeof initialState === 'undefined' ? {} : initialState;
          if (SYS_CONFIG["${ENV_KEY_IS_BUNDLE}"] && !base.router) {
            base.router = { path: 'home' };
          }
          _state = base;
        } catch (err) {
          _state = {};
        }

        if (typeof init === 'function') {
          try {
            init(dispatch, _state);
          } catch (err) {
            // 错误处理
            console.error('[Worker] init 执行出错:', err);
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
      dispatch(payload);
        break; // 确保加上 break，防止穿透
      }
      default:
        break;
    }
  };

  // 注入原始组件资源块
  const ORIGIN_COMPONENT = ${mComp.start}${JSON.stringify(content)}${mComp.end};

  Object.freeze(SYS_CONFIG);
  Object.freeze(broadcast);
  Object.freeze(save);
  Object.freeze(ORIGIN_COMPONENT);
  Object.freeze(dispatch);

  /* 用户逻辑逻辑块 */
  ${mLogic.start}
  ${safeLogic}
  ${mLogic.end}
}
`;
};


/**
 * 从生成的 Worker 代码中反解析出用户逻辑和配置
 */
export const parseWorkerCode = (workerCode) => {
  const result = {
    [ENV_KEY_RESOURCE_ID]: null,
    [ENV_KEY_NAME]: null,
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_LOGIC]: null,
    initialState: null,
    [ENV_KEY_CONTENT]: null,
    hasReducer: false,
    hasInitFunction: false,
    originalCode: workerCode,
    [ENV_KEY_META_INFO]: null,
  };

  if (!workerCode) return result;

  try {
    /* 解析 SYS_CONFIG  */
    const sysRaw = extractByMarkers(workerCode, 'SYS_CONFIG');
    if (sysRaw) {
      const sysConfig = JSON.parse(sysRaw);
      result[ENV_KEY_RESOURCE_ID] = sysConfig[ENV_KEY_RESOURCE_ID];
      result[ENV_KEY_NAME] = sysConfig[ENV_KEY_NAME];
      result[ENV_KEY_IS_BUNDLE] = Boolean(sysConfig[ENV_KEY_IS_BUNDLE]);
    }

    /* 解析 APP_METAINFO  */
    const metaRaw = extractByMarkers(workerCode, 'APP_METAINFO');
    if (metaRaw) {
      result[ENV_KEY_META_INFO] = JSON.parse(metaRaw);
    }

    /* 解析 ORIGIN_COMPONENT  */
    const componentRaw = extractByMarkers(workerCode, 'ORIGIN_COMPONENT');
    if (componentRaw) {
      result[ENV_KEY_CONTENT] = JSON.parse(componentRaw);
    }

    /* 提取用户逻辑代码 */
    const userLogicCode = extractByMarkers(workerCode, 'USER_LOGIC');
    if (userLogicCode) {
      result[ENV_KEY_LOGIC] = userLogicCode;

      // 提取内部的 initialState 对象
      const initialStateMatch = userLogicCode.match(/const\s+initialState\s*=\s*([^;]+)(;?)/s);
      if (initialStateMatch) {
        try {
          // 尝试使用 Function 还原对象
          result.initialState = new Function(`return ${initialStateMatch[1]}`)();
        } catch (e) {
          result.initialState = initialStateMatch[1].trim();
        }
      }

      // 检测核心函数是否存在
      result.hasReducer = /function\s+reducer|const\s+reducer\s*=/.test(userLogicCode);
      result.hasInitFunction = /function\s+init|const\s+init\s*=/.test(userLogicCode);
    }

    // 设置消息处理器状态识别
    result.messageHandlers = {
      INIT: workerCode.includes("case 'INIT'"),
      RESTORE: workerCode.includes("case 'RESTORE'"),
      UI_ACTION: workerCode.includes("case 'UI_ACTION'")
    };

  } catch (error) {
    console.error('反解析 Worker 代码失败 (V2 模式):', error);
    result.parseError = error.message;
  }

  return result;
};
