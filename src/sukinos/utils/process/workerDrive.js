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
      default:
        break;
    }
  };`
