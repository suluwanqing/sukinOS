import { parseWorkerCode } from './generateWorker';
import { hasPayloadExt, isDataUrlValue } from './sourceMapper';
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config';

/**
 * 反解 worker 内联包 → 源文件视图。这里是从 generateWorker.js 的块标记位出来的
 * 唯一入口：更新面板预览与后台「解析后的文件」共用同一份。
 */

const toPreview = (parsed) => {
  const isBundle = Boolean(parsed?.[ENV_KEY_IS_BUNDLE]);
  const content = parsed?.[ENV_KEY_CONTENT];
  const logicCode = parsed?.[ENV_KEY_LOGIC] || '';
  const entries = parsed?.[ENV_KEY_META_INFO]?.entries;

  if (isBundle && content && typeof content === 'object') {
    const restoredFiles = {};
    for (const [k, v] of Object.entries(content)) {
      // 内容包只给 JS 档去过扩展名，CSS/HTML/资源与数据文本档保留完整后缀：
      // 按 key 自带不带扩展名决定要不要补回 .jsx（用采集口的谓词会因"默认全收"恒真而不再补）
      const keyWithExt = hasPayloadExt(k) ? k : `${k}.jsx`;
      restoredFiles[keyWithExt] = v;
    }
    return { localFiles: restoredFiles, logicCode, entries, isBundle: true };
  }
  const viewCode = typeof content === 'string' ? content : '';
  return { localFiles: { 'main.jsx': viewCode }, logicCode, entries, isBundle: false };
};

export const buildPreviewFromWorker = (workerCode) => {
  if (!workerCode) return null;
  return toPreview(parseWorkerCode(workerCode));
};

/**
 * 落地名净化：JSZip 逐字存名，不净化就等于把 '../x.js' 原样写进归档、交给别人的解压器
 * （Python / 资源管理器会自净，Java ZipInputStream 这类不会）。
 * 只按 '/' 分层（VFS 的分隔符只有 '/'，段内的 '\\' 属于文件名本身），'..' 向上弹并夹在根内，
 * Windows 非法字符与段尾点/空格折成 '_'。
 * 只服务写盘这条路：预览与「喂回再生成」必须用块里的原 key，worker 内 require 按 key 解析。
 */
const SEG_BAD_RE = /[\x00-\x1f<>:"\\/|?*]/g;
const sanitizeSegment = (seg) => seg.replace(SEG_BAD_RE, '_').replace(/[. ]+$/, '') || '_';

export const normalizeRelPath = (key) => {
  const stack = [];
  for (const part of String(key).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
      continue;
    }
    stack.push(sanitizeSegment(part));
  }
  return stack.join('/');
};

/** 必须单段的名字（zip 根目录名、下载文件名）：分层净化后再把剩下的层级折平 */
export const safeNameSegment = (name) => normalizeRelPath(name).replace(/\//g, '_') || 'app';

/**
 * 主逻辑块落地文件名。默认名与 generateWorker.js 的 logicModuleRuntime 同源，
 * 无扩展名时按内容包同一条谓词补 .jsx。
 */
export const logicFileNameOf = (entries) => {
  const base = normalizeRelPath(entries?.logicMain || 'logic') || 'logic';
  return hasPayloadExt(base) ? base : `${base}.jsx`;
};

/**
 * 采集期折成 data URL 的二进制，拆出 mime 与正文供打包写盘。
 * 非 data URL 返回 null，调用方按文本处理即可。
 */
export const splitDataUrl = (value) => {
  if (!isDataUrlValue(value)) return null;
  const comma = String(value).indexOf(',');
  const header = String(value).slice(5, comma);
  return {
    mime: header.split(';')[0] || 'application/octet-stream',
    isBase64: /;base64/i.test(header),
    body: String(value).slice(comma + 1)
  };
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const withSuffix = (key, n) => {
  const dot = /\.([a-z0-9]+)$/i.exec(key);
  return dot ? `${key.slice(0, dot.index)}-${n}${dot[0]}` : `${key}-${n}`;
};

/**
 * 反解成可直接写盘的平面文件树：{ 相对路径: 源码文本 | data URL }。
 * 预编译产物（PRECOMPILED_COMPONENT / precompiledLogic）是派生物，不导出——
 * 需要双份时用「原始文件」那条，内联包里本来就同时装着原文与产物。
 */
export const buildWorkerFileTree = (workerCode) => {
  const parsed = parseWorkerCode(workerCode);
  const preview = toPreview(parsed);

  const recognized = Boolean(
    parsed[ENV_KEY_CONTENT] || parsed[ENV_KEY_LOGIC] ||
    parsed[ENV_KEY_RESOURCE_ID] || parsed[ENV_KEY_NAME]
  );

  const files = {};
  let pathAdjusted = 0;
  let unnamedSeq = 1;

  // 落地名一律过净化；净化或撞名导致改名就留痕，两份内容都保住，不静默覆盖
  const addFile = (rawKey, value) => {
    let key = normalizeRelPath(rawKey);
    if (!key) key = `unnamed-${unnamedSeq++}`;
    if (hasOwn(files, key) && files[key] !== value) {
      let n = 2;
      while (hasOwn(files, withSuffix(key, n))) n += 1;
      key = withSuffix(key, n);
    }
    files[key] = value;
    if (key !== rawKey) pathAdjusted += 1;
    return key;
  };

  Object.entries(preview.localFiles).forEach(([key, value]) => addFile(key, value));

  const logicCode = preview.logicCode;
  let logicFileName = null;
  if (logicCode) {
    const logicRaw = preview.entries?.logicMain || 'logic';
    if (normalizeRelPath(logicRaw) !== logicRaw) pathAdjusted += 1;
    logicFileName = logicFileNameOf(preview.entries);
    // 内容包里可能真有一个同名模块文件，撞车时不静默覆盖
    if (hasOwn(files, logicFileName) && files[logicFileName] !== logicCode) {
      logicFileName = logicFileName.replace(/(\.[a-z0-9]+)$/i, '-logic$1');
    }
    logicFileName = addFile(logicFileName, logicCode);
  }

  return {
    files,
    entries: preview.entries,
    isBundle: preview.isBundle,
    hasLogic: Boolean(logicCode),
    logicFileName,
    recognized,
    pathAdjusted,
    parseError: parsed.parseError || null
  };
};
