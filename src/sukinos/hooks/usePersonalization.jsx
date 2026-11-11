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
  windowPaddingTop: 0,
  windowPaddingRight: 0,
  windowPaddingBottom: 0,
  windowPaddingLeft: 0,
  customColor: { baseColor: 'primary', shade: 500 },
  customBgColor: { baseColor: 'dark', shade: 900 },
  customDeskFontColor: { baseColor: 'dark', shade: 50 },
  customWindowHeaderBg: { baseColor: 'dark', shade: 50 },
  customWindowHeaderColor: { baseColor: 'dark', shade: 800 },
  maxWindows: 10,
  maxWorkers: 5,
  workerLRU: true,
  autoHideStatusBar: false,
  bgFitMobile: 'cover',
  bgCropMobile: { x: 50, y: 50, scale: 1 },
  mobileWallpaperScroll: false, // 移动端壁纸随页横向平移
  mobileFloatingBall: false, // 移动端悬浮球：聚合打开应用 / 返回 / 回桌面，开启后隐藏系统手势带
  mobileFloatingBallColor: 'auto', // auto = 跟随强调色；否则保存具体色值
  mobileFloatingBallSize: 48, // 球体直径（px）
  mobileFloatingBallOpacity: 100, // 球体整体透明度（%）
  mobileFloatingBallTextColor: '#fafafa', // 球体图标与菜单文字共用颜色
  mobileFloatingBallIconOnly: false, // 菜单只显示图标
  customFloatingBallColor: { baseColor: 'primary', shade: 500 },
  customFloatingBallTextColor: { baseColor: 'black', shade: 50 },
  gestureBandHeight: 0, // 手势带视觉条高度（px），0 = 隐藏，不影响手势热区
  gestureBandColor: '#333333',
  gestureBandOpacity: 100, // 0 = 完全透明
  customGestureBandColor: { baseColor: 'black', shade: 900 },
  autoSaveStateInterval: 0,
  autoSaveWindowInterval: 0,
};

export const colorSystem = ['yellow', 'apricot', 'cyan', 'red', 'black', 'primary'];
export const colorSystemRange = [50, 100, 200, 300, 400, 500, 900];

export const COLOR_SCALE = {
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 900: '#713f12' },
  apricot: { 50: '#fefaf6', 100: '#fdf2e6', 200: '#fbe4cd', 300: '#f8d5b0', 400: '#f4b884', 500: '#f19e5c', 900: '#7d3f26' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 900: '#164e63' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 900: '#7f1d1d' },
  black: { 50: '#fafafa', 100: '#f5f5f5', 200: '#eeeeee', 300: '#e0e0e0', 400: '#bdbdbd', 500: '#9e9e9e', 900: '#212121' },
  primary: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 900: '#0c4a6e' },
};

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

const LEGACY_VAR_VALUES = {
  '--su-font-family-yahei': `"Microsoft YaHei", "微软雅黑", sans-serif`,
  '--su-font-family-hei': `"SimHei", "黑体", sans-serif`,
  '--su-font-family-song': `"SimSun", "宋体", serif`,
  '--su-font-family-kai': `"KaiTi", "楷体", serif`,
  '--su-font-family-fangsong': `"FangSong", "仿宋", serif`,
  '--su-font-family-lishu': `"LiSu", "隶书", serif`,
  '--su-font-family-youyuan': `"YouYuan", "幼圆", sans-serif`,
  '--su-font-family-applesystem': `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
  '--su-gray-50': '#f9fafb',
  '--su-gray-800': '#1f2937',
  ...Object.fromEntries(
    Object.entries(COLOR_SCALE).flatMap(([base, shades]) =>
      Object.entries(shades).map(([shade, hex]) => [`--su-${base}-${shade}`, hex]))
  ),
};

const LEGACY_COLOR_PAIRS = {
  accentColor: 'customColor',
  bgValue: 'customBgColor',
  deskFontColor: 'customDeskFontColor',
  windowHeaderBg: 'customWindowHeaderBg',
  windowHeaderColor: 'customWindowHeaderColor',
};

const expandWindowPadding = (cfg) => {
  if (cfg.windowPadding == null) return cfg;
  const { windowPadding, ...rest } = cfg;
  const p = Number(windowPadding) || 0;
  return {
    ...rest,
    windowPaddingTop: rest.windowPaddingTop ?? p,
    windowPaddingRight: rest.windowPaddingRight ?? p,
    windowPaddingBottom: rest.windowPaddingBottom ?? p,
    windowPaddingLeft: rest.windowPaddingLeft ?? p,
  };
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
    delete out[key];
    if (LEGACY_COLOR_PAIRS[key]) delete out[LEGACY_COLOR_PAIRS[key]];
  }
  return expandWindowPadding(out);
};

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

import { applyThemeMode } from '../../themeMode.js';

export const usePersonalization = () => {
  const [config, setConfig] = useState(() => personalizationStore.get());
  useEffect(() => personalizationStore.subscribe(setConfig), []);
  const [localAssets, setLocalAssets] = useState({ images: [], videos: [], fonts: [] });
  const configIdRef = useRef(null);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);
  const activeResourceId = useRef({ bg: null, font: null });
  const base64Cache = useRef({ bg: null, font: null });
  const saveTimerRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    applyThemeMode(config.themeMode);
  }, [config.themeMode]);

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
            } catch { console.error("配置解析失败"); }
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
      personalizationStore.set(prev => ({ ...prev, ...expandWindowPadding(preset.config) }));
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
    } else if (target === 'floatingBall') {
      personalizationStore.set(prev => ({ ...prev, mobileFloatingBallColor: hex, customFloatingBallColor: { baseColor, shade } }));
    } else if (target === 'floatingBallText') {
      personalizationStore.set(prev => ({ ...prev, mobileFloatingBallTextColor: hex, customFloatingBallTextColor: { baseColor, shade } }));
    } else if (target === 'gestureBand') {
      personalizationStore.set(prev => ({ ...prev, gestureBandColor: hex, customGestureBandColor: { baseColor, shade } }));
    }
  }, []);

  const getCurrentAccentColor = useCallback(() => {
    const { accentColor, customColor } = config;
    if (PRESET_ACCENTS.includes(accentColor)) return accentColor;
    return scaleColor(customColor, defaultPersonalization.accentColor);
  }, [config]);

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
      } catch (e) {}
    }
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!hasPendingChangesRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (configIdRef.current && hasPendingChangesRef.current) {
        try {
          await fs.updateContent(configIdRef.current, JSON.stringify(config));
          hasPendingChangesRef.current = false;
        } catch (e) {}
      }
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
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
      const finalHeaderBg = config.windowHeaderBg === 'transparent' ? 'transparent' : `color-mix(in srgb, ${config.windowHeaderBg} ${headerOpacityStr}, transparent)`;

      let styleTag = document.getElementById('su-os-variables');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'su-os-variables';
        document.head.appendChild(styleTag);
      }

      const cropX = config.bgCropMobile?.x ?? 50;
      const cropY = config.bgCropMobile?.y ?? 50;
      const cropScale = config.bgCropMobile?.scale ?? 1;
      const isMobileContain = config.bgFitMobile === 'contain';
      const isMobileScroll = config.mobileWallpaperScroll;

      const mobileBgSize = isMobileContain ? 'contain' : (
        isMobileScroll ? `auto ${cropScale * 100}%` : (cropScale === 1 ? 'cover' : `${cropScale * 100}% auto`)
      );

      // 开启滚动后 X 轴位置交给 --su-os-bg-scroll-ratio
      const mobileBgPosition = isMobileContain ? 'center center' : (
        isMobileScroll ? `var(--su-os-bg-scroll-ratio, 0%) ${cropY}%` : `${cropX}% ${cropY}%`
      );
      const mobileVideoFit = isMobileContain ? 'contain' : 'cover';
      // 视频壁纸与图片走同一套取景语义：裁切位置、缩放、滚动视差都作用在视频画面上
      const mobileVideoPosition = isMobileContain ? 'center center' : (
        isMobileScroll ? `var(--su-os-bg-scroll-ratio, 0%) ${cropY}%` : `${cropX}% ${cropY}%`
      );
      const mobileVideoSize = isMobileContain ? '100%' : `${cropScale * 100}%`;

      styleTag.innerHTML = `
        /* 挂到 :root：悬浮球、调度中心等 portal 到 body 的浮层在 #sukin-os 子树之外，
           只有提升到根节点才能继承到同一套字体 */
        :root {
          --su-os-font-family: ${appliedFont};
          /* 手势带视觉条：只做外观提示，热区高度仍由 --su-gesture-bottom 决定 */
          --su-gesture-visual-height: ${config.gestureBandHeight ?? 0}px;
          --su-gesture-visual-color: ${config.gestureBandColor || '#333333'};
          --su-gesture-visual-opacity: ${(config.gestureBandOpacity ?? 100) / 100};
        }

        #sukin-os {
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          --su-os-font-family: ${appliedFont};
          --su-os-font-size: ${config.fontSize}px;
          --su-os-theme-mode: ${config.themeMode};
          --su-os-accent-color: ${currentAccentColor};
          --su-os-border-radius: ${config.borderRadius}px;
          --su-os-glass-effect: ${config.glassEffect};
          --su-os-text-color: ${config.themeMode === 'dark' ? '#f1f5f9' : '#1e293b'};
          --su-os-surface-bg: ${finalSurfaceBg};
          --su-os-surface-bg-solid: ${config.themeMode === 'dark' ? '#1e1e1e' : '#ffffff'};
          --su-os-window-padding-top: ${config.windowPaddingTop ?? 0}px;
          --su-os-window-padding-right: ${config.windowPaddingRight ?? 0}px;
          --su-os-window-padding-bottom: ${config.windowPaddingBottom ?? 0}px;
          --su-os-window-padding-left: ${config.windowPaddingLeft ?? 0}px;
          --custom-window-header-bg: ${finalHeaderBg};
          --su-os-border-color: ${config.themeMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'};
          --su-os-shadow: ${config.glassEffect ? '0 8px 32px rgba(0,0,0,0.15)' : 'none'};
          --su-os-backdrop: ${config.glassEffect ? 'blur(20px) saturate(160%)' : 'none'};
          --custom-deskbook-icon-size: ${config.deskIconSize}px;
          --custom-deskbook-icon-radius: ${config.deskIconRadius}px;
          --custom-deskbook-grid-gap: ${config.deskGridGap}px;
          --custom-deskbook-padding: ${config.deskPadding}px;
          --custom-deskbook-font-color: ${config.deskFontColor};
          --custom-deskbook-icon-shadow: ${config.deskIconShadow === 0 ? 'none' : `drop-shadow(0 ${config.deskIconShadow * 4}px ${config.deskIconShadow * 8}px rgba(0,0,0,0.5))`};
          --custom-window-header-color: ${config.windowHeaderColor};
          --custom-window-border-radius: ${config.borderRadius}px;
        }

        #su-os-bg-video {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%);
          object-fit: cover;
          object-position: center;
          z-index: -1;
          pointer-events: none;
        }

        @media (max-width: 767px) {
          #sukin-os {
            background-size: ${mobileBgSize};
            background-position: ${mobileBgPosition};
            transition: background-position 0.15s ease-out;
          }

          #su-os-bg-video {
            object-fit: ${mobileVideoFit};
            object-position: ${mobileVideoPosition};
            width: ${mobileVideoSize};
            height: ${mobileVideoSize};
            transition: object-position 0.15s ease-out;
          }
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
            osContainer.style.backgroundColor = 'transparent';
          }
        } else if (base64Cache.current.bg) {
          osContainer.style.backgroundImage = `url('${base64Cache.current.bg}')`;
        }
      } else if (config.bgType === 'video') {
        osContainer.style.backgroundImage = 'none';
        const targetContainer = document.getElementById('su-os-bg-layer') || osContainer;
        const videoElExists = document.getElementById('su-os-bg-video');
        if (activeResourceId.current.bg !== config.bgValue || !videoElExists) {
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
            targetContainer.appendChild(videoEl);
            videoEl.src = videoBase64;
            videoEl.play().catch(e => {});
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
};

export default usePersonalization;
