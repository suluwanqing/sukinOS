import { useState, useEffect, useCallback, useRef } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { FileType, preSystemFileData } from "@/sukinos/utils/config";

const CONFIG_FILENAME = 'sukin_config.json';

export const PRESET_ACCENTS = ['#0067c0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#333333'];
export const PRESET_BG_COLORS = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#0f172a', '#000000'];

export const PRESET_STYLES = {
  classic: {
    name: '经典蓝调',
    description: '沉稳专业的蓝色主题',
    config: {
      themeMode: 'light',
      accentColor: '#0067c0',
      bgType: 'color',
      bgValue: '#f0f4f8',
      fontSize: 14,
      fontType: 'preset',
      fontValue: 'Segoe UI, system-ui, sans-serif',
      borderRadius: 8,
      glassEffect: true,
      deskIconSize: 50,
      deskIconRadius: 10,
      deskGridGap: 15,
      deskPadding: 20,
      deskFontColor: '#1e293b',
      deskIconShadow: 0.3,
      windowHeaderBg: '#ffffff',
      windowHeaderColor: '#1e293b',
      windowOpacity: 85,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  darkMode: {
    name: '暗夜模式',
    description: '护眼深色主题',
    config: {
      themeMode: 'dark',
      accentColor: '#8b5cf6',
      bgType: 'color',
      bgValue: '#0f172a',
      fontSize: 14,
      fontType: 'preset',
      fontValue: 'Segoe UI, system-ui, sans-serif',
      borderRadius: 12,
      glassEffect: true,
      deskIconSize: 55,
      deskIconRadius: 14,
      deskGridGap: 18,
      deskPadding: 25,
      deskFontColor: '#f1f5f9',
      deskIconShadow: 0.4,
      windowHeaderBg: '#1e293b',
      windowHeaderColor: '#f1f5f9',
      windowOpacity: 75,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  freshGreen: {
    name: '清新绿意',
    description: '自然舒适的绿色主题',
    config: {
      themeMode: 'light',
      accentColor: '#10b981',
      bgType: 'color',
      bgValue: '#ecfdf5',
      fontSize: 15,
      fontType: 'preset',
      fontValue: '"SimHei", "黑体", sans-serif',
      borderRadius: 10,
      glassEffect: false,
      deskIconSize: 52,
      deskIconRadius: 12,
      deskGridGap: 16,
      deskPadding: 22,
      deskFontColor: '#064e3b',
      deskIconShadow: 0.2,
      windowHeaderBg: '#f0fdf4',
      windowHeaderColor: '#065f46',
      windowOpacity: 100,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  warmOrange: {
    name: '温暖橙光',
    description: '充满活力的橙色主题',
    config: {
      themeMode: 'light',
      accentColor: '#f59e0b',
      bgType: 'color',
      bgValue: '#fffbeb',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"SimSun", "宋体", serif',
      borderRadius: 14,
      glassEffect: true,
      deskIconSize: 48,
      deskIconRadius: 16,
      deskGridGap: 14,
      deskPadding: 18,
      deskFontColor: '#78350f',
      deskIconShadow: 0.25,
      windowHeaderBg: '#fff7ed',
      windowHeaderColor: '#c2410c',
      windowOpacity: 85,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  pinkDream: {
    name: '粉红梦幻',
    description: '温柔浪漫的粉色主题',
    config: {
      themeMode: 'light',
      accentColor: '#ec4899',
      bgType: 'color',
      bgValue: '#fdf2f8',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"KaiTi", "楷体", serif',
      borderRadius: 16,
      glassEffect: true,
      deskIconSize: 54,
      deskIconRadius: 18,
      deskGridGap: 17,
      deskPadding: 23,
      deskFontColor: '#831843',
      deskIconShadow: 0.35,
      windowHeaderBg: '#fce7f3',
      windowHeaderColor: '#be185d',
      windowOpacity: 80,
      windowHeaderOpacity: 85,
      windowPadding: 0
    }
  },
  minimalBlackWhite: {
    name: '极简黑白',
    description: '纯粹简洁的黑白主题',
    config: {
      themeMode: 'light',
      accentColor: '#333333',
      bgType: 'color',
      bgValue: '#ffffff',
      fontSize: 13,
      fontType: 'preset',
      fontValue: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      borderRadius: 6,
      glassEffect: false,
      deskIconSize: 46,
      deskIconRadius: 8,
      deskGridGap: 12,
      deskPadding: 16,
      deskFontColor: '#000000',
      deskIconShadow: 0.15,
      windowHeaderBg: '#fafafa',
      windowHeaderColor: '#171717',
      windowOpacity: 100,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  techBluePurple: {
    name: '科技蓝紫',
    description: '未来感的蓝紫渐变主题',
    config: {
      themeMode: 'dark',
      accentColor: '#6366f1',
      bgType: 'color',
      bgValue: '#1e1b4b',
      fontSize: 15,
      fontType: 'preset',
      fontValue: '"SimHei", "黑体", sans-serif',
      borderRadius: 10,
      glassEffect: true,
      deskIconSize: 56,
      deskIconRadius: 13,
      deskGridGap: 19,
      deskPadding: 24,
      deskFontColor: '#e0e7ff',
      deskIconShadow: 0.45,
      windowHeaderBg: '#2e1065',
      windowHeaderColor: '#c4b5fd',
      windowOpacity: 75,
      windowHeaderOpacity: 90,
      windowPadding: 0
    }
  },
  forestDeep: {
    name: '森林深绿',
    description: '深邃宁静的森林主题',
    config: {
      themeMode: 'dark',
      accentColor: '#059669',
      bgType: 'color',
      bgValue: '#022c22',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"SimSun", "宋体", serif',
      borderRadius: 11,
      glassEffect: true,
      deskIconSize: 51,
      deskIconRadius: 11,
      deskGridGap: 16,
      deskPadding: 21,
      deskFontColor: '#a7f3d0',
      deskIconShadow: 0.38,
      windowHeaderBg: '#064e3b',
      windowHeaderColor: '#6ee7b7',
      windowOpacity: 75,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  cherryBlossom: {
    name: '樱花粉白',
    description: '甜美清新的樱花主题',
    config: {
      themeMode: 'light',
      accentColor: '#f472b6',
      bgType: 'color',
      bgValue: '#fff5f7',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"KaiTi", "楷体", serif',
      borderRadius: 18,
      glassEffect: true,
      deskIconSize: 53,
      deskIconRadius: 15,
      deskGridGap: 15,
      deskPadding: 20,
      deskFontColor: '#831843',
      deskIconShadow: 0.28,
      windowHeaderBg: '#fce7f3',
      windowHeaderColor: '#db2777',
      windowOpacity: 85,
      windowHeaderOpacity: 95,
      windowPadding: 0
    }
  },
  businessDark: {
    name: '商务深蓝',
    description: '专业稳重的商务主题',
    config: {
      themeMode: 'dark',
      accentColor: '#2563eb',
      bgType: 'color',
      bgValue: '#0f172a',
      fontSize: 13,
      fontType: 'preset',
      fontValue: 'Segoe UI, system-ui, sans-serif',
      borderRadius: 7,
      glassEffect: false,
      deskIconSize: 48,
      deskIconRadius: 9,
      deskGridGap: 13,
      deskPadding: 17,
      deskFontColor: '#e2e8f0',
      deskIconShadow: 0.2,
      windowHeaderBg: '#1e293b',
      windowHeaderColor: '#94a3b8',
      windowOpacity: 100,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  sunnyBeach: {
    name: '阳光沙滩',
    description: '明快活泼的海滩主题',
    config: {
      themeMode: 'light',
      accentColor: '#fbbf24',
      bgType: 'color',
      bgValue: '#fefce8',
      fontSize: 15,
      fontType: 'preset',
      fontValue: '"YouYuan", "幼圆", sans-serif',
      borderRadius: 13,
      glassEffect: true,
      deskIconSize: 55,
      deskIconRadius: 17,
      deskGridGap: 18,
      deskPadding: 22,
      deskFontColor: '#854d0e',
      deskIconShadow: 0.32,
      windowHeaderBg: '#fef9c3',
      windowHeaderColor: '#a16207',
      windowOpacity: 85,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  purpleMystery: {
    name: '紫色魅影',
    description: '神秘高贵的紫色主题',
    config: {
      themeMode: 'dark',
      accentColor: '#a855f7',
      bgType: 'color',
      bgValue: '#2e1065',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"SimHei", "黑体", sans-serif',
      borderRadius: 12,
      glassEffect: true,
      deskIconSize: 52,
      deskIconRadius: 14,
      deskGridGap: 17,
      deskPadding: 23,
      deskFontColor: '#e9d5ff',
      deskIconShadow: 0.42,
      windowHeaderBg: '#4c1d95',
      windowHeaderColor: '#d8b4fe',
      windowOpacity: 75,
      windowHeaderOpacity: 90,
      windowPadding: 0
    }
  },
  vintageBrown: {
    name: '复古棕褐',
    description: '怀旧复古的棕色调',
    config: {
      themeMode: 'light',
      accentColor: '#b45309',
      bgType: 'color',
      bgValue: '#fef3c7',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"SimSun", "宋体", serif',
      borderRadius: 9,
      glassEffect: false,
      deskIconSize: 49,
      deskIconRadius: 10,
      deskGridGap: 14,
      deskPadding: 19,
      deskFontColor: '#451a03',
      deskIconShadow: 0.22,
      windowHeaderBg: '#fffbeb',
      windowHeaderColor: '#92400e',
      windowOpacity: 100,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  },
  oceanSong: {
    name: '海洋之歌',
    description: '清新凉爽的海洋主题',
    config: {
      themeMode: 'light',
      accentColor: '#06b6d4',
      bgType: 'color',
      bgValue: '#ecfeff',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"SimHei", "黑体", sans-serif',
      borderRadius: 10,
      glassEffect: true,
      deskIconSize: 50,
      deskIconRadius: 12,
      deskGridGap: 15,
      deskPadding: 20,
      deskFontColor: '#164e63',
      deskIconShadow: 0.27,
      windowHeaderBg: '#cffafe',
      windowHeaderColor: '#0891b2',
      windowOpacity: 85,
      windowHeaderOpacity: 95,
      windowPadding: 0
    }
  },
  goldenClassic: {
    name: '高贵金典',
    description: '奢华高贵的金色主题',
    config: {
      themeMode: 'dark',
      accentColor: '#f59e0b',
      bgType: 'color',
      bgValue: '#1c1917',
      fontSize: 14,
      fontType: 'preset',
      fontValue: '"KaiTi", "楷体", serif',
      borderRadius: 10,
      glassEffect: true,
      deskIconSize: 54,
      deskIconRadius: 13,
      deskGridGap: 16,
      deskPadding: 21,
      deskFontColor: '#fef3c7',
      deskIconShadow: 0.48,
      windowHeaderBg: '#292524',
      windowHeaderColor: '#fcd34d',
      windowOpacity: 75,
      windowHeaderOpacity: 100,
      windowPadding: 0
    }
  }
};

export const defaultPersonalization = {
  themeMode: 'light',
  accentColor: '#0067c0',
  bgType: 'video',
  bgValue: 'system_2mp4',
  fontSize: 14,
  fontType: 'preset',
  fontValue: 'Segoe UI, system-ui, sans-serif',
  borderRadius: 10,
  glassEffect: true,
  deskIconSize: 50,
  deskIconRadius: 12,
  deskGridGap: 15,
  deskPadding: 20,
  deskFontColor: '#ffffff',
  deskIconShadow: 0,
  windowHeaderBg: '#f9fafb',
  windowHeaderColor: '#1f2937',
  windowOpacity: 80,
  windowHeaderOpacity: 100,
  windowPadding: 0,
  customColor: {
    baseColor: 'primary',
    shade: 500
  },
  customBgColor: {
    baseColor: 'dark',
    shade: 900
  },
  customDeskFontColor: {
    baseColor: 'dark',
    shade: 50
  },
  customWindowHeaderBg: {
    baseColor: 'dark',
    shade: 50
  },
  customWindowHeaderColor: {
    baseColor: 'dark',
    shade: 800
  },
  maxWindows: 10,    // 最大可见窗口
  maxWorkers: 5,     // 最大并发 Worker
  workerLRU: true,   // 启用 LRU 淘汰
  autoHideStatusBar: false, // 启动/聚焦APP时自动关闭状态栏
  autoSaveStateInterval: 0,  // 自动保存状态间隔(秒), 0=禁用
  autoSaveWindowInterval: 0, // 自动保存窗口位置间隔(秒), 0=禁用
};

export const colorSystem = ['yellow', 'apricot', 'cyan', 'red', 'black', 'primary'];
export const colorSystemRange = [50, 100, 200, 300, 400, 500, 900];

// 令牌层（utils/css/color.css）删除后，再拼 var(--su-<base>-<shade>) 会解析为空，
// 所以把取色器用的 6 基色 × 7 档按旧表原值搬成字面 hex，配置里存的直接是可用颜色。
export const COLOR_SCALE = {
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 900: '#713f12' },
  apricot: { 50: '#fefaf6', 100: '#fdf2e6', 200: '#fbe4cd', 300: '#f8d5b0', 400: '#f4b884', 500: '#f19e5c', 900: '#7d3f26' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 900: '#164e63' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 900: '#7f1d1d' },
  black: { 50: '#fafafa', 100: '#f5f5f5', 200: '#eeeeee', 300: '#e0e0e0', 400: '#bdbdbd', 500: '#9e9e9e', 900: '#212121' },
  primary: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 900: '#0c4a6e' },
};

// 老存档的 baseColor 可能在表外（出厂默认里就写着 dark），查不到时退回调用方给的兜底色
export const scaleColor = (custom, fallback) => COLOR_SCALE[custom.baseColor]?.[custom.shade] ?? fallback;

export const PRESET_FONTS = [
  { name: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { name: '微软雅黑', value: '"Microsoft YaHei", "微软雅黑", sans-serif' },
  { name: '现代黑体', value: '"SimHei", "黑体", sans-serif' },
  { name: '经典宋体', value: '"SimSun", "宋体", serif' },
  { name: '优雅楷体', value: '"KaiTi", "楷体", serif' },
  { name: '清秀仿宋', value: '"FangSong", "仿宋", serif' },
  { name: '艺术隶书', value: '"LiSu", "隶书", serif' },
  { name: '圆润幼圆', value: '"YouYuan", "幼圆", sans-serif' },
];

// 读档归一：老存档里 fontValue / windowHeaderBg 这类配置项存的是 var(--su-*) 串，
// 令牌层删除后这些引用解析为空。--custom-* 与 --su-os-* 仍是活的运行时变量，原样保留；
// 认不出的 --su-* 直接丢掉，让 defaultPersonalization 接手。
const LEGACY_VAR_VALUES = {
  '--su-font-family-yahei': `"Microsoft YaHei", "微软雅黑", sans-serif`,
  '--su-font-family-hei': `"SimHei", "黑体", sans-serif`,
  '--su-font-family-song': `"SimSun", "宋体", serif`,
  '--su-font-family-kai': `"KaiTi", "楷体", serif`,
  '--su-font-family-fangsong': `"FangSong", "仿宋", serif`,
  '--su-font-family-lishu': `"LiSu", "隶书", serif`,
  '--su-font-family-youyuan': `"YouYuan", "幼圆", sans-serif`,
  '--su-font-family-applesystem': `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  '--su-font-family-xingkai': `'STXingkai', '华文行楷', 'Xingkai SC', '楷体', cursive`,
  '--su-font-family-xinwei': `'STXinwei', '华文新魏', 'KaiTi', serif`,
  '--su-font-family-hupo': `'STHupo', '华文琥珀', 'YouYuan', sans-serif`,
  '--su-font-family-caiyun': `'STCaiyun', '华文彩云', 'YouYuan', sans-serif`,
  '--su-font-family-libian': `'STLibian', '华文隶变', 'LiSu', serif`,
  '--su-gray-50': '#f9fafb',
  '--su-gray-800': '#1f2937',
  ...Object.fromEntries(
    Object.entries(COLOR_SCALE).flatMap(([base, shades]) =>
      Object.entries(shades).map(([shade, hex]) => [`--su-${base}-${shade}`, hex]))
  ),
};

// 配置项 → 记 baseColor/shade 的那半个字段，丢掉色值串时要把档位记忆一起丢，
// 否则会出现"颜色回到出厂、取色器还停在自定义档"的错位
const LEGACY_COLOR_PAIRS = {
  accentColor: 'customColor',
  bgValue: 'customBgColor',
  deskFontColor: 'customDeskFontColor',
  windowHeaderBg: 'customWindowHeaderBg',
  windowHeaderColor: 'customWindowHeaderColor',
};

const normalizeLegacyConfig = (parsed) => {
  const out = { ...parsed };
  for (const [key, value] of Object.entries(out)) {
    const m = typeof value === 'string' && /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
    if (!m) continue;
    if (/^--(custom|su-os)-/.test(m[1])) continue;
    if (LEGACY_VAR_VALUES[m[1]]) {
      out[key] = LEGACY_VAR_VALUES[m[1]];
      continue;
    }
    console.warn(`[Personalization] 配置项 ${key} 的值 ${value} 无法解析，改用出厂值`);
    delete out[key];
    if (LEGACY_COLOR_PAIRS[key]) delete out[LEGACY_COLOR_PAIRS[key]];
  }
  return out;
};

// 模块级单例：所有 usePersonalization 实例共享同一份 config 状态
export const personalizationStore = {
  config: { ...defaultPersonalization },
  listeners: new Set(),
  get: () => personalizationStore.config,
  set(updater) {
    const next = typeof updater === 'function' ? updater(personalizationStore.config) : updater;
    if (next === personalizationStore.config) return;
    personalizationStore.config = next;
    personalizationStore.listeners.forEach(fn => fn(next));
  },
  subscribe(fn) {
    personalizationStore.listeners.add(fn);
    return () => personalizationStore.listeners.delete(fn);
  }
};

/* themeMode 的首屏引导与 <html> 上的 .dark 切换抽到了同目录的 themeMode.js：
   那个文件零依赖，src/main.jsx 需要它做首屏防闪，若从这里引会把整条 VFS 依赖链
   拖进入口 chunk。 */
import { applyThemeMode } from '../../themeMode.js';

export const usePersonalization = () => {
  const [config, setConfig] = useState(() => personalizationStore.get());
  useEffect(() => personalizationStore.subscribe(setConfig), []);
  const [localAssets, setLocalAssets] = useState({ images: [], videos: [], fonts: [] });
  const configIdRef = useRef(null);
  const activeResourceId = useRef({ bg: null, font: null });
  const base64Cache = useRef({ bg: null, font: null });
  const saveTimerRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  /* ===== 深色模式接线 =====
     global.css 里 @custom-variant dark (&:is(.dark *)) 把 dark: 工具类绑到了 .dark class 上，
     :root / .dark 两套语义令牌也据此二选一。所以只要在 <html> 上挂/摘 .dark，
     整棵文档树里的 bg-popover / text-foreground / border-border 就会自动取到对应的一套值。

     挂 documentElement 而不是 #sukin-os：本项目有一批浮层是 portal 到 document.body 的
     （toast、confirm、右键菜单、PageList 列设置面板），它们在 #sukin-os 的 DOM 子树之外。
     只挂 #sukin-os 的话，深色模式下这些浮层仍是浅色，在深色桌面上非常扎眼。
     它们用的都是语义令牌，.dark 下有配套的深色值，翻过去是正确的。

     顺带说明：body 的 bg-background 会跟着翻，但 #sukin-os 是 100dvw×100dvh 且自带
     个性化背景色，视觉上看不到 body，无副作用。

     <html> 不属于 React 树，不能用受控 className，所以走 classList。
     首屏的那一次挂载由 main.jsx 里的 bootstrapThemeMode() 提前做完（同步、防闪），
     这里负责配置变化后的持续同步与回写镜像。 */
  useEffect(() => {
    applyThemeMode(config.themeMode);
  }, [config.themeMode]);

  // 区分配置是来自外部加载，还是来自本组件实例的用户修改，防止刷新等外部副作用触发误重写
  const hasPendingChangesRef = useRef(false);

  const getMimeType = useCallback((filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'webp': 'image/webp', 'gif': 'image/gif', 'bmp': 'image/bmp',
      'mp4': 'video/mp4', 'webm': 'video/webm', 'ogg': 'video/ogg',
      'ttf': 'font/ttf', 'woff': 'font/woff', 'woff2': 'font/woff2', 'otf': 'font/otf'
    };
    return map[ext] || 'application/octet-stream';
  }, []);

  const generateBase64FromFs = useCallback(async (fileId) => {
    if (!fileId) return null;
    if (String(fileId).startsWith('system_')) {
      const systemFile = preSystemFileData.find(f => f.id === fileId);
      return systemFile ? systemFile.path : null;
    }
    try {
      const data = await fs.readFile(fileId);
      if (data === undefined || data === null) return null;
      const allFiles = [...localAssets.images, ...localAssets.videos, ...localAssets.fonts];
      const fileInfo = allFiles.find(f => f.id === fileId);
      const mimeType = fileInfo ? getMimeType(fileInfo.name) : 'application/octet-stream';
      let blob;
      if (typeof data === 'string') {
        if (data.startsWith('data:')) return data;
        const len = data.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) { bytes[i] = data.charCodeAt(i) & 0xff; }
        blob = new Blob([bytes], { type: mimeType });
      } else if (data instanceof Blob) {
        blob = data.type ? data : new Blob([data], { type: mimeType });
      } else if (typeof data === 'object' && !(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) {
        const realBuffer = data.data || data.buffer || data.content || data;
        blob = new Blob([realBuffer], { type: mimeType });
      } else {
        blob = new Blob([data], { type: mimeType });
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, [localAssets, getMimeType]);

  useEffect(() => {
    const initSystem = async () => {
      try {
        if (!fs.ready) await fs.boot();
        const items = await fs.readdir('root');
        const assets = { images: [], videos: [], fonts: [] };
        items.forEach(item => {
          if (item.type !== FileType.FILE) return;
          if (item.name === CONFIG_FILENAME) { configIdRef.current = item.id; return; }
          const ext = item.name.split('.').pop().toLowerCase();
          if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) assets.images.push(item);
          else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) assets.videos.push(item);
          else if (['ttf', 'woff', 'woff2', 'otf'].includes(ext)) assets.fonts.push(item);
        });
        setLocalAssets(assets);
        if (configIdRef.current) {
          const content = await fs.readFile(configIdRef.current);
          if (content) {
            try {
              let jsonStr = content;
              if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
                  jsonStr = new TextDecoder('utf-8').decode(content);
              } else if (typeof content === 'object' && content.buffer) {
                  jsonStr = new TextDecoder('utf-8').decode(content.buffer);
              }
              const parsed = JSON.parse(jsonStr);
              personalizationStore.set(prev => ({ ...prev, ...normalizeLegacyConfig(parsed) }));
            } catch { console.error("配置解析失败，使用默认"); }
          }
        } else {
          const newFile = await fs.writeFile('root', CONFIG_FILENAME, JSON.stringify(defaultPersonalization));
          if (newFile && newFile.id) configIdRef.current = newFile.id;
        }
      } catch (err) { console.error("系统初始化加载失败:", err); }
    };
    initSystem();
  }, []);

  const updateConfig = useCallback((key, value) => {
    hasPendingChangesRef.current = true;
    personalizationStore.set(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateMultipleConfigs = useCallback((updates) => {
    hasPendingChangesRef.current = true;
    personalizationStore.set(prev => ({ ...prev, ...updates }));
  }, []);

  const applyPresetStyle = useCallback((presetKey) => {
    const preset = PRESET_STYLES[presetKey];
    if (preset && preset.config) {
      hasPendingChangesRef.current = true;
      personalizationStore.set(prev => ({ ...prev, ...preset.config }));
      return true;
    }
    return false;
  }, []);

  const getAllPresetStyles = useCallback(() => {
    return Object.entries(PRESET_STYLES).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      config: value.config
    }));
  }, []);

  const updateCustomColor = useCallback((target, baseColor, shade) => {
    const hex = COLOR_SCALE[baseColor][shade];
    hasPendingChangesRef.current = true;
    if (target === 'accent') {
      personalizationStore.set(prev => ({ ...prev, accentColor: hex, customColor: { baseColor, shade } }));
    } else if (target === 'bg') {
      personalizationStore.set(prev => ({ ...prev, bgType: 'color', bgValue: hex, customBgColor: { baseColor, shade } }));
    } else if (target === 'deskFont') {
      personalizationStore.set(prev => ({ ...prev, deskFontColor: hex, customDeskFontColor: { baseColor, shade } }));
    } else if (target === 'windowHeaderBg') {
      personalizationStore.set(prev => ({ ...prev, windowHeaderBg: hex, customWindowHeaderBg: { baseColor, shade } }));
    } else if (target === 'windowHeaderColor') {
      personalizationStore.set(prev => ({ ...prev, windowHeaderColor: hex, customWindowHeaderColor: { baseColor, shade } }));
    }
  }, []);

  const getCurrentAccentColor = useCallback(() => {
    const { accentColor, customColor } = config;
    if (PRESET_ACCENTS.includes(accentColor)) return accentColor;
    return scaleColor(customColor, defaultPersonalization.accentColor);
  }, [config]);

  // 刷新时主动从 VFS (虚拟文件系统) 读取最新的存储内容，防止由于 Hook 状态孤立引起的配置回滚
  const refreshConfig = useCallback(async () => {
    if (configIdRef.current) {
      try {
        const content = await fs.readFile(configIdRef.current);
        if (content) {
          let jsonStr = content;
          if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
              jsonStr = new TextDecoder('utf-8').decode(content);
          } else if (typeof content === 'object' && content.buffer) {
              jsonStr = new TextDecoder('utf-8').decode(content.buffer);
          }
          const parsed = JSON.parse(jsonStr);
          personalizationStore.set(prev => ({ ...prev, ...normalizeLegacyConfig(parsed) }));
        }
      } catch (e) {
        console.error("重新加载配置失败:", e);
      }
    }
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // 仅在用户主动修改配置时触发持久化写入
  useEffect(() => {
    if (!hasPendingChangesRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (configIdRef.current && hasPendingChangesRef.current) {
        try {
          await fs.updateContent(configIdRef.current, JSON.stringify(config));
          hasPendingChangesRef.current = false; // 保存成功后重置标记
        } catch (e) {
          console.error("[Personalization] 保存配置失败:", e);
        }
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config]);

  useEffect(() => {
    const osContainer = document.getElementById('sukin-os');
    if (!osContainer) return;

    const applyStyles = async () => {
      let appliedFont = config.fontValue;
      if (config.fontType === 'custom') {
        if (activeResourceId.current.font !== config.fontValue) {
          const fontBase64 = await generateBase64FromFs(config.fontValue);
          if (fontBase64) {
            base64Cache.current.font = fontBase64;
            activeResourceId.current.font = config.fontValue;
            let fontTag = document.getElementById('su-os-custom-font');
            if (!fontTag) {
              fontTag = document.createElement('style'); fontTag.id = 'su-os-custom-font';
              document.head.appendChild(fontTag);
            }
            fontTag.innerHTML = `@font-face { font-family: 'SukinFont_${config.fontValue}'; src: url('${fontBase64}'); }`;
          }
        }
        appliedFont = `SukinFont_${config.fontValue}`;
      }

      const currentAccentColor = getCurrentAccentColor();

      const wOpacity = (config.windowOpacity ?? 80) / 100;

      const surfaceLight = `rgba(255, 255, 255, ${wOpacity})`;
      const surfaceDark = `rgba(30, 30, 30, ${wOpacity})`;
      const finalSurfaceBg = config.themeMode === 'dark' ? surfaceDark : surfaceLight;

      const headerOpacityStr = `${config.windowHeaderOpacity ?? 100}%`;
      const finalHeaderBg = config.windowHeaderBg === 'transparent'
        ? 'transparent'
        : `color-mix(in srgb, ${config.windowHeaderBg} ${headerOpacityStr}, transparent)`;

      let styleTag = document.getElementById('su-os-variables');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'su-os-variables';
        document.head.appendChild(styleTag);
      }

      // 所有样式变量统一注入到 #sukin-os
      styleTag.innerHTML = `
        #sukin-os {
          /* 字体相关变量 */
          --su-os-font-family: ${appliedFont};
          --su-os-font-size: ${config.fontSize}px;

          /* 主题相关变量 */
          --su-os-theme-mode: ${config.themeMode};
          --su-os-accent-color: ${currentAccentColor};
          --su-os-border-radius: ${config.borderRadius}px;
          --su-os-glass-effect: ${config.glassEffect};

          /* 主题模式颜色变量 */
          --su-os-text-color: ${config.themeMode === 'dark' ? '#f1f5f9' : '#1e293b'};


          /* 动态计算的带透明度的表面主背景色 (应用于 Window 等主体) */
          --su-os-surface-bg: ${finalSurfaceBg};

          /* 保留用于纯色底板等无需透明度的组件部分 */
          --su-os-surface-bg-solid: ${config.themeMode === 'dark' ? '#1e1e1e' : '#ffffff'};

          /* 窗口内边距调节变量 */
          --su-os-window-padding: ${config.windowPadding ?? 0}px;

          /* 窗口头部背景采用 color-mix 叠加透明度 */
          --custom-window-header-bg: ${finalHeaderBg};

          /* 动态计算的边框色 */
          --su-os-border-color: ${config.themeMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};

          /* 动态计算的阴影和毛玻璃特效 */
          --su-os-shadow: ${config.glassEffect ? '0 8px 32px rgba(0,0,0,0.15)' : 'none'};
          --su-os-backdrop: ${config.glassEffect ? 'blur(20px) saturate(160%)' : 'none'};

          /* 桌面图标相关变量 */
          --custom-deskbook-icon-size: ${config.deskIconSize}px;
          --custom-deskbook-icon-radius: ${config.deskIconRadius}px;
          --custom-deskbook-grid-gap: ${config.deskGridGap}px;
          --custom-deskbook-padding: ${config.deskPadding}px;
          --custom-deskbook-font-color: ${config.deskFontColor};
          --custom-deskbook-icon-shadow: ${config.deskIconShadow === 0 ? 'none' : `drop-shadow(0 ${config.deskIconShadow * 4}px ${config.deskIconShadow * 8}px rgba(0,0,0,0.5))`};

          /* 窗口其他头部变量 */
          --custom-window-header-color: ${config.windowHeaderColor};
          --custom-window-border-radius: ${config.borderRadius}px;
        }
      `;

      let videoEl = document.getElementById('su-os-bg-video');
      if (config.bgType === 'color') {
        if (videoEl) videoEl.remove();
        osContainer.style.backgroundImage = 'none';
        osContainer.style.backgroundColor = config.bgValue;
        activeResourceId.current.bg = null;
      } else if (config.bgType === 'image') {
        if (videoEl) videoEl.remove();
        if (activeResourceId.current.bg !== config.bgValue) {
          const imgBase64 = await generateBase64FromFs(config.bgValue);
          if (imgBase64) {
            base64Cache.current.bg = imgBase64;
            activeResourceId.current.bg = config.bgValue;
            osContainer.style.backgroundImage = `url('${imgBase64}')`;
            osContainer.style.backgroundSize = 'cover';
            osContainer.style.backgroundPosition = 'center';
            osContainer.style.backgroundColor = 'transparent';
          }
        } else if (base64Cache.current.bg) {
          osContainer.style.backgroundImage = `url('${base64Cache.current.bg}')`;
        }
      } else if (config.bgType === 'video') {
        osContainer.style.backgroundImage = 'none';

        // 查找专门的隔离背景层，如果没有则降级使用 osContainer
        const targetContainer = document.getElementById('su-os-bg-layer') || osContainer;
        // 不仅检查文件是否变更，还要检查视频元素是不是被 React 给删除了
        const videoElExists = document.getElementById('su-os-bg-video');
        if (activeResourceId.current.bg !== config.bgValue || !videoElExists) {
          // 如果只是 DOM 丢失（资源没变且缓存还在），直接复用 base64 缓存，不消耗性能重新读取
          let videoBase64 = base64Cache.current.bg;
          if (activeResourceId.current.bg !== config.bgValue || !videoBase64) {
             videoBase64 = await generateBase64FromFs(config.bgValue);
          }
          if (videoBase64) {
            base64Cache.current.bg = videoBase64;
            activeResourceId.current.bg = config.bgValue;
            if (videoElExists) videoElExists.remove();
            videoEl = document.createElement('video');
            videoEl.id = 'su-os-bg-video';
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.setAttribute('playsinline', 'true');
            videoEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;';
            targetContainer.appendChild(videoEl);
            videoEl.src = videoBase64;
            videoEl.play().catch(e => console.warn("Video autoplay blocked", e));
          }
        }
        osContainer.style.backgroundColor = 'transparent';
      }

      osContainer.style.fontFamily = `var(--su-os-font-family)`;
      osContainer.style.fontSize = `var(--su-os-font-size)`;
      osContainer.style.color = `var(--su-os-text-color)`;
    };

    applyStyles();
  }, [config, localAssets, generateBase64FromFs, refreshTrigger, getCurrentAccentColor]);

  return {
    config,
    localAssets,
    updateConfig,
    updateMultipleConfigs,
    updateCustomColor,
    getCurrentAccentColor,
    getFileBase64: generateBase64FromFs,
    refreshConfig,
    applyPresetStyle,
    getAllPresetStyles
  };
}

export default usePersonalization;
