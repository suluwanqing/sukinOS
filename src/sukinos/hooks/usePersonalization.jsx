import { useState, useEffect, useCallback, useRef } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { FileType, preSystemFileData } from "@/sukinos/utils/config";

const CONFIG_FILENAME = 'sukin_config.json'; // 唯一的配置文件名

// === 预设常量 ===
export const PRESET_ACCENTS = ['#0067c0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#333333'];
export const PRESET_BG_COLORS = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#0f172a', '#000000'];

// === 预设样式方案 ===
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
      fontValue: 'var(--su-font-family-hei)',
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
      fontValue: 'var(--su-font-family-song)',
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
      fontValue: 'var(--su-font-family-kai)',
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
      fontValue: 'var(--su-font-family-applesystem)',
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
      fontValue: 'var(--su-font-family-hei)',
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
      fontValue: 'var(--su-font-family-song)',
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
      fontValue: 'var(--su-font-family-kai)',
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
      fontValue: 'var(--su-font-family-youyuan)',
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
      fontValue: 'var(--su-font-family-hei)',
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
      fontValue: 'var(--su-font-family-song)',
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
      fontValue: 'var(--su-font-family-hei)',
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
      fontValue: 'var(--su-font-family-kai)',
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

// === 默认个性化配置 ===
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
  windowHeaderBg: 'var(--su-gray-50)',
  windowHeaderColor: 'var(--su-gray-800)',
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
  }
};

export const colorSystemPre = '--su';
export const colorSystem = ['yellow', 'apricot', 'cyan', 'red', 'black', 'primary'];
export const colorSystemRange = [50, 100, 200, 300, 400, 500, 900];

export const PRESET_FONTS = [
  { name: '系统默认', value: 'var(--su-font-family-applesystem)' },
  { name: '微软雅黑', value: 'var(--su-font-family-yahei)' },
  { name: '现代黑体', value: 'var(--su-font-family-hei)' },
  { name: '经典宋体', value: 'var(--su-font-family-song)' },
  { name: '优雅楷体', value: 'var(--su-font-family-kai)' },
  { name: '清秀仿宋', value: 'var(--su-font-family-fangsong)' },
  { name: '艺术隶书', value: 'var(--su-font-family-lishu)' },
  { name: '圆润幼圆', value: 'var(--su-font-family-youyuan)' },
];

export const getColorFromCSSVar = (cssVar) => {
  if (!cssVar || !cssVar.startsWith('var(--su-')) return cssVar;
  const tempDiv = document.createElement('div');
  tempDiv.style.display = 'none';
  tempDiv.style.color = cssVar;
  document.body.appendChild(tempDiv);
  const computedColor = getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);
  if (computedColor && computedColor.startsWith('rgb')) {
    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
  }
  return cssVar;
};

export const usePersonalization = () => {
  const [config, setConfig] = useState(defaultPersonalization);
  const [localAssets, setLocalAssets] = useState({ images: [], videos: [], fonts: [] });
  const configIdRef = useRef(null);
  const activeResourceId = useRef({ bg: null, font: null });
  const base64Cache = useRef({ bg: null, font: null });
  const saveTimerRef = useRef(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    } catch (e) {
      // console.error("[Personalization] 转码失败:", e);
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
              setConfig(prev => ({ ...prev, ...parsed }));
            } catch (e) { console.error("配置解析失败，使用默认"); }
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
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateMultipleConfigs = useCallback((updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const applyPresetStyle = useCallback((presetKey) => {
    const preset = PRESET_STYLES[presetKey];
    if (preset && preset.config) {
      setConfig(prev => ({ ...prev, ...preset.config }));
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
    const newVar = `var(${colorSystemPre}-${baseColor}-${shade})`;
    if (target === 'accent') {
      setConfig(prev => ({ ...prev, accentColor: newVar, customColor: { baseColor, shade } }));
    } else if (target === 'bg') {
      setConfig(prev => ({ ...prev, bgType: 'color', bgValue: newVar, customBgColor: { baseColor, shade } }));
    } else if (target === 'deskFont') {
      setConfig(prev => ({ ...prev, deskFontColor: newVar, customDeskFontColor: { baseColor, shade } }));
    } else if (target === 'windowHeaderBg') {
      setConfig(prev => ({ ...prev, windowHeaderBg: newVar, customWindowHeaderBg: { baseColor, shade } }));
    } else if (target === 'windowHeaderColor') {
      setConfig(prev => ({ ...prev, windowHeaderColor: newVar, customWindowHeaderColor: { baseColor, shade } }));
    }
  }, []);

  const getCurrentAccentColor = useCallback(() => {
    const { accentColor, customColor } = config;
    if (PRESET_ACCENTS.includes(accentColor)) return accentColor;
    if (accentColor && accentColor.startsWith('var(--su-')) return accentColor;
    return `var(${colorSystemPre}-${customColor.baseColor}-${customColor.shade})`;
  }, [config]);

  const refreshConfig = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const osContainer = document.getElementById('sukin-os');
    if (!osContainer) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (configIdRef.current) await fs.updateContent(configIdRef.current, JSON.stringify(config));
    }, 800);

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

      // 根据设置计算主体 Alpha 透明度值 (0-1)
      const wOpacity = (config.windowOpacity ?? 80) / 100;

      // 动态推导并生成带有透明度的表面背景色
      const surfaceLight = `rgba(255, 255, 255, ${wOpacity})`;
      const surfaceDark = `rgba(30, 30, 30, ${wOpacity})`;
      const finalSurfaceBg = config.themeMode === 'dark' ? surfaceDark : surfaceLight;

      // 利用 CSS 混色模型 (color-mix) 处理头部背景的透明度
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

      // 背景处理
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
        if (activeResourceId.current.bg !== config.bgValue) {
          const videoBase64 = await generateBase64FromFs(config.bgValue);
          if (videoBase64) {
            base64Cache.current.bg = videoBase64;
            activeResourceId.current.bg = config.bgValue;
            if (videoEl) videoEl.remove();
            videoEl = document.createElement('video');
            videoEl.id = 'su-os-bg-video';
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.setAttribute('playsinline', 'true');
            videoEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;';
            osContainer.appendChild(videoEl);
            videoEl.src = videoBase64;
            videoEl.play().catch(e => console.warn("Video autoplay blocked", e));
          }
        }
        osContainer.style.backgroundColor = 'transparent';
      }

      // 应用字体和基础样式
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
