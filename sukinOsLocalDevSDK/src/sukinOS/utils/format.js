// 纯逻辑工具模块（.js 文件，非 JSX 组件）
// 与 store/ 的区别：这里不命中入口约定，是普通模块，页面可以 import；
// store/ 是辅逻辑模块，只在 worker 侧求值，页面引入它会让副作用在 UI 与 worker 各跑一次。
// 被 pages/home/index.jsx 通过相对路径导入，验证 .js 文件的模块化处理
export const formatCount = (count) => {
  if (count > 0) return `+${count}`;
  if (count < 0) return `${count}`;
  return '0';
};

export const greeting = (name) => `Hello, ${name}!`;

// 默认导出对象，验证 default 导入
export default {
  formatCount,
  greeting,
};