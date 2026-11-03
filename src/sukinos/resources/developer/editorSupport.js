// 开发者中心编辑器支持表：语言映射、文本扩展名、可编辑内容判定
const LANGUAGE_BY_EXT = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  css: 'css', scss: 'scss', less: 'less',
  html: 'html', htm: 'html', vue: 'html', svelte: 'html',
  json: 'json', jsonc: 'json', json5: 'json',
  md: 'markdown', markdown: 'markdown',
  xml: 'xml', svg: 'xml', xsl: 'xml',
  yaml: 'yaml', yml: 'yaml',
  sh: 'shell', bash: 'shell', zsh: 'shell', bat: 'bat', cmd: 'bat',
  py: 'python', java: 'java', go: 'go', rs: 'rust', php: 'php', rb: 'ruby', lua: 'lua',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
  sql: 'sql', ini: 'ini', toml: 'ini', conf: 'ini',
  txt: 'plaintext', log: 'plaintext', csv: 'plaintext'
};

const extOf = (name) => (name || '').split('.').pop().toLowerCase();

export const getEditorLanguage = (name) => LANGUAGE_BY_EXT[extOf(name)] || 'plaintext';

// 本地模式的 handleOpenFile 返回 File：只有文本类才按 UTF-8 解码
export const isEditorTextFile = (name) => Object.prototype.hasOwnProperty.call(LANGUAGE_BY_EXT, extOf(name));

// Blob / File / ArrayBuffer / TypedArray 不交给 Monaco
const isBinaryContent = (content) =>
  typeof content === 'object' && content !== null &&
  (typeof content.text === 'function' ||
   typeof content.arrayBuffer === 'function' ||
   typeof content.byteLength === 'number');

export const canEditContent = (content) =>
  typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean' ||
  (typeof content === 'object' && content !== null && !isBinaryContent(content));

export const toEditorValue = (content) => {
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null) return JSON.stringify(content, null, 2);
  return content === undefined || content === null ? '' : String(content);
};
