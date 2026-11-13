/**
 * 隔离运行时的内存替代品：opaque origin 下宿主存储读写一律抛错，
 * 网络与缓存也不该从预览里出去，这里统一换成只在当前文档内有效的空实现。
 */

export const createMemoryStorage = () => {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    getItem: (key) => (map.has(String(key)) ? map.get(String(key)) : null),
    setItem: (key, value) => {
      map.set(String(key), String(value));
    },
    removeItem: (key) => {
      map.delete(String(key));
    },
    clear: () => map.clear(),
  };
};

export const createUnavailableIndexedDB = () => {
  const reject = () => {
    throw new Error("隔离预览不提供 IndexedDB");
  };
  return {
    open: reject,
    deleteDatabase: reject,
    databases: () => Promise.resolve([]),
  };
};

//fetch 一律拒绝：预览里没有任何可信的出口，也不该带 pid 头去打宿主接口
export const denyFetch = () =>
  Promise.reject(new Error("隔离预览不提供网络访问"));

export const createNoopCaches = () => ({
  keys: () => Promise.resolve([]),
  delete: () => Promise.resolve(false),
  match: () => Promise.resolve(undefined),
  open: () => Promise.reject(new Error("隔离预览不提供 CacheStorage")),
});
