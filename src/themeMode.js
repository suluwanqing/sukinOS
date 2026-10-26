/* ===========================================================================
   themeMode 的首屏引导
   ---------------------------------------------------------------------------
   单独拆一个文件、不 import 任何东西，是为了让 src/main.jsx 能安全地引用它：
   usePersonalization.jsx 传递依赖了 VFS / config / 远端地址等一大串，
   若从那里引 bootstrapThemeMode，整套依赖会被拖进入口 chunk。
   这里只有一段同步逻辑，几行代码，进主包几乎无成本。

   与 usePersonalization.jsx 的分工：
     · 本文件负责「首屏先挂对」——在 React 渲染前同步读 localStorage 镜像
     · usePersonalization.jsx 负责「后续以 VFS 真实配置为准」并回写镜像
   =========================================================================== */

/* themeMode 在 localStorage 里的镜像键。
   配置本体在 VFS（异步），这份镜像只服务于「首屏不闪」这一个目的。 */
export const THEME_STORAGE_KEY = 'sukinos-theme-mode';

/**
 * 首屏引导：在 React 渲染前同步读取上一次的主题并挂到 <html> 上。
 * 必须在 createRoot().render() 之前调用，否则第一帧仍是默认浅色。
 *
 * 为什么挂 documentElement 而不是 #sukin-os：
 * 本项目有一批浮层是 portal 到 document.body 的（toast、confirm、右键菜单、
 * PageList 列设置面板），它们在 #sukin-os 的 DOM 子树之外。只挂 #sukin-os 的话，
 * 深色模式下这些浮层仍是浅色，在深色桌面上非常扎眼；挂 <html> 才能连它们一起翻。
 *
 * 读不到、存储被禁、或值不合法时都不动 <html>（保持默认浅色），不抛错。
 */
export const bootstrapThemeMode = () => {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return; // 隐私模式 / 存储被禁用：保持默认浅色
  }
  if (saved !== 'dark' && saved !== 'light') return;
  document.documentElement.classList.toggle('dark', saved === 'dark');
};

/**
 * 把当前 themeMode 写到 localStorage 镜像，并同步 <html> 上的 .dark。
 * 由 usePersonalization 的 effect 在配置变化时调用。
 */
export const applyThemeMode = (themeMode) => {
  const isDark = themeMode === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  } catch {
    // 存储不可用时静默降级：仅失去「刷新不闪」这一项，功能不受影响
  }
};
