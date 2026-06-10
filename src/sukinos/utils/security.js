import { TRUSTED_CDN_WHITELIST } from '@/sukinos/utils/config'

// ==========================================
// 通用安全与防篡改函数 (宿主环境使用)
// ==========================================

// 随机种子生成函数。
export const generateShortSeed = (
  length = 8,
  seed = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  isNumber = false
) => {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new Error('Length must be a positive integer')
  }
  const characters = isNumber ? '0123456789' : seed
  if (characters.length === 0) {
    throw new Error('Character seed cannot be empty')
  }
  let result = ''
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const values = new Uint32Array(length)
      crypto.getRandomValues(values)
      for (let i = 0; i < length; i++) {
        result += characters[values[i] % characters.length]
      }
    } else {
      for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)]
      }
    }
  } catch (error) {
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
  }
  return result
}

/**
 * 安全冻结对象，跳过无法冻结的对象（如代理对象、DOM元素等）
 * @param {any} obj - 要冻结的对象
 * @returns {any} 冻结后的对象
 */
export const safeDeepFreeze = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;

  let isProxyObj = false;
  try {
    isProxyObj = obj.constructor && obj.constructor.name === 'Proxy';
  } catch {
    isProxyObj = true;
  }

  if (isProxyObj ||
      obj.nodeType !== undefined ||
      obj === window ||
      obj === document ||
      obj === history ||
      obj === location) {
    return obj;
  }

  try {
    const propNames = Object.keys(obj);
    for (const prop of propNames) {
      const value = obj[prop];
      if (value && typeof value === 'object') {
        safeDeepFreeze(value);
      }
    }
    Object.freeze(obj);
  } catch (error) {
    console.warn('Failed to freeze object:', error);
  }

  return obj;
};

/**
 * 创建严格的只读 SDK 代理
 * 修复 [Symbol.iterator] 导致的解构错误，并确除非特定模块外全量只读
 */
export const createReadonlySDKProxy = (AppSDK) => {
  return new Proxy(AppSDK, {
    get(target, prop) {
      // 修复 Babel 编译后触发的 Symbol 型属性访问：直接透传
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop);
      }

      const value = Reflect.get(target, prop);

      // 解构获取时，如果不是核心的 react/components 渲染库，返回一层强力的只读代理，避免被篡改
      if (value && typeof value === 'object' && prop !== 'React' && prop !== 'Components' && prop !== 'hooks') {
        return new Proxy(value, {
          get(vTarget, vProp) {
            return Reflect.get(vTarget, vProp);
          },
          set() { throw new Error(`Security Error: AppSDK.${String(prop)} is read-only`); },
          defineProperty() { throw new Error(`Security Error: AppSDK.${String(prop)} is read-only`); },
          deleteProperty() { throw new Error(`Security Error: AppSDK.${String(prop)} is read-only`); },
          setPrototypeOf() { throw new Error(`Security Error: Cannot change prototype of AppSDK.${String(prop)}`); }
        });
      }

      return value;
    },
    set(target, prop) {
      throw new Error(`Security Error: Cannot modify SDK property '${String(prop)}'`);
    },
    deleteProperty(target, prop) {
      throw new Error(`Security Error: Cannot delete SDK property '${String(prop)}'`);
    },
    defineProperty(target, prop) {
      throw new Error(`Security Error: Cannot define SDK property '${String(prop)}'`);
    },
    setPrototypeOf() {
      throw new Error('Security Error: Cannot change SDK prototype');
    }
  });
};

// ==========================================
// 沙箱代理工厂函数 (可独立执行，也可 toString 注入沙箱)
// ==========================================

/**
 * 通用的高阶 Fetch 拦截器工厂
 * 动态注入 x-kernel-process-id
 */
export const createSecureFetch = (originalFetch, pid) => {
  const KERNEL_HEADER_KEY = 'x-kernel-process-id';
  return async function(url, options) {
    const opts = options || {};
    const headers = new Headers(opts.headers || {});
    headers.set(KERNEL_HEADER_KEY, pid);
    return originalFetch(url, { ...opts, headers });
  };
};

/**
 * 创建基于 PID 命名空间的 Storage 代理 (localStorage, sessionStorage)
 */
export const createStorageProxy = (storage, pid) => {
  const prefix = `pid-${pid}_`;
  const getPidKeys = () => Object.keys(storage).filter(k => k.startsWith(prefix));

  return new Proxy(storage, {
    get(target, prop) {
      if (prop === 'getItem') return (key) => target.getItem(prefix + key);
      if (prop === 'setItem') return (key, value) => target.setItem(prefix + key, value);
      if (prop === 'removeItem') return (key) => target.removeItem(prefix + key);
      if (prop === 'clear') return () => getPidKeys().forEach(k => target.removeItem(k));
      if (prop === 'key') return (index) => {
        const pidKey = getPidKeys()[index];
        return pidKey ? pidKey.slice(prefix.length) : null;
      };
      if (prop === 'length') return getPidKeys().length;
      if (typeof prop === 'string' && prop !== 'Symbol.iterator') return target.getItem(prefix + prop);
      const value = Reflect.get(...arguments);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
       if (typeof prop === 'string') {
           target.setItem(prefix + prop, value);
           return true;
       }
       return Reflect.set(...arguments);
    },
    has(target, prop) {
        if (typeof prop === 'string') return target.getItem(prefix + prop) !== null;
        return Reflect.has(...arguments);
    },
    deleteProperty(target, prop) {
        if (typeof prop === 'string') {
            target.removeItem(prefix + prop);
            return true;
        }
        return Reflect.deleteProperty(...arguments);
    },
    ownKeys() {
        return getPidKeys().map(k => k.slice(prefix.length));
    },
    getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && target.getItem(prefix + prop) !== null) {
            return { value: target.getItem(prefix + prop), writable: true, enumerable: true, configurable: true };
        }
        return Reflect.getOwnPropertyDescriptor(...arguments);
    }
  });
};

/**
 * 创建基于 PID 命名空间的 IndexedDB 代理
 */
export const createIndexedDBProxy = (indexedDB, pid) => {
    const prefix = `pid-${pid}_`;
    return new Proxy(indexedDB, {
        get(target, prop) {
            if (prop === 'open') return (dbName, version) => target.open(prefix + dbName, version);
            if (prop === 'deleteDatabase') return (dbName) => target.deleteDatabase(prefix + dbName);
            if (prop === 'databases') return () => Promise.resolve([]);
            const value = Reflect.get(...arguments);
            return typeof value === 'function' ? value.bind(target) : value;
        }
    });
};

/**
 * 清理指定 PID 产生的全部存储数据 (localStorage, sessionStorage, IndexedDB)
 */
export const clearSandboxStorageByPid = async (pid) => {
  if (!pid) return;
  const prefix = `pid-${pid}_`;
  // 清理 localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const localKeys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      localKeys.forEach(k => localStorage.removeItem(k));
    }
  } catch (err) {
    console.warn(`Failed to clear localStorage for PID ${pid}:`, err);
  }
  // 清理 sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith(prefix));
      sessionKeys.forEach(k => sessionStorage.removeItem(k));
    }
  } catch (err) {
    console.warn(`Failed to clear sessionStorage for PID ${pid}:`, err);
  }
  // 清理 IndexedDB
  try {
    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      const deletePromises = dbs
        .filter(db => db.name && db.name.startsWith(prefix))
        .map(db => {
          return new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => resolve(); // 防止被阻塞导致 Promise 挂起
          });
        });
      await Promise.allSettled(deletePromises);
    }
  } catch (err) {
    console.warn(`Failed to clear IndexedDB for PID ${pid}:`, err);
  }
};


// ==========================================
// 沙箱环境代码规约 (注入块级作用域的字符串)
// ==========================================

/**
 * 核心安全沙箱规约 (供 renderWindow 和 generateWorker 共同注入)
 */
export const getSharedSandboxUtilities = (pid, storageProxySource, indexedDBProxySource, secureFetchSource) => {
  const trustedCDNString = JSON.stringify(TRUSTED_CDN_WHITELIST);

  return `
      const _PID = "${pid}";
      const _TRUSTED_CDN = ${trustedCDNString};

      // 准入检查函数
      const _isUrlAllowed = function(url) {
        if (!url) return true;
        const s = url.toString().trim();
        if (s.startsWith('/') || s.startsWith('./') || s.startsWith('blob:') || s.startsWith('data:')) return true;
        return _TRUSTED_CDN.some(function(domain) {
          return domain !== "" && s.startsWith(domain);
        });
      };

      const _forbidden = function(prop) {
        return function() {
          throw new Error("Security Error: " + prop + " is not allowed in sandbox.");
        };
      };

      // 注入共享的代理工厂源码
      const _createStorageProxy = ${storageProxySource};
      const _createIndexedDBProxy = ${indexedDBProxySource};
      const _createSafeFetch = ${secureFetchSource};

      const _createSafeNavigatorProxy = function(originalNavigator) {
        if (!originalNavigator) return undefined;
        return new Proxy(originalNavigator, {
          get: function(target, prop) {
            if (prop === 'serviceWorker') {
              const sw = target.serviceWorker;
              if (!sw) return undefined;
              return new Proxy(sw, {
                get: function(swTarget, swProp) {
                  if (['getRegistration', 'getRegistrations', 'unregister'].includes(swProp)) {
                    return _forbidden('navigator.serviceWorker.' + swProp);
                  }
                  const val = Reflect.get(swTarget, swProp);
                  return typeof val === 'function' ? val.bind(swTarget) : val;
                }
              });
            }
            if (['usb', 'bluetooth', 'serial', 'hid'].includes(prop)) return undefined;
            const val = Reflect.get(target, prop);
            return typeof val === 'function' ? val.bind(target) : val;
          }
        });
      };

      const _createSafeDocumentProxy = function(originalDocument) {
        if (!originalDocument) return undefined;
        return new Proxy(originalDocument, {
          get: function(target, prop) {
            const val = Reflect.get(target, prop);
            if (prop === 'createElement') {
              return function(tagName, options) {
                const el = val.call(target, tagName, options);
                const tag = tagName.toLowerCase();

                if (tag === 'script' || tag === 'link' || tag === 'iframe') {
                  const attr = tag === 'link' ? 'href' : 'src';
                  Object.defineProperty(el, attr, {
                    set: function(v) {
                      if (_isUrlAllowed(v)) el.setAttribute(attr, v);
                      else throw new Error("Security Error: URL '" + v + "' is not whitelisted.");
                    },
                    get: function() { return el.getAttribute(attr); },
                    configurable: true
                  });

                  const originalSetAttribute = el.setAttribute;
                  el.setAttribute = function(name, value) {
                    if (name.toLowerCase() === attr && !_isUrlAllowed(value)) {
                       throw new Error("Security Error: URL '" + value + "' is not whitelisted.");
                    }
                    return originalSetAttribute.call(this, name, value);
                  };
                }
                return el;
              };
            }
            return typeof val === 'function' ? val.bind(target) : val;
          }
        });
      };

      const _createSafeProxyHandler = function(envType, specialGlobals) {
        return {
          get: function(target, prop) {
            switch (prop) {
              case 'window': case 'self': case 'globalThis':
                return specialGlobals.globalProxy;
              case 'document':
                return envType === 'ui' ? specialGlobals.documentProxy : undefined;
              case 'navigator':
                return specialGlobals.navigatorProxy;
              case 'fetch':
                return specialGlobals.fetchProxy;
              case 'indexedDB':
                return specialGlobals.indexedDBProxy;
              case 'localStorage':
                return specialGlobals.localStorageProxy;
              case 'sessionStorage':
                return specialGlobals.sessionStorageProxy;
              case 'System':
                return specialGlobals.systemProxy;
              case 'URL':
              case 'Worker':
              case 'WebSocket':
              case 'SharedWorker':
                return globalThis[prop];

              // [递归沙箱化]劫持 Blob 构造函数
              case 'Blob':
                const OriginalBlob = globalThis.Blob;
                return function(parts, options) {
                  if (options && options.type && options.type.includes('javascript')) {
                    const preamble = \`(function(self){
                      const createStorageProxy = \${_createStorageProxy};
                      const createIndexedDBProxy = \${_createIndexedDBProxy};
                      const createSafeFetch = \${_createSafeFetch};
                      const _PID = "\${_PID}";
                      const _safeIndexedDB = createIndexedDBProxy(self.indexedDB, _PID);
                      const _safeLocalStorage = createStorageProxy({}, _PID);
                      const _safeFetch = createSafeFetch(self.fetch, _PID);

                      const System = { localStorage: _safeLocalStorage, indexedDB: _safeIndexedDB };
                      const indexedDB = _safeIndexedDB;
                      const fetch = _safeFetch;
                      const eval = function(){ throw new Error("Security Error: eval is forbidden in Recursive Worker."); };
                      /* 递归影子沙箱环境已就绪 */
                    \`;
                    const footer = \`\\n})(self);\`;
                    return new OriginalBlob([preamble, ...parts, footer], options);
                  }
                  return new OriginalBlob(parts, options);
                };

              case 'eval': case 'Function': case 'XMLHttpRequest': case 'importScripts':
                return _forbidden(prop);

              case 'setInterval':
              case 'setTimeout':
                  return function(callback, delay, ...args) {
                    if (typeof callback !== 'function') throw new Error("Callback must be a function");
                    const safeDelay = Math.max(delay || 0, 4);
                    const originalTimer = target[prop] || globalThis[prop];
                    const boundCallback = callback.bind(specialGlobals.globalProxy);
                    return originalTimer(boundCallback, safeDelay, ...args);
                  };

              default:
                  const value = Reflect.get(target, prop);
                  if (typeof value === 'function' && /^[A-Z]/.test(prop)) return value;
                  return typeof value === 'function' ? value.bind(target) : value;
            }
          },
          set: function(target, prop, value) {
              const blockedProps = ['fetch', 'eval', 'Function', 'XMLHttpRequest', 'importScripts', 'window', 'document', 'self', 'globalThis', 'navigator'];
              if (blockedProps.includes(prop)) {
                throw new Error("Security Error: Cannot override protected property '" + prop + "'");
              }
              return Reflect.set(target, prop, value);
          }
        };
      };
  `;
};

/**
 * 为 Worker 线程专门生成的完整 Proxy 沙箱前导代码
 */
export const getWorkerSandboxPreamble = (pid, storageProxySource, indexedDBProxySource, secureFetchSource) => {
  return `
    /* --- Worker Sandbox Preamble --- */
    ${getSharedSandboxUtilities(pid, storageProxySource, indexedDBProxySource, secureFetchSource)}

    const _safeIndexedDB = _createIndexedDBProxy(self.indexedDB, _PID);
    const _safeLocalStorage = _createStorageProxy(self.localStorage || {}, _PID);
    const _safeSessionStorage = _createStorageProxy(self.sessionStorage || {}, _PID);
    const _safeNavigator = _createSafeNavigatorProxy(self.navigator);

    // 完全使用抽离出的 fetch 工厂生成防篡改网络请求
    const _safeFetch = _createSafeFetch(self.fetch, _PID);
    Object.freeze(_safeFetch);

    let _safeGlobalProxy;

    const _safeProxyHandler = _createSafeProxyHandler('worker', {
      get globalProxy() { return _safeGlobalProxy; },
      fetchProxy: _safeFetch,
      indexedDBProxy: _safeIndexedDB,
      localStorageProxy: _safeLocalStorage,
      sessionStorageProxy: _safeSessionStorage,
      navigatorProxy: _safeNavigator,
      systemProxy: { localStorage: _safeLocalStorage, sessionStorage: _safeSessionStorage, indexedDB: _safeIndexedDB }
    });

    _safeGlobalProxy = new Proxy(self, _safeProxyHandler);
  `;
};
