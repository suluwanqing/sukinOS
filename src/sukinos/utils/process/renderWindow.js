import {BabelLoader} from './babelLoader'
import { resolveModulePath } from './sourceMapper'
import {
  getSharedSandboxUtilities,
  createStorageProxy,
  createIndexedDBProxy,
  createSecureFetch,
} from '@/sukinos/utils/security'

export const scopeCss = (css, pid) =>
  css ? css.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, `#proc-${pid} $1$2`) : ''

/**
 * 从 CSS 源码中提取所有类名（用于 CSS Modules 的类名映射）。
 * 匹配 `.className` 形式，类名以字母/下划线/连字符开头，可含数字/连字符。
 * 类名保持原样，作用域隔离完全依赖 scopeCss 的 #proc-${pid} 前缀，无需哈希。
 * @param {string} css - CSS 源码
 * @returns {string[]} 去重后的类名数组
 */
const extractClassNames = (css) => {
  const names = new Set()
  const re = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g
  let m
  while ((m = re.exec(css)) !== null) {
    names.add(m[1])
  }
  return Array.from(names)
}

/**
 * 生成 CSS 模块 factory（CSS 不走 Babel，直接生成 CommonJS 模块）。
 * - 普通 .css：exports.default = css 字符串，exports.style = css
 *   → 支持副作用导入 `import './style.css'` 与默认导入 `import styles from './style.css'`
 * - .module.css：exports.default = 类名映射对象 { btn: 'btn' }，exports.style = css
 *   → 支持 CSS Modules `import styles from './style.module.css'`，styles.btn 返回 'btn'
 * 只求值 exports 不覆写 module.exports：模块求值后会读回 module.exports，
 * 若在这里写成字符串，exports.style 就随对象一起被丢掉，样式静默失效。
 * factory 签名与 compileSourceAsync 保持一致：
 * (module, exports, AppSDK, __moduleRegistry, __currentModuleKey, __moduleKeys)
 * @param {string} css - CSS 源码
 * @param {string} moduleKey - 模块 key（如 'style.css' / 'style.module.css'）
 * @returns {{ factory: Function }}
 */
export const createCssModule = (css, moduleKey) => {
  const isModule = /\.module\.css$/.test(moduleKey)
  const cssStr = JSON.stringify(css)
  const classMap = isModule
    ? JSON.stringify(Object.fromEntries(extractClassNames(css).map(n => [n, n])))
    : null
  const factory = new Function('module', 'exports', `
    const css = ${cssStr};
    exports.style = css;
    exports.__esModule = true;
    ${isModule ? `exports.default = ${classMap};` : `exports.default = css;`}
  `)
  return { factory }
}

const compileCache = new Map()
const hashCache = new Map()

/**
 * 清空编译缓存与哈希缓存。
 * 供错误边界"重新编译"使用：清除后下次编译不再命中缓存，重新走 Babel 编译。
 */
export const clearCompileCache = () => {
  compileCache.clear()
  hashCache.clear()
}

const hashString = async str => {
  if (hashCache.has(str)) return hashCache.get(str)
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  // hash 结果也应该缓存，避免重复 digest
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  hashCache.set(str, hash)
  return hash
}

/**
 * 将 Babel / 运行时抛出的原始 Error 对象标准化为结构化错误描述对象。
 * 保留行列号、原始 stack，方便 DynamicRenderer 渲染详细错误 UI。
 * @param {Error|string} err - 原始错误
 * @param {'compile'|'runtime'|'babel'} phase - 出错阶段
 * @param {string} key - 模块 key，如 'main' / 'layout'
 * @returns {{ message: string, stack: string, phase: string, key: string, loc: string }}
 */
const normalizeError = (err, phase, key = '') => {
  const isError = err instanceof Error
  const message = isError ? err.message : String(err)
  const stack = isError ? err.stack || message : message

  // 尝试从 Babel / V8 stack 中提取行列位置，格式如 (xxx:行:列) 或 at xxx (行:列)
  const locMatch = stack.match(/:(\d+):(\d+)/)
  const loc = locMatch ? `行 ${locMatch[1]}，列 ${locMatch[2]}` : ''

  // 部分 Babel 错误在 err.loc 上有结构化位置
  const babelLoc = err?.loc ? `行 ${err.loc.line}，列 ${err.loc.column}` : ''

  return {
    message,
    stack,
    phase,
    key,
    // 优先使用 babel 结构化位置，其次正则提取
    loc: babelLoc || loc,
    // 原始错误对象，供外层按需使用
    raw: err,
  }
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
export const compileSourceAsync = async (
  {sourceCode, pid, targetFunctionConstructor, module = 'component', precompiled = false, moduleRegistry, currentModuleKey},
  options = {}
) => {
  if (typeof sourceCode !== 'string') {
    return {
      error: '无效资源：sourceCode 必须是字符串',
      errorDetail: normalizeError(new Error('无效资源：sourceCode 必须是字符串'), 'validate'),
    }
  }
  const cacheKey = await hashString(sourceCode + pid)
  // 当存在自定义 FunctionCtor（物理沙箱 iframe），跳过缓存
  // 因为 iframe 销毁重建后旧 factory 的 globalThis 指向已销毁窗口，会导致代理层异常
  const shouldSkipCache = !!targetFunctionConstructor
  if (!shouldSkipCache && compileCache.has(cacheKey)) return compileCache.get(cacheKey)

  try {
    let cjsCode
    if (precompiled) {
      // 预编译短路：sourceCode 已是编译后的 JS，跳过 Babel 直接使用
      cjsCode = sourceCode
    } else {
      await BabelLoader.load()
      try {
        cjsCode = BabelLoader.transform(sourceCode, {module})
      } catch (babelErr) {
        // Babel 转译阶段失败：不写缓存，返回结构化错误
        const errorDetail = normalizeError(babelErr, 'babel')
        return {
          error: `Babel 转译失败：${errorDetail.message}${errorDetail.loc ? `（${errorDetail.loc}）` : ''}`,
          errorDetail,
        }
      }
    }

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

      // 模块路径解析器（内联注入，供 require 解析相对路径导入）
      const __resolveModulePath = ${resolveModulePath.toString()};

      const require = (name) => {
          if (name === 'react' || name === 'react/jsx-runtime') return React;
          // 模块解析器：基于当前模块 key 解析相对路径导入，从共享注册表取模块
          const resolvedKey = __resolveModulePath(__currentModuleKey, name, __moduleKeys);
          const mod = __moduleRegistry[resolvedKey];
          if (!mod) throw new Error("Sandbox Require Error: Module " + name + " is restricted.");
          // 与 worker 侧 __requireLogic 对齐的 CJS 语义：exports 先登记进注册表再求值，
          // 循环依赖中的后到者拿到半成品 exports 而不是递归爆栈；executed 才是「求值完成」的标记，
          // 因为 module.exports 允许被写成 0 / '' 这类假值
          if (mod.executed || mod.exports) return mod.exports || {};
          const exports = (mod.exports = {});
          try {
            // 第 2 个参数传注册表里的 mod 本体，module.exports = xxx 才写得进去；
            // 第 4 个参数为 AppSDK（与顶层 factory.call 的 instanceSDK 位置一致），供依赖模块解构 React 等 API
            mod.factory.call(_safeGlobalProxy, mod, exports, AppSDK, __moduleRegistry, resolvedKey, __moduleKeys);
          } catch (err) {
            mod.exports = null; // 求值失败不留半成品，下一次 require 重新执行
            throw err;
          }
          mod.executed = true;
          // 与缓存分支同一口径：module.exports 允许是 0 / '' 这类假值，兜成 {} 免得首调与复调形状不同
          return mod.exports || {};
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

    let factory
    try {
      // 使用目标环境的 Function 构造器创建 factory，决定 factory 内部的 globalThis
      const FactoryCtor = targetFunctionConstructor || Function
      // 注入模块解析上下文：__moduleRegistry（模块注册表）、__currentModuleKey（当前模块）、__moduleKeys（可用模块 key 列表）
      factory = new FactoryCtor(
        'module', 'exports', 'AppSDK',
        '__moduleRegistry', '__currentModuleKey', '__moduleKeys',
        finalCode
      )
    } catch (factoryErr) {
      // new Function 构造阶段失败（语法错误等），不写缓存，返回结构化错误
      const errorDetail = normalizeError(factoryErr, 'compile')
      return {
        error: `沙箱 Function 构建失败：${errorDetail.message}${errorDetail.loc ? `（${errorDetail.loc}）` : ''}`,
        errorDetail,
      }
    }

    const result = {factory}
    // 只有完全成功时才写入缓存，避免缓存到残缺或失败的编译结果
    if (!shouldSkipCache) {
      compileCache.set(cacheKey, result)
    }
    return result
  } catch (e) {
    // 捕获未预期的顶层异常，同样不写缓存
    const errorDetail = normalizeError(e, 'unknown')
    return {
      error: e.message,
      errorDetail,
    }
  }
}
