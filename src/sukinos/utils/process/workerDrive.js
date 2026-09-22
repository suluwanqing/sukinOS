/**
 * 逻辑块模块运行时依赖：复用与渲染侧一致的相对路径解析与 UI 依赖识别
 */
import { resolveModulePath, looksLikeUiModule } from './sourceMapper'

/**
 * 核心路由与状态转换处理器
 */
export const processStateAction = (state, action, isBundle) => {
  let nextState = state || {}

  // 处理 Bundle 内部的虚拟页面切换逻辑
  if (isBundle && action && action.type === 'NAVIGATE') {
    const currentRouter = nextState.router || {path: 'home'}
    nextState = {
      ...nextState,
      router: {...currentRouter, path: action.payload},
    }
  }

  return nextState
}

/**
 * 初始状态自动校准器
 */
export const initializeState = (baseState, isBundle) => {
  const state = baseState || {}
  if (isBundle && !state.router) {
    state.router = {path: 'home'}
  }
  return state
}

/**
 * 宿主/沙箱特权边界绑定器（完全提取为原样字符串）
 */
export const RUNNER_SANDBOX_PRIVILEGES = `  const eval = _safeGlobalProxy.eval;
  const Function = _safeGlobalProxy.Function;
  const setTimeout = _safeGlobalProxy.setTimeout;
  const setInterval = _safeGlobalProxy.setInterval;
  const fetch = _safeGlobalProxy.fetch;
  const indexedDB = _safeGlobalProxy.indexedDB;
  const navigator = _safeGlobalProxy.navigator;
  const URL = _safeGlobalProxy.URL;
  const Blob = _safeGlobalProxy.Blob;

  const XMLHttpRequest = undefined;
  const importScripts = undefined;`

/**
 * 状态分发器及同步广播驱动（通过函数注入环境变量，返回纯字符串代码）
 */
export const getRunnerWorkerDispatcher = envKeyIsBundle => `  let _state = null;

  /* 基本驱动代码 */
  const broadcast = () => _safeGlobalProxy.postMessage({ type: 'STATE_UPDATE', payload: { ..._state, config: SYS_CONFIG } });
  const save = () => _safeGlobalProxy.postMessage({ type: 'SAVE_STATE', payload: _state });
  const dispatch = (action) => {
    try {
      // 安全获取 reducer，防止用户漏写导致 Worker 直接抛出异常静默死机！
      const reducerFn = typeof reducer === 'function' ? reducer : (s) => s;
      let nextState = reducerFn(_state, action);

      //这个是注入整个关于内部router的操作
      if (SYS_CONFIG["${envKeyIsBundle}"] && action.type === 'NAVIGATE') {
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
  };`

/**
 * 消息协议路由器（通过函数注入环境变量，返回纯字符串代码）
 */
export const getRunnerMessageRouter = envKeyIsBundle => `  _safeGlobalProxy.onmessage = (e) => {
    const { type, payload } = e.data;
    switch (type) {
      case 'INIT': {
        try {
          // 安全获取 initialState
          const base = typeof initialState === 'undefined' ? {} : initialState;
          if (SYS_CONFIG["${envKeyIsBundle}"] && !base.router) {
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
      case 'TOPIC_MESSAGE': {
        // 主机转发的主题消息（CommHub 订阅回推）固定成一个 action：主题与数据平铺在 action 上
        const t = payload || {};
        dispatch({ type: 'TOPIC_MESSAGE', topic: t.topic, data: t.data });
        break;
      }
      default:
        break;
    }
  };`

/**
 * 逻辑块模块运行时（无条件注入）
 *
 * 让主逻辑块引入内容包里的其他逻辑模块（原始源码写 `import`，预编译后落到这里的就是 require）：
 * 模块源码取自 PRECOMPILED_COMPONENT（安装期已编译为 CJS），require 惰性执行并缓存 exports，
 * 相对路径按调用方所在模块 key 解析，因此依赖链可以自行延伸。
 * 之所以不按"有没有辅逻辑入口"条件注入：条件注入会把"入口规则漏配"变成 worker 静默死机，
 * 而不调用 require 时这段代码完全惰性，代价只是几百字节。
 *
 * @param {string} logicMainKey 主逻辑入口的模块 key，作为顶层 require 的解析基准目录
 */
export const getWorkerLogicModuleRuntime = (logicMainKey = 'logic') => `  /* --- 逻辑块模块运行时块 --- */
  const __resolveModulePath = ${resolveModulePath.toString()};
  const __looksLikeUiModule = ${looksLikeUiModule.toString()};
  const __LOGIC_MAIN_KEY = ${JSON.stringify(logicMainKey)};
  const __logicModuleKeys = Object.keys(PRECOMPILED_COMPONENT || {});
  const __logicRegistry = Object.create(null);
  const __logicApi = Object.freeze({
    dispatch: (action) => dispatch(action),
    getState: () => _state,
    postMessage: (data) => _safeGlobalProxy.postMessage(data),
  });

  function __requireLogic(fromKey, name) {
    const resolvedKey = __resolveModulePath(fromKey, name, __logicModuleKeys);
    const code = (PRECOMPILED_COMPONENT || {})[resolvedKey];
    const cached = __logicRegistry[resolvedKey];
    if (cached) return cached.exports;
    if (typeof code !== 'string') {
      // 样式模块在安装期就被跳过（不进预编译产物），命中它说明逻辑层引了 CSS
      if (/\\.css$/.test(resolvedKey)) {
        throw new Error('[Worker] require 失败: 模块 ' + resolvedKey + ' 是样式文件，worker 侧没有 CSS 模块，请把样式移到页面层');
      }
      // 区分"模块根本不在内容包"与"在但没编译产物"：前者是路径/发布形态问题，后者是安装期问题
      const inBundle = !!ORIGIN_COMPONENT && Object.prototype.hasOwnProperty.call(ORIGIN_COMPONENT, resolvedKey);
      if (!inBundle) {
        throw new Error('[Worker] require 失败: 模块 ' + resolvedKey + ' 不在内容包内，请检查 require 路径；单页发布的载荷不带模块文件，需要依赖请改用多页面发布');
      }
      const issues = (APP_METAINFO || {}).precompileIssues;
      const detail = issues && issues.reason === 'failed'
        ? '安装期预编译失败：' + (issues.keys || []).join('、')
        : '无预编译产物（系统应用跳过安装期预编译）';
      throw new Error('[Worker] require 失败: 模块 ' + resolvedKey + ' ' + detail);
    }
    if (__looksLikeUiModule(code)) {
      throw new Error('[Worker] require 失败: 模块 ' + resolvedKey + ' 含 UI 依赖，逻辑层不可引入');
    }
    const mod = { exports: {} };
    __logicRegistry[resolvedKey] = mod;
    try {
      const nestedRequire = (dep) => __requireLogic(resolvedKey, dep);
      // Babel 产物按 CJS 求值：module/exports/require/api 以形参注入，避免污染沙箱作用域
      const factory = new Function('module', 'exports', 'require', 'api', code);
      factory.call(_safeGlobalProxy, mod, mod.exports, nestedRequire, __logicApi);
    } catch (err) {
      // 半初始化的模块必须剔除，否则后续 require 会拿到残缺 exports
      delete __logicRegistry[resolvedKey];
      console.error('[Worker] 逻辑模块 ' + resolvedKey + ' 执行失败:', err);
      throw err;
    }
    const exported = mod.exports;
    // 单一 default 导出时直接还原默认值，与渲染侧 exports.default || exports 保持同一约定
    if (exported && exported.__esModule && 'default' in exported && Object.keys(exported).length === 2) {
      return exported.default;
    }
    return exported;
  }

  const require = (name) => __requireLogic(__LOGIC_MAIN_KEY, name);
`
