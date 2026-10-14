/** MAPPER 策略注册表：为多种源码格式（jsx / js / 未来更多）的预编译定义「格式 -> 策略」注册表，按格式统一分发，便于后续扩展。
 *  双份存储：ENV_KEY_CONTENT 保留原始源码（JSX 或 JS），供调试/反编译/提取；ENV_KEY_CONTENT_PRECOMPILED 存预编译后的 JS 产物，运行时优先使用。
 *  ENV_KEY_LOGIC / ENV_KEY_LOGIC_PRECOMPILED 对主逻辑块做同样的双份存储，所以它能用常规 import；js 格式无需编译，直接透传（产物与原始一致）。 */
import { BabelLoader } from './babelLoader'

export const SOURCE_FORMATS = {
  JSX: 'jsx',
  JS: 'js',
}

/** 根据文件后缀识别源码格式，未知后缀默认按 jsx 处理 */
export function detectSourceFormat(filename = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase()
  if (ext === 'js') return SOURCE_FORMATS.JS
  return SOURCE_FORMATS.JSX
}

/** 解析相对路径导入为模块 key：逐级消化 ./ 与 ..，支持 ./other、../components/Button、./pages/about/index 等写法。
 *  @returns {string} 解析后的模块 key；非相对路径（如 'react'）原样返回 */
export function resolveModulePath(fromKey, importPath, availableKeys) {
  if (!importPath || !importPath.startsWith('.')) return importPath
  const keySet = new Set(availableKeys)
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
  // 候选依次试：原路径、补扩展名（.jsx/.js 组件与工具、.css/.module.css 样式）、index 入口
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

/** 路由路径（router.path）规范化为可匹配模块 key：兼容有/无 ./ 前缀并自动补 index 入口，deskBook 与 renderProcess 共用此规则。
 *  @returns {string} 匹配到的模块 key；未匹配则返回规范化后的路径本身 */
export function resolveModuleKey(currentPath, availableKeys) {
  if (!currentPath) return currentPath
  const keySet = new Set(availableKeys)
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

/** 读取资源固化的入口约定（发布时由开发者中心写入 metaInfo.entries）。
 *  缺失时回落到历史文件名约定，保证已安装应用零行为变化 */
export function resolveAppEntries(metaInfo = {}) {
  const entries = metaInfo?.entries || {};
  return {
    view: entries.view || 'layout',
    logicMain: entries.logicMain || null,
    logicAux: Array.isArray(entries.logicAux) ? entries.logicAux : [],
  };
}

/** 判断已编译产物是否带 UI 运行时依赖：worker 侧没有 React，逻辑入口模块命中就拦在 require 前并给出可读错误 */
export function looksLikeUiModule(compiledCode = '') {
  return /AppSDK\.React|React\.(createElement|Fragment)|jsx-?runtime|useState|useEffect/.test(compiledCode);
}

/**
 * 内容包的分档口径（判定只看 key 后缀与值本身，不需要任何标记字段）：代码档 .jsx/.js（含发布期去了后缀的裸模块 key）走 Babel 与 require 链；
 * 样式档 .css 走 createCssModule、类名按文件加作用域；文档档 .html/.htm 不编译，由 HtmlAppFrame 合成成子文档自治渲染；
 * 资源档（图片/字体/媒体）采集期转 base64 data URL，只被子文档引用；数据文本档（.json/.md/.csv/…）随包进内容包，既不进模块图也不编译。
 * 采集口默认全收，不再按扩展名拒绝文件，所以下面两份清单只是「提示表」：ASSET_EXT_SOURCE 决定谁必须折成 data URL（svg 在内 —— <img src> 吃不了原始标记），
 * TEXT_EXT_HINT_SOURCE 决定谁直接按文本读，两边都没命中的交给 payloadCollect 的字节嗅探。
 */
export const ASSET_EXT_SOURCE = 'png|jpe?g|gif|webp|avif|bmp|ico|svg|woff2?|ttf|otf|eot|mp3|wav|ogg|m4a|mp4|webm';
const ASSET_EXT_RE = new RegExp(`\\.(${ASSET_EXT_SOURCE})$`, 'i');
/** 直接按文本读的扩展名：命中即原样入库，不做字节嗅探 */
export const TEXT_EXT_HINT_SOURCE = 'jsx|js|css|html?|md|markdown|jsonc?|csv|txt|xml|webmanifest|ya?ml|map';
export const TEXT_EXT_HINT_RE = new RegExp(`\\.(${TEXT_EXT_HINT_SOURCE})$`, 'i');
export const CODE_EXT_RE = /\.(jsx|js)$/i;

export const isCssKey = (key = '') => /\.css$/i.test(key);
export const isHtmlKey = (key = '') => /\.html?$/i.test(key);
export const isAssetKey = (key = '') => ASSET_EXT_RE.test(key);
/** 值本身是不是采集期折出来的 data URL：内容包只有字符串这一条通道，二进制唯一的存法就是这种前缀，
 *  所以「能不能直接塞进 src/url()」从值推导即可，不必给 key 加标记字段 */
export const isDataUrlValue = (value) =>
  typeof value === 'string' && /^data:[a-z0-9.+-]+\/[a-z0-9.+-]*(?:;[^,]*)?[,;]/i.test(value);
/** key 末段自带扩展名：反解内容包时据此决定要不要补回 .jsx */
export const hasPayloadExt = (key = '') => /\.[a-z][a-z0-9]*$/i.test(String(key).split('/').pop());
/** 是否参与模块图的代码模块：裸 key（pages/home/index、layout、logic）也算 —— JSX 内容包的 key 在发布期就去掉了后缀，
 *  这里写成严格后缀白名单会静默停掉整条编译管线；样式、文档、资源与数据文本档都不是模块，值已是 data URL 的一定不是代码 */
export const isCodeKey = (key = '', value) => {
  if (isCssKey(key) || isHtmlKey(key) || isDataUrlValue(value)) return false;
  const base = String(key).split('/').pop();
  return !base.includes('.') || CODE_EXT_RE.test(base);
};
/** 编译管线只收代码档与样式档：文档档由 HtmlAppFrame 合成子文档、资源档只被子文档引用，把 html 或 base64 串送进 Babel 只会产出一条假编译错误 */
export const isCompiledKey = (key = '', value) => isCodeKey(key, value) || isCssKey(key);

/** 内容包模块 key 归一：CSS/HTML/资源保留后缀（避免与同名 JS 模块冲突），JS/JSX 去后缀 */
function toModuleKey(path = '') {
  return path.replace(/\.(jsx|js)$/i, '');
}

/** 提取 HTML 文档里的子资源引用：只认 link / script / img 上的 href、src。
 *  不扫所有 href —— `<a href="./page2">` 是站内导航而不是随包载荷，扫它只会产出假 missing */
const DOC_SUBRESOURCE = /<(?:link|script|img)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const DOC_REF_SKIP = /^(data:|blob:|#|mailto:|tel:|javascript:)/i;
export function collectDocRefs(html = '') {
  const refs = [];
  for (const match of String(html).matchAll(DOC_SUBRESOURCE)) {
    const spec = match[1].trim();
    if (!spec || DOC_REF_SKIP.test(spec)) continue;
    refs.push({ spec, external: /^(https?:)?\/\//i.test(spec) });
  }
  return refs;
}

/** 把文档里的引用说明符解析成内容包 key，解析不出返回 null。
 *  站点根相对（Vite 默认 base:'/' 产出的 /assets/x.js）在内容包里没有"根"，按包根处理；
 *  剩下的交给 resolveModulePath，与 require 的相对路径解析共用同一套候选 */
export function resolveDocRef(fromKey = '', spec = '', availableKeys = []) {
  if (/^(https?:)?\/\//i.test(spec)) return null;
  const relative = spec.startsWith('.') ? spec : `./${spec.replace(/^\/+/, '')}`;
  const resolved = resolveModulePath(fromKey, relative, availableKeys);
  return new Set(availableKeys).has(resolved) ? resolved : null;
}

/** 把文件表折成「模块 key -> 源码」，目录占位（null）与空值不参与模块图。
 *  只收代码档、样式档与文档档：资源档（base64）与数据文本档不是代码，拿它们跑依赖扫描正则既慢又只会产出假 missing */
export function toModuleSources(files = {}) {
  const sources = {};
  for (const [path, code] of Object.entries(files)) {
    if (typeof code !== 'string') continue;
    if (!isCodeKey(path, code) && !isCssKey(path) && !isHtmlKey(path)) continue;
    sources[toModuleKey(path)] = code;
  }
  return sources;
}

/** 提取源码里的相对导入说明符：含 `from './x'`、`require('./x')` 与裸样式导入 `import './x.css'`。
 *  先剔除纯注释行：注释里的示例路径（如「用 require('./xxx') 取用」）不是真依赖，误判会让分层校验报出一个根本不存在的模块，
 *  把可用的应用拦在预览外。只按行首判定、不做字符串状态机：状态机会被注释里的引号带偏成「在字符串中」而漏掉真 import，
 *  漏检要等 worker 求值才炸 */
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

/** 逻辑层模块图：worker 侧 require 能够抵达的全部模块。起点 = 辅逻辑入口 ∪ 主逻辑块显式 import 的目标，再沿相对导入递归延伸。
 *  页面文件不入图，否则编辑任意页面都会重建 worker 并丢掉运行状态 */
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

/** 主逻辑块是否含顶层 export：主块由内核按块作用域里的名字识别 initialState / reducer / init，且安装期只产出 commonjs 产物；
 *  一旦有 export，Babel 会发出 `exports.xxx = ...` 赋值，而 worker 沙箱没有 exports 绑定，求值必抛。
 *  语法上 export 只能出现在模块顶层，所以按「非注释行的行首 export」判定即可，不必建 AST */
const TOP_LEVEL_EXPORT = /^\s*export[\s{]/;
export function hasTopLevelExport(code = '') {
  return String(code).split('\n').some(line => !COMMENT_LINE.test(line) && TOP_LEVEL_EXPORT.test(line));
}

/** 开发期分层校验：把只有 worker 才会炸的问题提前到发布前报出来（worker 没有 CSS 模块，UI 沙箱也不该执行逻辑层的副作用）。
 *  - page-imports-aux：页面导入辅逻辑模块会让同一份副作用在 UI 与 worker 各跑一次
 *  - logic-imports-css：逻辑层引入样式，worker 侧必然 require 不到产物
 *  - logic-import-missing：逻辑层引用的目标不在内容包，worker 求不到值
 *  - logic-exports：主逻辑块写了 export，预编译产物在 worker 里取不到 exports 绑定
 *  - key-conflict：去扩展名后同名，打入内容包会互相覆盖
 *  主/辅逻辑入口文件本身缺席不算问题：主逻辑由 ENV_KEY_LOGIC 单独承载，旧版本地同步插件会把整类 logic* 文件搬出文件集，
 *  因此它们既可能不在 files 里、也不需要报 missing。
 *  @returns {Array<{code: string, from: string, to: string, message: string}>} */
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

  // 逻辑层求值集合：主逻辑块不在内容包里，用调用方给的源码单独参与检查；通配入口规则推不出它的 key 时回落 worker 生成侧的默认基准 key
  const logicMainBaseKey = entries.logicMain || (logicMainCode ? 'logic' : null);
  const heldOutsideBundle = new Set([logicMainBaseKey, ...auxKeys].filter(Boolean));
  const logicSources = {};
  for (const key of auxKeys) {
    if (typeof sources[key] === 'string') logicSources[key] = sources[key];
  }
  if (logicMainBaseKey) logicSources[logicMainBaseKey] = logicMainCode || sources[logicMainBaseKey] || '';

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

  // 页面（非逻辑层、非样式/文档/资源）不得反向依赖逻辑层
  for (const [key, code] of Object.entries(sources)) {
    if (key in logicSources || !isCodeKey(key, code)) continue;
    for (const spec of collectRelativeImports(code)) {
      const resolved = resolveModulePath(key, spec, allKeys);
      if (auxKeys.includes(resolved)) {
        push('page-imports-aux', key, resolved, `页面 ${key} 导入了辅逻辑模块 ${resolved}，它会在 UI 与 worker 各执行一次；请把共享代码抽到普通模块目录`);
      }
    }
  }

  // 文档档：视图入口是 html 时，子文档运行在我们给的独立文档里，引用只能靠随包载荷解析。采集口默认全收，所以解析不到就是
  // 路径或大小写写错了 —— 那是运行期必 404 的硬故障；外链在 dev 的 COEP 下也会被拦，但它只是环境差异，列软码。
  // 解析表用原始文件表：资源档不进模块图，但它是文档要引的东西。
  if (isHtmlKey(entries.view) && typeof sources[entries.view] === 'string') {
    const rawKeys = Object.keys(files || {}).filter(k => typeof files[k] === 'string');
    for (const { spec, external } of collectDocRefs(sources[entries.view])) {
      if (external) {
        push('html-ref-external', entries.view, spec, `文档 ${entries.view} 引用了外链 ${spec}：开发环境带 COEP require-corp，跨源脚本与样式会被浏览器拦下，请把产物打成单文件再发布`);
        continue;
      }
      if (!resolveDocRef(entries.view, spec, rawKeys)) {
        push('html-ref-missing', entries.view, spec, `文档 ${entries.view} 引用的 ${spec} 不在这次载荷里：核对相对路径与大小写（文件名区分大小写），并确认这个文件确实构建进了产物`);
      }
    }
  }

  return errors;
}

/** 软约束错误码：只影响副作用范围，或只是运行期可能受限（外链），不足以让今天能跑的应用连预览都打不开（预览只提示，发布仍拦）。
 *  其余码（key-conflict / logic-imports-css / logic-import-missing / logic-exports / html-ref-missing）都是必炸的硬故障。 */
export const SOFT_LAYERING_CODES = ['page-imports-aux', 'html-ref-external'];

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

/** 编译策略基类：每种源码格式对应一个策略，实现 compile(code, options) 返回编译后的 JS 字符串 */
class SourceCompileStrategy {
  constructor(format) {
    this.format = format
  }

  /** 编译入口（子类实现） */
  async compile(code, options) {
    throw new Error(`[sourceMapper] ${this.format} 策略未实现 compile 方法`)
  }
}

/** JSX 策略：调用 BabelLoader 将 JSX 编译为 JS */
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

/** JS 策略：无需编译，直接透传 */
class JsCompileStrategy extends SourceCompileStrategy {
  constructor() {
    super(SOURCE_FORMATS.JS)
  }

  async compile(code) {
    return code
  }
}

/** 策略注册表：格式 -> 策略实例 */
const STRATEGY_REGISTRY = {
  [SOURCE_FORMATS.JSX]: new JsxCompileStrategy(),
  [SOURCE_FORMATS.JS]: new JsCompileStrategy(),
}

/** 统一编译分发入口：按格式取注册表里的策略执行编译，未注册的格式直接抛错 */
export async function compileSource(code, options = {}) {
  const format = options.format || detectSourceFormat(options.filename || '')
  const strategy = STRATEGY_REGISTRY[format]
  if (!strategy) {
    throw new Error(`[sourceMapper] 不支持的源码格式: ${format}`)
  }
  return strategy.compile(code, options)
}