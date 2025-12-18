import { BabelLoader } from './babelLoader';

export const scopeCss = (css, pid) => css ? css.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g, `#proc-${pid} $1$2`) : '';

const compileCache = new Map();

export const compileSourceAsync = async (sourceCode) => {
  if (typeof sourceCode !== 'string') return { error: "无效资源!" };

  const cacheKey = sourceCode.slice(0, 50) + sourceCode.length;
  if (compileCache.has(cacheKey)) return compileCache.get(cacheKey);

  try {
    await BabelLoader.load();
    await new Promise(r => setTimeout(r, 0));

    const cjsCode = BabelLoader.transform(sourceCode)

    // 在代码块外部定义 Proxy 和 fetch，此时可以安全访问原生的 globalThis/window
    // 使用一个立即执行的 Block { ... } 来包裹遮蔽变量和用户代码
    const contextPreamble = `
      const {
        React,
        useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer
      } = AppSDK || {};

      const { Fragment } = React || {};

      const _safeProxyHandler = {
        get(target, prop) {
          if (prop === 'fetch' || prop === 'XMLHttpRequest') {
            throw new Error("Security Error: Access to global network API is blocked. Please use the injected 'fetch'.");
          }
          if (prop === 'window' || prop === 'self' || prop === 'globalThis') {
            return _safeGlobalProxy;
          }
          const value = Reflect.get(target, prop);
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
      };

      // 这里访问的是原生的 globalThis，因为下方 shadowing 变量在 {} 块级作用域内
      const _safeGlobalProxy = new Proxy(globalThis, _safeProxyHandler);

      const _safeFetch = (AppSDK && AppSDK.API && AppSDK.API.fetch)
        ? AppSDK.API.fetch
        : () => { throw new Error("Network access blocked: No secure fetch provider found."); };

      /* --- 进入沙箱块级作用域 --- */
      {
        const window = _safeGlobalProxy;
        const self = _safeGlobalProxy;
        const globalThis = _safeGlobalProxy;
        const fetch = _safeFetch;
        const XMLHttpRequest = undefined;
    `;

    // 闭合块级作用域
    const finalCode = contextPreamble + '\n' + cjsCode + '\n}';

    const factory = new Function('module', 'exports', 'AppSDK', finalCode);
    const result = { factory };
    compileCache.set(cacheKey, result);
    return result;

  } catch (e) {
    console.error("编译出错:", e);
    return { error: e.message };
  }
};
