/**
 * 内容包采集：把「一个目录」折成 ENV_KEY_CONTENT 需要的 { 相对路径 -> 字符串 }。通道只有字符串（安装期走 JSON.stringify 落盘），
 * 所以二进制必须在采集期折成 base64 的 data URL —— 前缀直接写进值里，渲染期不必再猜 MIME，且 data: 本就在 security.js 的 _isUrlAllowed 放行名单内。
 * 采集口默认全收：外部构建产物里被引用的东西远不止常见扩展名，按白名单拒绝的后果不是报错而是静默丢文件（作者只看到子文档里的「引用缺失」，
 * 看不到真正的原因），所以这里只区分「怎么读」、不区分「收不收」：ASSET 名单折 data URL、文本提示名单按文本读、都没命中的交给字节嗅探。
 * 采集侧不设体积闸：本模块有两条根本不出网的链路（本地开发同步、开发者中心工作区），一律读全、只把合计报给界面，选错目录的代价只是整棵树进内存；
 * 体积上限属于「出网」这件事，由后端系统配置 sukinos_upload_settings 按 指定用户 > 角色 > 默认档 求值，只在上传/更新接口生效。
 */
import { isAssetKey, TEXT_EXT_HINT_RE } from './sourceMapper'

/** 整目录递归时跳过的目录名。以 . 开头的目录另行跳过（.vite / .git / .cache 都在内） */
export const SKIP_DIR_NAMES = ['node_modules', 'dist', 'build'];
export const isSkippedDir = (name = '') => name.startsWith('.') || SKIP_DIR_NAMES.includes(name);

const MIME_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
  svg: 'image/svg+xml', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
  otf: 'font/otf', eot: 'application/vnd.ms-fontobject', mp3: 'audio/mpeg',
  wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', mp4: 'video/mp4',
  webm: 'video/webm',
};

// 分块转字符码：整包 apply 会把大数组的实参个数推过引擎栈上限
const BASE64_CHUNK = 0x8000;

export const bufferToBase64 = (arrayBuffer) => {
  const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
};

/** 未知扩展名时按文件头猜 MIME，只列常见构建产物会带的那些；猜不出就是 octet-stream —— 值仍是可用的 data URL，
 *  浏览器按不透明字节处理，比误判成文本塞进 <script> 安全 */
const sniffMime = (head) => {
  const at = (o, n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(head[o + i] ?? 0xff);
    return s;
  };
  if (at(0, 4) === '%PDF') return 'application/pdf';
  if (at(0, 4) === 'wOFF') return 'font/woff';
  if (at(0, 4) === 'wOF2') return 'font/woff2';
  if (at(0, 4) === 'OTTO') return 'font/otf';
  if (at(0, 4) === 'fLaC') return 'audio/flac';
  if (at(0, 4) === 'RIFF' && at(8, 12) === 'WEBP') return 'image/webp';
  if (at(0, 3) === 'ID3') return 'audio/mpeg';
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return 'application/zip';
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'video/webm';
  if (head[0] === 0x00 && head[1] === 0x01 && head[2] === 0x00 && head[3] === 0x00) return 'font/ttf';
  return 'application/octet-stream';
};

export const toAssetDataUrl = (name, arrayBuffer, headBytes) => {
  const ext = String(name).includes('.') ? String(name).split('.').pop().toLowerCase() : '';
  const head = headBytes || new Uint8Array(arrayBuffer).subarray(0, 16);
  return `data:${MIME_BY_EXT[ext] || sniffMime(head)};base64,${bufferToBase64(arrayBuffer)}`;
};

/** 文本前缀里出现 NUL 直接判二进制；C0 控制字符（去掉制表/换行/回车）占比过高也判二进制 */
const looksBinary = (head) => {
  let ctrl = 0;
  for (const b of head) {
    if (b === 0x00) return true;
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) ctrl++;
  }
  return head.length > 0 && ctrl / head.length >= 0.02;
};

const decodeUtf8OrNothing = (bytes) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

/** 读单个文件句柄：默认全收，所以不存在「不收」这条返回。
 *  @returns reason 为 text / asset / binary，后两者的值已是 data URL；读失败由调用方的 try/catch 记成 read-error */
export async function readPayloadFile(handle) {
  const name = handle?.name || '';
  const file = await handle.getFile();
  // svg 在资源名单里：它是文本，但 <img src> 与 @font-face 吃不了原始标记，必须折 data URL
  if (isAssetKey(name)) return { value: toAssetDataUrl(name, await file.arrayBuffer()), reason: 'asset' };
  if (TEXT_EXT_HINT_RE.test(name)) return { value: await file.text(), reason: 'text' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (looksBinary(bytes.subarray(0, 8192))) {
    return { value: toAssetDataUrl(name, bytes, bytes.subarray(0, 16)), reason: 'binary' };
  }
  const text = decodeUtf8OrNothing(bytes);
  if (text !== null) return { value: text, reason: 'text' };
  return { value: toAssetDataUrl(name, bytes, bytes.subarray(0, 16)), reason: 'binary' };
}

/** 递归采集目录：跳过的目录见 isSkippedDir，其余文件一律收，不设体积上限。
 *  files 的 key 用相对路径（带扩展名）；skipped 带着原因，与合计大小一起构成「你选错目录了」的信号 */
export async function collectPayloadFiles(dirHandle, prefix = '') {
  const files = {};
  const skipped = [];
  for await (const entry of dirHandle.values()) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      if (isSkippedDir(entry.name)) {
        skipped.push({ path: relPath, reason: 'skipped-dir' });
        continue;
      }
      const sub = await collectPayloadFiles(entry, relPath);
      Object.assign(files, sub.files);
      skipped.push(...sub.skipped);
      continue;
    }
    if (entry.kind !== 'file') continue;
    try {
      files[relPath] = (await readPayloadFile(entry)).value;
    } catch (e) {
      skipped.push({ path: relPath, reason: 'read-error' });
    }
  }
  return { files, skipped };
}

const sizeOf = (files) => Object.values(files).reduce((sum, v) => sum + (typeof v === 'string' ? v.length : 0), 0);

/** 报一句载荷合计供界面显示：不比较、不抛错，只是本机读数（同步链的产物根本不出网）。
 *  计量按字符串长度（UTF-16 码元）算，中文文本档会低估；资源档已是 base64，本来就比原文件大三分之一。
 *  出网判定在后端按真实字节做，量的还是打包后的 worker（载荷以原文与预编译双份内联），与这个数不同向 */
export function formatPayloadSize(files) {
  return `载荷合计 ${(sizeOf(files) / 1048576).toFixed(1)}MB`;
}

/** 把 skipped 折成一行提示：先按原因给条数，再点前几个名字 */
export function formatSkipped(skipped = []) {
  if (!skipped.length) return '';
  const COUNT = { 'skipped-dir': '跳过的目录', 'read-error': '读取失败' };
  const counts = {};
  for (const item of skipped) counts[item.reason] = (counts[item.reason] || 0) + 1;
  const summary = Object.entries(counts)
      .map(([reason, n]) => `${COUNT[reason] || reason} ${n} 个`)
      .join('、');
  const names = skipped.slice(0, 5).map(item => item.path).join('、');
  return `未采集 ${skipped.length} 项（${summary}）：${names}${skipped.length > 5 ? ' …' : ''}`;
}
