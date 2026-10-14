/**
 * 文档档载荷合成器：把内容包里的 HTML 入口折成一个自包含文档。
 * 全部子资源在合成期内联成 <style> / <script> / data: URL，运行期零请求，所以开发环境的
 * COEP require-corp 与 CSP 都拦不到它；同源（srcdoc 且不加 sandbox 属性）是引导脚本能直接
 * 读宿主登记表的先决条件。只做字符串改写、不建 DOM，合成结果可被 Node 侧校验器逐条断言。
 */
import { resolveDocRef, isDataUrlValue } from './sourceMapper';
import { RESTRICTED_STORAGE_APIS } from '@/sukinos/utils/security';

/** 宿主 window 上的实例 SDK 登记表键名，子文档引导脚本按 pid 惰性取用 */
export const APP_SDK_REGISTRY = '__SUKIN_APPSDK__';

// 属性值的三种写法：双引号 / 单引号 / 裸值。裸值不能含空白、引号、= < > `
// 用双引号字符串拼而非模板字面量：字符类里那个反引号会提前结束模板
const ATTR_VALUE = "(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))";

const attrOf = (fragment, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*${ATTR_VALUE}`, 'i').exec(fragment);
  return m ? String(m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
};

const replaceAttr = (tag, name, value) =>
  tag.replace(new RegExp(`(\\b${name}\\s*=\\s*)${ATTR_VALUE}`, 'i'), (whole, head) => `${head}"${value}"`);

/**
 * 内联文本里的结束标签会提前闭合外层标签：JS 里 `</script` 只可能出现在字符串/注释中，
 * `\/` 两种位置都合法且求值为 `/`；CSS 里反斜杠转义任意非十六进制字符同样表示该字符。
 */
const escapeClose = (text, tagName) => String(text).replace(new RegExp(`</${tagName}`, 'gi'), `<\\/${tagName}`);

/**
 * 脚本正文里的 `<script` 也转义：内联块与 `<!--` 相遇会让 HTML 解析器进入 script 双转义状态，
 * 把结束标签找丢。`\x3c` 在字符串、模板与正则字面量里都表示 `<`，注释里只是换个写法，语义不动。
 */
const escapeScriptText = (text) => escapeClose(text, 'script').replace(/<script/gi, '\\x3cscript');

const CSS_URL = /url\(\s*([^)]*?)\s*\)/gi;

/**
 * 样式表内联后，它自己的相对 url() 基准目录跟着文件走，不在子文档里。认不认载荷只看值：
 * 采集口默认全收，未知扩展名（.woff 之外的字体、.pdf）折成 data URL 就能接上——按 key 后缀判会漏掉它们，子文档就去朝宿主 origin 发请求。
 */
function inlineCssUrls(cssKey, css, files, keys) {
  return String(css).replace(CSS_URL, (whole, raw) => {
    const spec = raw.trim().replace(/^["']|["']$/g, '');
    if (!spec || /^(data:|blob:|#)/i.test(spec)) return whole;
    const key = resolveDocRef(cssKey, spec, keys);
    if (!key || !isDataUrlValue(files[key])) return whole;
    return `url("${files[key]}")`;
  });
}

/** 资源引用折成 data: URL。只看值是不是 data URL：html/css/js 的引用另有归宿，站点内导航更不该被换成巨串 */
function inlineAssets(taggedHtml, htmlKey, files, keys) {
  return taggedHtml.replace(/<(img|source|audio|video|embed|track|image|use)\b[^>]*>/gi, (tag) => {
    let next = tag;
    for (const name of ['src', 'href']) {
      const spec = attrOf(next, name);
      if (!spec) continue;
      const key = resolveDocRef(htmlKey, spec, keys);
      if (key && isDataUrlValue(files[key])) next = replaceAttr(next, name, files[key]);
    }
    return next;
  });
}

function inlineStyleSheets(html, htmlKey, files, keys) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attrOf(tag, 'rel');
    // preload / modulepreload / prefetch 指向的都是随包 chunk：就地内联后留着它，
    // 只会变成一次朝宿主 origin 的无效请求（srcdoc 的基准 URL 继承父文档）
    if (/preload|prefetch/i.test(rel)) return '';
    if (!/stylesheet/i.test(rel)) return tag;
    const spec = attrOf(tag, 'href');
    const key = resolveDocRef(htmlKey, spec, keys);
    // 折成 data URL 的是二进制资源，塞进 <style> 只会得到一坨乱码规则
    if (!key || typeof files[key] !== 'string' || isDataUrlValue(files[key])) return tag;
    return `<style data-sukin-inline="${key}">${escapeClose(inlineCssUrls(key, files[key], files, keys), 'style')}</style>`;
  });
}

/** 脚本按原文档顺序就地换成内联块，type=module 与 defer/async 之外的属性保留 */
function inlineScripts(html, htmlKey, files, keys) {
  return html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (whole, attrs) => {
    const spec = attrOf(attrs, 'src');
    if (!spec) return whole;
    const key = resolveDocRef(htmlKey, spec, keys);
    // 同理：被嗅探成二进制的未知扩展名不进 <script>，留着引用让子文档自己失败（可诊断）
    if (!key || typeof files[key] !== 'string' || isDataUrlValue(files[key])) return whole;
    const kept = attrs
      .replace(new RegExp(`\\bsrc\\s*=\\s*${ATTR_VALUE}`, 'i'), '')
      .replace(new RegExp(`\\bcrossorigin(?:\\s*=\\s*${ATTR_VALUE})?`, 'i'), '')
      .trim();
    return `<script${kept ? ` ${kept}` : ''} data-sukin-inline="${key}">${escapeScriptText(files[key])}</script>`;
  });
}

/**
 * 子文档引导脚本，三条约束：
 * - 禁直连持久化 API，把应用逼回 AppSDK.System（名单与宿主沙箱同源）
 * - AppSDK 走 getter 惰性取宿主登记表，注册时机不受子文档解析顺序影响
 * - srcdoc 文档里 pushState/replaceState 必然抛 SecurityError，吞掉让 SPA 继续渲染
 */
export function buildBootstrapScript(pid = '') {
  const apis = RESTRICTED_STORAGE_APIS.map(api => JSON.stringify(api)).join(', ');
  return `(function(){
var PID=${JSON.stringify(String(pid))};
var REGISTRY=${JSON.stringify(APP_SDK_REGISTRY)};
var host=null;try{host=window.parent;}catch(e){host=null;}
function readSdk(){try{var r=host&&host[REGISTRY];return r?r[PID]:undefined;}catch(e){return undefined;}}
[${apis}].forEach(function(api){
  try{Object.defineProperty(window,api,{
    get:function(){throw new Error('子文档拒绝直接访问原生 API \`'+api+'\`。请使用 AppSDK.System.'+api);},
    set:function(){throw new Error('严禁篡改原生 API \`'+api+'\`。');},
    configurable:false
  });}catch(e){}
});
try{Object.defineProperty(window,'AppSDK',{get:readSdk,configurable:false});}catch(e){}
['pushState','replaceState'].forEach(function(fn){
  try{
    var original=history[fn].bind(history);
    history[fn]=function(){try{return original.apply(history,arguments);}catch(e){return undefined;}};
  }catch(e){}
});
})();`;
}

/**
 * 合成自包含子文档。files 是内容包原始 map（key 保留扩展名），文档档的 htmlKey 就是入口的相对路径。
 * @returns 合成结果；入口不在内容包时返回 null，由调用方给出可读错误
 */
export function buildAppDocument(htmlKey, files = {}, pid = '') {
  const html = files[htmlKey];
  if (typeof html !== 'string') return null;
  const keys = Object.keys(files).filter(k => typeof files[k] === 'string');
  const bootstrap = `<script data-sukin-bootstrap="1">${buildBootstrapScript(pid)}</script>`;

  // <base> 一旦留着，未内联的相对引用会指向宿主 origin 下的真实路径
  let doc = html.replace(/<base\b[^>]*>/gi, '');
  // 先折资源再内联样式与脚本：内联进来的 JS 文本里可能有 <img src="..."> 字面量，
  // 倒过来会把应用运行期的字符串改成巨串 data URL
  doc = inlineAssets(doc, htmlKey, files, keys);
  doc = inlineStyleSheets(doc, htmlKey, files, keys);
  doc = inlineScripts(doc, htmlKey, files, keys);

  const headOpen = /<head\b[^>]*>/i;
  if (headOpen.test(doc)) return doc.replace(headOpen, whole => `${whole}${bootstrap}`);
  // 没有 <head> 时退到 <html> 或 <!doctype> 之后：直接前置会把 doctype 挤离首位，整份文档掉进怪异模式
  const anchor = /<html\b[^>]*>/i.exec(doc) || /<!doctype[^>]*>/i.exec(doc);
  if (anchor) return `${doc.slice(0, anchor.index + anchor[0].length)}${bootstrap}${doc.slice(anchor.index + anchor[0].length)}`;
  return `${bootstrap}${doc}`;
}
