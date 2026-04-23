import { BabelLoader } from './babelLoader'
import {
  getSharedSandboxUtilities,
  createStorageProxy,
  createIndexedDBProxy,
  createSecureFetch
} from '@/sukinos/utils/security'

export const scopeCss = (css, pid) => css ? css.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, `#proc-${pid} $1$2`) : ''

const compileCache = new Map()
const hashCache = new Map()

const hashString = async (str) => {
  if (hashCache.has(str)) return hashCache.get(str)
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const compileSourceAsync = async (sourceCode, pid) => {
  if (typeof sourceCode !== 'string') return { error: "无效资源!" }
  const cacheKey = await hashString(sourceCode + pid)
  if (compileCache.has(cacheKey)) return compileCache.get(cacheKey)

  try {
    await BabelLoader.load()
    const cjsCode = BabelLoader.transform(sourceCode)

    const storageProxySource = createStorageProxy.toString();
    const indexedDBProxySource = createIndexedDBProxy.toString();
    const secureFetchSource = createSecureFetch.toString();

    // 注入全部抽离出的工厂源码
    const sharedUtilities = getSharedSandboxUtilities(pid, storageProxySource, indexedDBProxySource, secureFetchSource);

    const contextPreamble = `
      const {
        React, useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer, Fragment
      } = AppSDK || {};

      ${sharedUtilities}

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

      const _safeProxyHandler = _createSafeProxyHandler('ui', {
        get globalProxy() { return _safeGlobalProxy; },
        documentProxy: _safeDocumentProxy,
        navigatorProxy: _safeNavigator,
        fetchProxy: _safeFetch,
        localStorageProxy: _rawSystem.localStorage,
        indexedDBProxy: _rawSystem.indexedDB,
        systemProxy: _rawSystem,
        navigateProxy: undefined
      });

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
    `;

    const finalCode = contextPreamble + '\n' + cjsCode + '\n}'
    const factory = new Function('module', 'exports', 'AppSDK', finalCode)
    const result = { factory }
    compileCache.set(cacheKey, result)
    return result;
  } catch (e) {
    return { error: e.message }
  }
};
