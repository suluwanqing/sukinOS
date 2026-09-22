// 辅逻辑模块：不命中视图入口、也不作为页面渲染，专门给主逻辑块拆状态逻辑用。
// 这类模块经 Babel 预编译，可以正常使用 import / export（与 logic.jsx 相反，主逻辑块自身严禁 export）。
// worker 侧除 module / exports / require 外还会注入 api，需要跨模块读写状态时可以这样取：
//   const cur = api.getState(); api.dispatch({ type: 'INCREMENT' }); api.postMessage({ from: 'store' });
export const step = 1;

export const nextCount = (count, delta = step) => count + delta;
