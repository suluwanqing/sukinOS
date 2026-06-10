import {BabelLoader} from './babelLoader'
import {
  getSharedSandboxUtilities,
  createStorageProxy,
  createIndexedDBProxy,
  createSecureFetch
} from '@/sukinos/utils/security'

export const scopeCss = (css, pid) =>
  css ? css.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, `#proc-${pid} $1$2`) : ''

const compileCache = new Map()
const hashCache = new Map()

const hashString = async str => {
  if (hashCache.has(str)) return hashCache.get(str)
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 编译源码为可执行的 factory 函数
 * @param {string} sourceCode - 原始源码
 * @param {string|number} pid - 进程 ID
 * @param {Function} [targetFunctionConstructor] - 可选的目标 Function 构造器。
 *   传入 iframe.contentWindow.Function 可使 factory 内部的 globalThis 指向该 iframe，
 *   从而消除 JS 执行上下文与 UI 渲染位置（iframe 内）的跨文档断裂问题。
 *   不传则默认使用宿主 Function（向后兼容 LocalDev / 幽灵沙箱模式）。
 */
export const compileSourceAsync = async (sourceCode, pid, targetFunctionConstructor) => {
  if (typeof sourceCode !== 'string') return {error: '无效资源!'}
  const cacheKey = await hashString(sourceCode + pid)
  // 当存在自定义 FunctionCtor（物理沙箱 iframe），跳过缓存
  // 因为 iframe 销毁重建后旧 factory 的 globalThis 指向已销毁窗口，会导致代理层异常
  const shouldSkipCache = !!targetFunctionConstructor
  if (!shouldSkipCache && compileCache.has(cacheKey)) return compileCache.get(cacheKey)

  try {
    await BabelLoader.load()
    const cjsCode = BabelLoader.transform(sourceCode)

    const storageProxySource = createStorageProxy.toString()
    const indexedDBProxySource = createIndexedDBProxy.toString()
    const secureFetchSource = createSecureFetch.toString()

    // 注入全部抽离出的工厂源码
    const sharedUtilities = getSharedSandboxUtilities(
      pid,
      storageProxySource,
      indexedDBProxySource,
      secureFetchSource
    )

    const contextPreamble = `
      const {
        React, useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer, Fragment
      } = AppSDK || {};

      ${sharedUtilities}

      // 各实例专享的局部全局存储，杜绝共享 Ghost iframe 的作用域污染与内存泄露
      const _localGlobalStore = Object.create(null);

      let _safeGlobalProxy;
      const _safeDocumentProxy = _createSafeDocumentProxy(globalThis.document);
      const _safeNavigator = _createSafeNavigatorProxy(globalThis.navigator);

      // 优先从 SDK 取安全 fetch，兜底走 security.js 的统一包装工厂
      const _safeFetch = (AppSDK && AppSDK.API && AppSDK.API.fetch)
          ? AppSDK.API.fetch
          : _createSafeFetch(globalThis.fetch, _PID);
      Object.freeze(_safeFetch); // 确保无法被子组件再次覆写抹掉 pid header

      const _rawSystem = (AppSDK && AppSDK.System) ? AppSDK.System : {
          localStorage: _createStorageProxy({}, _PID),
          indexedDB: _createIndexedDBProxy(globalThis.indexedDB, _PID)
      };

      const _baseHandler = _createSafeProxyHandler('ui', {
        get globalProxy() { return _safeGlobalProxy; },
        documentProxy: _safeDocumentProxy,
        navigatorProxy: _safeNavigator,
        fetchProxy: _safeFetch,
        localStorageProxy: _rawSystem.localStorage,
        indexedDBProxy: _rawSystem.indexedDB,
        systemProxy: _rawSystem,
        navigateProxy: undefined
      });

      const _safeProxyHandler = {
        get(target, prop) {
          if (prop === 'self' || prop === 'globalThis' || prop === 'window') {
            return _safeGlobalProxy;
          }
          if (prop in _localGlobalStore) {
            return _localGlobalStore[prop];
          }
          return _baseHandler.get(target, prop);
        },
        set(target, prop, value) {
          const blockedProps = ['fetch', 'eval', 'Function', 'XMLHttpRequest', 'importScripts', 'window', 'document', 'self', 'globalThis', 'navigator'];
          if (blockedProps.includes(prop)) {
            throw new Error("Security Error: Cannot override protected property '" + prop + "'");
          }
          _localGlobalStore[prop] = value;
          return true;
        },
        has(target, prop) {
          return prop in _localGlobalStore || Reflect.has(target, prop);
        }
      };

      _safeGlobalProxy = new Proxy(globalThis, _safeProxyHandler);

      const require = (name) => {
        if (name === 'react') return React;
        throw new Error("Sandbox Require Error: Module " + name + " is restricted.");
      };

      /* --- 进入沙箱块级作用域 --- */
      {
        const window = _safeGlobalProxy;
        const self = _safeGlobalProxy;
        const globalThis = _safeGlobalProxy;
        const document = _safeDocumentProxy;
        const navigator = _safeNavigator;
        const fetch = _safeFetch;

        // 变量遮蔽，锁定标识符
        const eval = _safeGlobalProxy.eval;
        const Function = _safeGlobalProxy.Function;
        const setTimeout = _safeGlobalProxy.setTimeout;
        const setInterval = _safeGlobalProxy.setInterval;
        const XMLHttpRequest = undefined;
        const WebSocket = _safeGlobalProxy.WebSocket;
        const Worker = _safeGlobalProxy.Worker;
        const URL = _safeGlobalProxy.URL;
        const Blob = _safeGlobalProxy.Blob;
    `

    const finalCode = contextPreamble + '\n' + cjsCode + '\n}'
    // 使用目标环境的 Function 构造器创建 factory，决定 factory 内部的 globalThis
    const FactoryCtor = targetFunctionConstructor || Function
    const factory = new FactoryCtor('module', 'exports', 'AppSDK', finalCode)
    const result = {factory}
    if (!shouldSkipCache) {
      compileCache.set(cacheKey, result)
    }
    return result
  } catch (e) {
    return {error: e.message}
  }
}
