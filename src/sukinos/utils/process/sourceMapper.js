/**
 * ========================================================================================
 * MAPPER 策略注册表：源码格式编译策略统一分发
 *
 * 【架构说明】：
 * 为支持多种源码格式（jsx / js / 未来更多）的预编译，本模块定义了一个策略注册表。
 * 每种源码格式对应一个编译策略类，通过注册表按格式统一分发，便于后续扩展。
 *
 * 【双份存储语义】：
 * - ENV_KEY_CONTENT 保留原始源码（JSX 或 JS），供调试/反编译/提取
 * - ENV_KEY_CONTENT_PRECOMPILED 存预编译后的 JS 产物，运行时优先使用
 * - ENV_KEY_LOGIC / ENV_KEY_LOGIC_PRECOMPILED 对主逻辑块做同样的双份存储，所以它能用常规 import
 * - js 格式无需编译，直接透传（产物与原始一致）
 * ======================================================================================== */
import { BabelLoader } from './babelLoader'

/**
 * 支持的源码格式枚举
 * @type {{JSX: string, JS: string}}
 */
export const SOURCE_FORMATS = {
  JSX: 'jsx',
  JS: 'js',
}

/**
 * 根据文件后缀识别源码格式
 * @param {string} filename - 文件名或模块 key（如 'main.js' / 'App.js'）
 * @returns {string} SOURCE_FORMATS 中的源码格式，未知后缀默认按 jsx 处理
 */
export function detectSourceFormat(filename = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase()
  if (ext === 'js') return SOURCE_FORMATS.JS
  return SOURCE_FORMATS.JSX
}

/**
 * 解析相对路径导入为模块 key
 * 支持 ./other、../components/Button、./pages/about/index 等相对路径，
 * 并自动补全扩展名（.jsx/.js）与 index 入口。
 * @param {string} fromKey - 当前模块 key（如 'pages/about/index'）
 * @param {string} importPath - 导入路径（如 './Button'、'../utils/helper'）
 * @param {string[]} availableKeys - 所有可用模块 key 列表
 * @returns {string} 解析后的模块 key；非相对路径（如 'react'）原样返回
 */
export function resolveModulePath(fromKey, importPath, availableKeys) {
  if (!importPath || !importPath.startsWith('.')) return importPath
  const keySet = new Set(availableKeys)
  // 计算当前模块所在目录
  const baseDir = fromKey.includes('/') ? fromKey.substring(0, fromKey.lastIndexOf('/')) : ''
  const baseParts = baseDir ? baseDir.split('/') : []
  const importParts = importPath.split('/')
  const resolved = [...baseParts]
  for (const part of importParts) {
    if (part === '.' || part === '') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  const base = resolved.join('/')
  // 尝试多种候选：原路径、补扩展名、index 入口
  // 支持 .jsx/.js 组件与工具模块，以及 .css/.module.css 样式模块
  const candidates = [
    base,
    `${base}.jsx`,
    `${base}.js`,
    `${base}.css`,
    `${base}.module.css`,
    `${base}/index`,
    `${base}/index.jsx`,
    `${base}/index.js`,
    `${base}/index.css`,
    `${base}/index.module.css`,
  ]
  for (const c of candidates) {
    if (keySet.has(c)) return c
  }
  return base
}

/**
 * 将路由路径（router.path）规范化为可匹配模块 key 的形式。
 * 兼容两种 key 格式：无前缀（pages/about/index）与带 ./ 前缀（./pages/about/index），
 * 并自动补全 index 入口。deskBook 与 renderProcess 共用此规则，保证路由解析一致。
 * @param {string} currentPath - 当前路由路径（如 'home'、'pages/about'、'./pages/about'）
 * @param {string[]} availableKeys - 所有可用模块 key 列表
 * @returns {string} 匹配到的模块 key；未匹配则返回规范化后的路径本身
 */
export function resolveModuleKey(currentPath, availableKeys) {
  if (!currentPath) return currentPath
  const keySet = new Set(availableKeys)
  // 规范化：去 ./ 前缀、去尾部斜杠、去扩展名
  let path = String(currentPath).replace(/^\.\//, '').replace(/\/+$/, '').replace(/\.(jsx|js)$/, '')
  const candidates = [
    path,
    `./${path}`,
    `${path}/index`,
    `./${path}/index`,
  ]
  for (const c of candidates) {
    if (keySet.has(c)) return c
  }
  return path
}

/**
 * 读取资源固化的入口约定（发布时由开发者中心写入 metaInfo.entries）。
 * 缺失时回落到历史文件名约定，保证已安装应用零行为变化。
 * @param {object} metaInfo - 资源元数据
 * @returns {{ view: string, logicMain: string|null, logicAux: string[] }}
 */
export function resolveAppEntries(metaInfo = {}) {
  const entries = metaInfo?.entries || {};
  return {
    view: entries.view || 'layout',
    logicMain: entries.logicMain || null,
    logicAux: Array.isArray(entries.logicAux) ? entries.logicAux : [],
  };
}

/**
 * 判断一段已编译的模块产物是否带 UI 运行时依赖（JSX / React）。
 * worker 侧没有 React，逻辑入口模块一旦引入 UI 依赖必然崩，故在 require 前拦截并给出可读错误。
 * @param {string} compiledCode - Babel 编译后的 CJS 代码
 */
export function looksLikeUiModule(compiledCode = '') {
  return /AppSDK\.React|React\.(createElement|Fragment)|jsx-?runtime|useState|useEffect/.test(compiledCode);
}

/** 内容包模块 key 归一：CSS 保留后缀（避免与同名 JS 模块冲突），JS/JSX 去后缀 */
function toModuleKey(path = '') {
  return /\.css$/.test(path) ? path : path.replace(/\.(jsx|js)$/i, '');
}

/**
 * 把文件表折成「模块 key -> 源码」。目录占位（null）与空值不参与模块图。
 * @param {Record<string, string|null>} files - 相对路径 -> 源码
 */
export function toModuleSources(files = {}) {
  const sources = {};
  for (const [path, code] of Object.entries(files)) {
    if (typeof code !== 'string') continue;
    sources[toModuleKey(path)] = code;
  }
  return sources;
}

/**
 * 提取源码里的相对导入说明符：含 `from './x'`、`require('./x')` 与裸样式导入 `import './x.css'`
 *
 * 先剔除纯注释行：说明性注释里的示例路径（如 `// 用 require('./xxx') 取用`）不是真依赖，
 * 误判会让分层校验报出一个根本不存在的模块，把可用的应用拦在预览外。
 * 只按行首判定（`//`、`/*`、`*`），不做字符串状态机 —— 状态机会被注释里的引号带偏成"在字符串中"，
 * 反而漏掉真 import；而漏检要等 worker 求值才炸，比假报错更难查。
 */
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;
const RELATIVE_IMPORT_PATTERNS = [
  // from 与引号之间必然有空白，require( 与引号之间可能有空白：两种都要放过
  /(?:from\s*|require\(\s*)['"](\.[^'"]+)['"]/g,
  /import\s+['"](\.[^'"]+)['"]/g,
];
export function collectRelativeImports(code = '') {
  const specs = [];
  const source = String(code).split('\n').filter(line => !COMMENT_LINE.test(line)).join('\n');
  for (const pattern of RELATIVE_IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) specs.push(match[1]);
  }
  return specs;
}

/**
 * 逻辑层模块图：worker 侧 require 能够抵达的全部模块。
 * 起点 = 辅逻辑入口 ∪ 主逻辑块显式 import 的目标，再沿相对导入递归延伸。
 * 页面文件不入图，否则编辑任意页面都会重建 worker 并丢掉运行状态。
 * @param {Record<string, string>} sources - toModuleSources 的结果
 * @param {{logicMain?: string|null, logicAux?: string[]}} entries - 固化的入口解析结果
 * @param {string} logicMainCode - 主逻辑块源码（用于提取它的 import 目标）
 * @returns {Record<string, string>} key -> 源码
 */
export function buildLogicModuleGraph(sources, entries = {}, logicMainCode = '') {
  const allKeys = Object.keys(sources);
  const graph = {};
  const queue = [...(entries.logicAux || [])];
  if (logicMainCode) {
    for (const spec of collectRelativeImports(logicMainCode)) {
      queue.push(resolveModulePath(entries.logicMain || 'logic', spec, allKeys));
    }
  }
  while (queue.length) {
    const key = queue.shift();
    if (graph[key] !== undefined || typeof sources[key] !== 'string') continue;
    graph[key] = sources[key];
    for (const spec of collectRelativeImports(sources[key])) {
      queue.push(resolveModulePath(key, spec, allKeys));
    }
  }
  return graph;
}

/**
 * 主逻辑块是否含顶层 export。
 * 主块由内核按块作用域里的名字识别 initialState / reducer / init，且安装期只产出 commonjs 产物：
 * 一旦有 export，Babel 会发出 `exports.xxx = ...` 赋值，而 worker 沙箱没有 exports 绑定，求值必抛。
 * 语法上 export 只能出现在模块顶层，所以按「非注释行的行首 export」判定即可，不必建 AST。
 */
const TOP_LEVEL_EXPORT = /^\s*export[\s{]/;
export function hasTopLevelExport(code = '') {
  return String(code).split('\n').some(line => !COMMENT_LINE.test(line) && TOP_LEVEL_EXPORT.test(line));
}

/**
 * 开发期分层校验：把只有 worker 才会炸的问题提前到发布前报出来。
 * worker 没有 CSS 模块，UI 沙箱也不该执行逻辑层的副作用，因此：
 * - page-imports-aux：页面导入辅逻辑模块会让同一份副作用在 UI 与 worker 各跑一次
 * - logic-imports-css：逻辑层引入样式，worker 侧必然 require 不到产物
 * - logic-import-missing：逻辑层引用的目标不在内容包，worker 求不到值
 * - logic-exports：主逻辑块写了 export，预编译产物在 worker 里取不到 exports 绑定
 * - key-conflict：去扩展名后同名，打入内容包会互相覆盖
 * 主/辅逻辑入口文件本身缺席不算问题：主逻辑由 ENV_KEY_LOGIC 单独承载，旧版本地同步插件会把
 * 整类 logic* 文件搬出文件集，因此它们既可能不在 files 里、也不需要报 missing。
 * @param {object} params
 * @param {Record<string, string|null>} params.files - 相对路径 -> 源码（目录占位为 null）
 * @param {{logicMain?: string|null, logicAux?: string[]}} params.entries - 入口解析结果
 * @param {string} params.logicMainCode - 主逻辑块源码（内容包通常不含它，需单独给）
 * @returns {Array<{code: string, from: string, to: string, message: string}>}
 */
export function inspectEntryLayering({ files, entries = {}, logicMainCode = '' } = {}) {
  const errors = [];
  const sources = toModuleSources(files);
  const allKeys = Object.keys(sources);
  const keySet = new Set(allKeys);
  const auxKeys = Array.isArray(entries.logicAux) ? entries.logicAux : [];

  const push = (code, from, to, message) => {
    if (errors.some(e => e.code === code && e.from === from && e.to === to)) return;
    errors.push({ code, from, to, message });
  };

  // key-conflict：toModuleSources 已经吞掉了同名冲突，需要从原始路径反推
  const firstPathByKey = new Map();
  for (const [path, code] of Object.entries(files || {})) {
    if (typeof code !== 'string') continue;
    const key = toModuleKey(path);
    const first = firstPathByKey.get(key);
    if (first) push('key-conflict', first, path, `「${first}」与「${path}」去扩展名后同为 ${key}，打入内容包会互相覆盖`);
    else firstPathByKey.set(key, path);
  }

  // 逻辑层求值集合：主逻辑块本身不在内容包里，用调用方给的源码单独参与检查。
  // 通配入口规则推不出主逻辑 key 时，回落 worker 生成侧使用的默认基准 key
  const logicMainBaseKey = entries.logicMain || (logicMainCode ? 'logic' : null);
  const heldOutsideBundle = new Set([logicMainBaseKey, ...auxKeys].filter(Boolean));
  const logicSources = {};
  for (const key of auxKeys) {
    if (typeof sources[key] === 'string') logicSources[key] = sources[key];
  }
  if (logicMainBaseKey) logicSources[logicMainBaseKey] = logicMainCode || sources[logicMainBaseKey] || '';

  // 主逻辑块禁 export：内核靠名字取 initialState / reducer / init，导出的写法在预编译产物里
  // 会变成对不存在的 exports 变量赋值，worker 求值时抛错
  const mainBlockCode = logicMainCode || (logicMainBaseKey ? sources[logicMainBaseKey] || '' : '');
  if (logicMainBaseKey && hasTopLevelExport(mainBlockCode)) {
    push('logic-exports', logicMainBaseKey, 'export',
      `主逻辑块 ${logicMainBaseKey} 使用了 export：它由内核按名字识别 initialState / reducer / init，不接受导出；要把逻辑复用给页面，请写成普通模块文件由页面直接 import`);
  }

  for (const [key, code] of Object.entries(logicSources)) {
    for (const spec of collectRelativeImports(code)) {
      const resolved = resolveModulePath(key, spec, allKeys);
      if (/\.css$/.test(resolved)) {
        push('logic-imports-css', key, resolved, `逻辑层模块 ${key} 引入了样式 ${resolved}，worker 侧没有 CSS 模块`);
      } else if (!keySet.has(resolved) && !heldOutsideBundle.has(resolved)) {
        push('logic-import-missing', key, resolved, `逻辑层模块 ${key} 引用的 ${resolved} 不在这次发布的载荷里：核对相对路径（层级、扩展名、大小写），或确认它会被打进内容包（单页发布只带视图入口与主逻辑块）`);
      }
    }
  }

  // 页面（非逻辑层、非样式）不得反向依赖逻辑层
  for (const [key, code] of Object.entries(sources)) {
    if (key in logicSources || /\.css$/.test(key)) continue;
    for (const spec of collectRelativeImports(code)) {
      const resolved = resolveModulePath(key, spec, allKeys);
      if (auxKeys.includes(resolved)) {
        push('page-imports-aux', key, resolved, `页面 ${key} 导入了辅逻辑模块 ${resolved}，它会在 UI 与 worker 各执行一次；请把共享代码抽到普通模块目录`);
      }
    }
  }

  return errors;
}

/** 软约束错误码：只影响副作用范围，不足以让今天能跑的应用连预览都打不开（预览只提示，发布仍拦）。
 *  其余码（key-conflict / logic-imports-css / logic-import-missing / logic-exports）都是 worker 侧必炸的硬故障。 */
export const SOFT_LAYERING_CODES = ['page-imports-aux'];

/** 按硬故障 / 软约束分组，供发布（全拦）与预览（只拦硬故障）两条通道共用 */
export function splitLayeringErrors(errors = []) {
  const hard = [];
  const soft = [];
  for (const item of errors) {
    (SOFT_LAYERING_CODES.includes(item.code) ? soft : hard).push(item)
  }
  return { hard, soft };
}

/** 把校验结果折成一行提示文案（alert 与抛错两条通道共用同一份措辞） */
export function formatLayeringErrors(errors = []) {
  return errors.map(item => item.message).join('；');
}

/**
 * 编译策略基类
 * 每个源码格式对应一个策略，实现 compile(code, options) 返回编译后的 JS 字符串。
 */
class SourceCompileStrategy {
  constructor(format) {
    this.format = format
  }

  /**
   * 编译入口（子类实现）
   * @param {string} code - 原始源码
   * @param {object} options - { module, filename }
   * @returns {Promise<string>} 编译后的 JS 字符串
   */
  async compile(code, options) {
    throw new Error(`[sourceMapper] ${this.format} 策略未实现 compile 方法`)
  }
}

/**
 * JSX 策略：调用 BabelLoader 将 JSX 编译为 JS
 */
class JsxCompileStrategy extends SourceCompileStrategy {
  constructor() {
    super(SOURCE_FORMATS.JSX)
  }

  async compile(code, options = {}) {
    await BabelLoader.load()
    return BabelLoader.transform(code, {
      type: SOURCE_FORMATS.JSX,
      module: options.module || 'component',
    })
  }
}

/**
 * JS 策略：无需编译，直接透传
 */
class JsCompileStrategy extends SourceCompileStrategy {
  constructor() {
    super(SOURCE_FORMATS.JS)
  }

  async compile(code) {
    return code
  }
}

/**
 * 策略注册表：格式 -> 策略实例
 */
const STRATEGY_REGISTRY = {
  [SOURCE_FORMATS.JSX]: new JsxCompileStrategy(),
  [SOURCE_FORMATS.JS]: new JsCompileStrategy(),
}

/**
 * 统一编译分发入口
 * 根据源码格式从注册表取出对应策略并执行编译。
 * @param {string} code - 原始源码
 * @param {object} [options] - { format, module, filename }
 * @returns {Promise<string>} 编译后的 JS 字符串
 */
export async function compileSource(code, options = {}) {
  const format = options.format || detectSourceFormat(options.filename || '')
  const strategy = STRATEGY_REGISTRY[format]
  if (!strategy) {
    throw new Error(`[sourceMapper] 不支持的源码格式: ${format}`)
  }
  return strategy.compile(code, options)
}