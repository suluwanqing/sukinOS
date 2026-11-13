// worker 包编解码的键名契约独立成无依赖模块，Node 构建脚本与测试可直接加载
// 键名同时是 IndexedDB 主键 (keyPath) 与 Worker 解析锚点，改动会读不到本地库里的旧数据，只在项目初始化或破坏性重构时改

/** DB_RES 与内存 resourceCache 的唯一键；parseWorkerCode 用它做动态正则锚点反解源码 */
export const ENV_KEY_RESOURCE_ID = 'resourceId';

/** DB_SYS（用户应用注册表）的唯一键，同时决定本地文件名 uuid-{name}.sukin-worker.js；同名即同一应用 */
export const ENV_KEY_NAME = 'name';

/** 为 true 时 Worker 内额外注入 Router 导航逻辑，可拦截 NAVIGATE；否则按单组件处理 */
export const ENV_KEY_IS_BUNDLE = 'isBundle';

/** 用户写的 Web Worker 逻辑层源码（initialState / reducer / init），generateWorker 原封注入模板底部 */
export const ENV_KEY_LOGIC = 'logic';

/** 渲染层源码（组件字符串树或多文件内容包），生成文件时 JSON.stringify 双重序列化并打上 resourceId 锚点 */
export const ENV_KEY_CONTENT = 'content';

/**
 * ENV_KEY_CONTENT 的预编译产物，结构一致（单文件字符串或多文件对象）。双份存储：CONTENT 留原始 JSX
 * （供调试 / 反编译 / 提取），本字段供运行时直接执行；缺失或执行失败时降级回原始 JSX 重编译。
 * 系统 APP 不生成此字段，始终走 JSX 编译链路。
 */
export const ENV_KEY_CONTENT_PRECOMPILED = 'precompiledContent';

/**
 * ENV_KEY_LOGIC 的预编译产物（commonjs，import 已变 require）。双份存储同上，
 * generateWorker 按「本字段 → ENV_KEY_LOGIC → 兜底 reducer」取值，所以未预编译的存量应用与系统 APP 行为不变。
 * 主块由内核按名字识别 initialState/reducer/init，因此原始源码不接受 export。
 */
export const ENV_KEY_LOGIC_PRECOMPILED = 'precompiledLogic';

/** 应用在外壳上的表现与系统级权限：authorId, icon, description, initialSize（窗口初始尺寸）, version, exposeState, saveState 等 */
export const ENV_KEY_META_INFO = 'metaInfo';

export const TRUSTED_CDN_WHITELIST = [
  // 全球CDN
  'https://unpkg.com/',
  'https://cdn.jsdelivr.net/',

  // 国内镜像/替代源
  'https://cdn.bytedance.com/',
  'https://lf3-cdn-tos.bytecdntp.com/cdn/',
  'https://cdn.bootcdn.net/',
  'https://cdn.bootcss.com/',
  'https://cdn.staticfile.org/',
  'https://g.alicdn.com/',
  'https://npm.elemecdn.com/',
];
