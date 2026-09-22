/**
 * 入口约定配置（开发期）
 *
 * 解决的问题：逻辑入口 / 视图入口此前靠 logic.jsx、layout.jsx、main.jsx 等硬编码文件名约定，
 * 分散在开发者中心、上传、更新、本地开发与运行时的多处判定点。这里把约定收口成一份可配置数据。
 *
 * 存储：按用户隔离的 localStorage（key = su:dev:entry:<uid>）；uid 缺失时一律返回默认值且不落盘。
 * 注意：本配置只决定「开发期如何识别入口」。发布时必须把识别结果固化进 metaInfo.entries，
 * 因为运行时（worker / DynamicRenderer）读取的是资源里的 entries，而不是本机 localStorage。
 */

export const DEFAULT_ENTRY_CONFIG = {
  // 逻辑块入口模式列表：命中的文件不作为页面渲染。
  // 命中集合的第一个为「主逻辑入口」（状态机，导出 initialState / reducer / init），
  // 其余为「辅逻辑入口」（服务/数据模块，留在内容包内）。
  // 运行期约定：主逻辑块以 require('./xxx') 取用辅逻辑模块；辅逻辑模块自身经 Babel 预编译，
  // 可以正常使用 import / export 语法，其相对依赖同样沿 require 链解析。
  logicEntries: ['logic.jsx'],
  // 多页面应用的视图框架入口
  viewEntry: 'layout.jsx',
  // 单文件应用的内容入口
  mainEntry: 'main.jsx',
};

const STORAGE_PREFIX = 'su:dev:entry:';

export function loadEntryConfig(uid) {
  if (!uid) return { ...DEFAULT_ENTRY_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + uid);
    if (!raw) return { ...DEFAULT_ENTRY_CONFIG };
    const saved = JSON.parse(raw);
    return {
      logicEntries: Array.isArray(saved.logicEntries) && saved.logicEntries.length
        ? saved.logicEntries
        : DEFAULT_ENTRY_CONFIG.logicEntries,
      viewEntry: saved.viewEntry || DEFAULT_ENTRY_CONFIG.viewEntry,
      mainEntry: saved.mainEntry || DEFAULT_ENTRY_CONFIG.mainEntry,
    };
  } catch (e) {
    return { ...DEFAULT_ENTRY_CONFIG };
  }
}

export function saveEntryConfig(uid, config) {
  if (!uid) return false;
  try {
    localStorage.setItem(STORAGE_PREFIX + uid, JSON.stringify(config));
    return true;
  } catch (e) {
    return false;
  }
}

/** 相对路径 -> 内容包模块 key（去 .jsx/.js 后缀，与 ENV_KEY_CONTENT 的 key 规则一致） */
export function moduleKeyOf(path = '') {
  return path.replace(/\.(jsx|js)$/i, '');
}

/**
 * 入口模式匹配：支持精确路径、段内通配 *、跨段通配 **、单字符 ?
 * 例：logic.jsx ｜ *.logic.js ｜ store/**（** 跨目录层级，可用来匹配 pages 下任意层级的 index）
 */
export function matchEntryPattern(pattern, path) {
  if (!pattern || !path) return false;
  const p = String(pattern);
  if (!p.includes('*') && !p.includes('?')) return p === path;

  let source = '^';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') { source += '.*'; i++; if (p[i + 1] === '/') i++; }
      else source += '[^/]*';
    } else if (c === '?') {
      source += '[^/]';
    } else {
      source += /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
    }
  }
  return new RegExp(`${source}$`).test(path);
}

/** 按模式列表收集命中的文件，保持模式声明顺序 + 路径字母序，保证主入口选取稳定 */
export function detectLogicEntryFiles(files, config = DEFAULT_ENTRY_CONFIG) {
  const paths = Object.keys(files).filter(k => files[k] !== null);
  const ordered = [];
  for (const pattern of (config.logicEntries || [])) {
    for (const p of paths.filter(p => matchEntryPattern(pattern, p)).sort()) {
      if (!ordered.includes(p)) ordered.push(p);
    }
  }
  return ordered;
}

/** 按入口名（可含扩展名）在 files 中定位实际文件，忽略 .jsx/.js 差异 */
export function findEntryFile(files, spec) {
  if (!spec) return null;
  const targetKey = moduleKeyOf(spec);
  const paths = Object.keys(files).filter(k => files[k] !== null);
  return paths.find(p => moduleKeyOf(p) === targetKey) || paths.find(p => p === spec) || null;
}

/**
 * 汇总当前文件集相对入口配置的解析结果。
 * entries 为发布时写入 metaInfo 的固化结果（模块 key 形式，与内容包 key 对齐）。
 */
export function buildAppEntries(files, config = DEFAULT_ENTRY_CONFIG) {
  const logicFiles = detectLogicEntryFiles(files, config);
  const [mainLogicFile, ...auxLogicFiles] = logicFiles;
  const viewFile = findEntryFile(files, config.viewEntry);
  return {
    logicFiles,
    logicMainFile: mainLogicFile || null,
    logicAuxFiles: auxLogicFiles,
    viewFile: viewFile || null,
    mainFile: findEntryFile(files, config.mainEntry),
    entries: {
      view: viewFile ? moduleKeyOf(viewFile) : null,
      logicMain: mainLogicFile ? moduleKeyOf(mainLogicFile) : null,
      logicAux: auxLogicFiles.map(moduleKeyOf),
    },
  };
}
