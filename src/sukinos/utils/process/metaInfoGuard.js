//执行位只能由内置注册表或服务端签名清单决定，包体与接口响应都不能自证
export const EXECUTION_META_KEYS = Object.freeze([
  "isParasitism",
  "tier",
  "isSystem",
  "permissions",
  "hostIntegration",
]);

export function stripExecutionMeta(metaInfo) {
  if (!metaInfo || typeof metaInfo !== "object" || Array.isArray(metaInfo)) return {};
  const clean = {};
  for (const key of Object.keys(metaInfo)) {
    if (!EXECUTION_META_KEYS.includes(key)) clean[key] = metaInfo[key];
  }
  return clean;
}

//系统预置 ID 与 sys- 前缀只允许内置注册表或内部签名通道写入
export function isReservedSystemResourceId(kernel, resourceId) {
  if (!resourceId) return false;
  if (String(resourceId).startsWith("sys-")) return true;
  return kernel?.presetResourceIds?.has(resourceId) === true;
}

//第三方应用样式只进宿主 <style>，外链可能借 CSS 探测内网或回传信息，统一掐掉
export function sanitizeAppCss(css) {
  if (typeof css !== "string" || !css) return "";
  let cleaned = css.replace(/@import[\s\S]*?;/gi, "");
  cleaned = cleaned.replace(/url\(\s*(['"]?)\s*(?:https?:)?\/\/[^)]*\)/gi, 'url("")');
  return cleaned;
}
