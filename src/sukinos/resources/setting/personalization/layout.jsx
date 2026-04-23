import React, { useState, useEffect, memo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';

import LightModeIcon from '@mui/icons-material/LightMode';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import RoundedCornerIcon from '@mui/icons-material/RoundedCorner';
import InvertColorsIcon from '@mui/icons-material/InvertColors';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import ColorLensOutlinedIcon from '@mui/icons-material/ColorLensOutlined';
import WebAssetOutlinedIcon from '@mui/icons-material/WebAssetOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined';

import usePersonalization, {
  PRESET_BG_COLORS,
  PRESET_ACCENTS,
  PRESET_FONTS,
  colorSystem,
  colorSystemRange,
  colorSystemPre
} from '@/sukinos/hooks/usePersonalization';

const bem = createNamespace('setting-personalize');

const AssetPreview = memo(({ fileId, fileName, type, getFileBase64 }) => {
  const [base64Src, setBase64Src] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (fileId) {
      getFileBase64(fileId).then(src => {
        if (isMounted && src) setBase64Src(src);
      });
    }
    return () => { isMounted = false; };
  }, [fileId, getFileBase64]);

  if (!base64Src) {
    return type === 'image' ?
      <ImageOutlinedIcon style={{ color: '#cbd5e1' }} /> :
      <VideocamOutlinedIcon style={{ color: '#cbd5e1' }} />;
  }

  return type === 'image' ? (
    <img src={base64Src} alt={fileName} className={style[bem.e('preview-media')]} />
  ) : (
    <video src={base64Src} className={style[bem.e('preview-media')]} muted playsInline />
  );
});

const SliderRow = ({ label, hint, value, min, max, step = 1, unit = '', onChange }) => (
  <div className={style[bem.e('control-row')]}>
    <div className={style[bem.e('label-container')]}>
      <span className={style[bem.e('label')]}>{label}</span>
      {hint && <span className={style[bem.e('label-hint')]}>{hint}</span>}
    </div>
    <input
      type="range"
      min={min} max={max} step={step}
      className={style[bem.e('slider')]}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <span className={style[bem.e('value')]}>{value}{unit}</span>
  </div>
);

const ColorSelector = ({
  presets,
  currentValue,
  customConfig,
  customVar,
  onSelectPreset,
  onUpdateCustom,
  type = 'large'
}) => (
  <>
    <div className={style[bem.e('color-row')]}>
      {presets.map(color => (
        <div key={color}
          className={`${style[bem.e(type === 'large' ? 'color-swatch' : 'color-swatch-small')]} ${currentValue === color ? style[bem.is('active', true)] : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onSelectPreset(color)}
        />
      ))}
      <div className={style[bem.e('color-divider')]}></div>
      <div
        className={`${style[bem.e(type === 'large' ? 'color-swatch' : 'color-swatch-small')]} ${currentValue === customVar ? style[bem.is('active', true)] : ''}`}
        style={{ backgroundColor: customVar }}
        onClick={() => onSelectPreset(customVar)}
      />
    </div>
    <div className={style[bem.e('custom-selector')]}>
      <div className={style[bem.e('selection-row')]}>
        {colorSystem.map(c => (
          <div key={c}
            className={`${style[bem.e('mini-chip')]} ${customConfig.baseColor === c ? style[bem.is('active', true)] : ''}`}
            onClick={() => onUpdateCustom(c, customConfig.shade)}
          >
            {c}
          </div>
        ))}
      </div>
      <div className={style[bem.e('selection-row')]}>
        {colorSystemRange.map(r => (
          <div key={r}
            className={`${style[bem.e('mini-chip')]} ${customConfig.shade === r ? style[bem.is('active', true)] : ''}`}
            onClick={() => onUpdateCustom(customConfig.baseColor, r)}
          >
            {r}
          </div>
        ))}
      </div>
    </div>
  </>
);

const Personalization = () => {
  const {
    config,
    localAssets,
    updateConfig,
    updateMultipleConfigs,
    updateCustomColor,
    getFileBase64,
    applyPresetStyle,
    getAllPresetStyles
  } = usePersonalization();

  const [bgTab, setBgTab] = useState('image');
  const [showPresets, setShowPresets] = useState(true);

  const presetStylesList = getAllPresetStyles();

  const isPresetAccent = PRESET_ACCENTS.includes(config.accentColor);
  const currentAccentVar = `var(${colorSystemPre}-${config.customColor.baseColor}-${config.customColor.shade})`;
  const isPresetBgColor = PRESET_BG_COLORS.includes(config.bgValue);
  const currentBgVar = `var(${colorSystemPre}-${config.customBgColor.baseColor}-${config.customBgColor.shade})`;
  const currentDeskFontVar = `var(${colorSystemPre}-${config.customDeskFontColor.baseColor}-${config.customDeskFontColor.shade})`;
  const currentWindowHeaderBgVar = `var(${colorSystemPre}-${config.customWindowHeaderBg.baseColor}-${config.customWindowHeaderBg.shade})`;
  const currentWindowHeaderColorVar = `var(${colorSystemPre}-${config.customWindowHeaderColor.baseColor}-${config.customWindowHeaderColor.shade})`;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('section')]}>
        <div className={[style[bem.e('section-title')],style[bem.e('pre-theme')]].join(' ')}>
          <div className={style[bem.e('title-wrap')]}>
            <StyleOutlinedIcon style={{ fontSize: 18, marginRight: 8 }} />
            主题方案
          </div>
          <button
            className={style[bem.e('preset-toggle')]}
            onClick={() => setShowPresets(!showPresets)}
          >
            {showPresets ? '收起方案' : '展开方案'}
          </button>
        </div>
        {showPresets && (
          <div className={style[bem.e('card')]}>
            <div className={style[bem.e('preset-grid')]}>
              {presetStylesList.map(preset => (
                <div
                  key={preset.id}
                  className={`${style[bem.e('preset-item')]} ${config.presetId === preset.id ? style[bem.is('selected', true)] : ''}`}
                  onClick={() => applyPresetStyle(preset.id)}
                >
                  <div className={style[bem.e('preset-visual')]}>
                    <div
                      className={style[bem.e('preset-visual-header')]}
                      style={{ backgroundColor: preset.config.windowHeaderBg, color: preset.config.windowHeaderColor }}
                    >
                      <div className={style[bem.e('preset-dot')]} />
                    </div>
                    <div
                      className={style[bem.e('preset-visual-body')]}
                      style={{ backgroundColor: preset.config.bgType === 'color' ? preset.config.bgValue : '#f1f5f9' }}
                    >
                      <div
                        className={style[bem.e('preset-visual-icon')]}
                        style={{ backgroundColor: preset.config.accentColor, borderRadius: `${preset.config.deskIconRadius / 2}px` }}
                      />
                      <div className={style[bem.e('preset-visual-text')]} style={{ backgroundColor: preset.config.deskFontColor }} />
                    </div>
                  </div>
                  <span className={style[bem.e('preset-name')]}>{preset.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={style[bem.e('row')]}>
        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><LightModeIcon style={{ fontSize: 18, marginRight: 8 }} /> 主题模式</div>
          <div className={style[bem.e('card')]}>
            <div className={style[bem.e('theme-options')]}>
              <div
                className={`${style[bem.e('theme-box')]} ${config.themeMode === 'light' ? style[bem.is('selected', true)] : ''}`}
                onClick={() => updateConfig('themeMode', 'light')}
              >
                <div className={style[bem.e('theme-preview-light')]}></div>
                <span>浅色</span>
              </div>
              <div
                className={`${style[bem.e('theme-box')]} ${config.themeMode === 'dark' ? style[bem.is('selected', true)] : ''}`}
                onClick={() => updateConfig('themeMode', 'dark')}
              >
                <div className={style[bem.e('theme-preview-dark')]}></div>
                <span>深色</span>
              </div>
            </div>
          </div>
        </div>

        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><InvertColorsIcon style={{ fontSize: 18, marginRight: 8 }}/> 强调色</div>
          <div className={style[bem.e('card')]}>
            <ColorSelector
              presets={PRESET_ACCENTS}
              currentValue={config.accentColor}
              customConfig={config.customColor}
              customVar={currentAccentVar}
              onSelectPreset={(val) => updateConfig('accentColor', val)}
              onUpdateCustom={(base, shade) => updateCustomColor('accent', base, shade)}
            />
          </div>
        </div>
      </div>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><WallpaperIcon style={{ fontSize: 18, marginRight: 8 }} /> 桌面背景</div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('tabs')]}>
            <button className={`${style[bem.e('tab')]} ${bgTab === 'color' ? style[bem.is('active', true)] : ''}`} onClick={() => setBgTab('color')}>
              <ColorLensOutlinedIcon style={{ fontSize: 16 }} /> 纯色
            </button>
            <button className={`${style[bem.e('tab')]} ${bgTab === 'image' ? style[bem.is('active', true)] : ''}`} onClick={() => setBgTab('image')}>
              <ImageOutlinedIcon style={{ fontSize: 16 }} /> 图片
            </button>
            <button className={`${style[bem.e('tab')]} ${bgTab === 'video' ? style[bem.is('active', true)] : ''}`} onClick={() => setBgTab('video')}>
              <VideocamOutlinedIcon style={{ fontSize: 16 }} /> 视频
            </button>
          </div>

          <div className={style[bem.e('grid-container')]}>
            {bgTab === 'color' && (
              <div>
                <div className={style[bem.e('grid')]}>
                  {PRESET_BG_COLORS.map(col => (
                    <div key={col} className={`${style[bem.e('grid-item')]} ${config.bgType === 'color' && config.bgValue === col ? style[bem.is('selected', true)] : ''}`}
                      onClick={() => updateMultipleConfigs({ bgType: 'color', bgValue: col })}>
                      <div className={style[bem.e('preview-box')]} style={{ background: col }}></div>
                    </div>
                  ))}
                  <div className={`${style[bem.e('grid-item')]} ${config.bgType === 'color' && !isPresetBgColor ? style[bem.is('selected', true)] : ''}`}
                    onClick={() => updateMultipleConfigs({ bgType: 'color', bgValue: currentBgVar })}>
                    <div className={style[bem.e('preview-box')]} style={{ background: currentBgVar }}></div>
                    <span className={style[bem.e('filename')]}>自定义</span>
                  </div>
                </div>
                <div className={style[bem.e('custom-selector')]}>
                  <div className={style[bem.e('selection-row')]}>
                    {colorSystem.map(c => (
                      <div key={c}
                        className={`${style[bem.e('mini-chip')]} ${config.customBgColor.baseColor === c ? style[bem.is('active', true)] : ''}`}
                        onClick={() => updateCustomColor('bg', c, config.customBgColor.shade)}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                  <div className={style[bem.e('selection-row')]}>
                    {colorSystemRange.map(r => (
                      <div key={r}
                        className={`${style[bem.e('mini-chip')]} ${config.customBgColor.shade === r ? style[bem.is('active', true)] : ''}`}
                        onClick={() => updateCustomColor('bg', config.customBgColor.baseColor, r)}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {bgTab === 'image' && (
              <div className={style[bem.e('grid')]}>
                {localAssets.images.map(img => (
                  <div key={img.id} className={`${style[bem.e('grid-item')]} ${config.bgType === 'image' && config.bgValue === img.id ? style[bem.is('selected', true)] : ''}`}
                    onClick={() => updateMultipleConfigs({ bgType: 'image', bgValue: img.id })}>
                    <div className={style[bem.e('preview-box')]}>
                      <AssetPreview fileId={img.id} fileName={img.name} type="image" getFileBase64={getFileBase64} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bgTab === 'video' && (
              <div className={style[bem.e('grid')]}>
                {localAssets.videos.map(vid => (
                  <div key={vid.id} className={`${style[bem.e('grid-item')]} ${config.bgType === 'video' && config.bgValue === vid.id ? style[bem.is('selected', true)] : ''}`}
                    onClick={() => updateMultipleConfigs({ bgType: 'video', bgValue: vid.id })}>
                    <div className={style[bem.e('preview-box')]}>
                       <AssetPreview fileId={vid.id} fileName={vid.name} type="video" getFileBase64={getFileBase64} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={style[bem.e('row')]}>
        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><GridViewOutlinedIcon style={{ fontSize: 18, marginRight: 8 }} /> 图标外观</div>
          <div className={style[bem.e('card')]}>
            <SliderRow label="尺寸" value={config.deskIconSize} min={30} max={100} unit="%" onChange={(val) => updateConfig('deskIconSize', val)} />
            <SliderRow label="圆角" value={config.deskIconRadius} min={0} max={50} unit="px" onChange={(val) => updateConfig('deskIconRadius', val)} />
            <SliderRow label="阴影" value={Math.round(config.deskIconShadow * 100)} min={0} max={100} unit="%" onChange={(val) => updateConfig('deskIconShadow', val/100)} />
          </div>
        </div>

        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><TextFieldsIcon style={{ fontSize: 18, marginRight: 8 }} /> 桌面文字</div>
          <div className={style[bem.e('card')]}>
            <ColorSelector
              type="small"
              presets={PRESET_ACCENTS}
              currentValue={config.deskFontColor}
              customConfig={config.customDeskFontColor}
              customVar={currentDeskFontVar}
              onSelectPreset={(val) => updateConfig('deskFontColor', val)}
              onUpdateCustom={(base, shade) => updateCustomColor('deskFont', base, shade)}
            />
          </div>
        </div>
      </div>

      <div className={style[bem.e('row')]}>
        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><DashboardOutlinedIcon style={{ fontSize: 18, marginRight: 8 }} /> 桌面布局</div>
          <div className={style[bem.e('card')]}>
            <SliderRow label="间距" value={config.deskGridGap} min={0} max={40} unit="px" onChange={(val) => updateConfig('deskGridGap', val)} />
            <SliderRow label="边距" value={config.deskPadding} min={0} max={60} step={2} unit="px" onChange={(val) => updateConfig('deskPadding', val)} />
          </div>
        </div>

        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><WebAssetOutlinedIcon style={{ fontSize: 18, marginRight: 8 }} /> 窗口头部背景</div>
          <div className={style[bem.e('card')]}>
            <div className={style[bem.e('color-row')]}>
              {PRESET_BG_COLORS.map(c => (
                <div key={c}
                  className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderBg === c ? style[bem.is('active', true)] : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => updateConfig('windowHeaderBg', c)}
                />
              ))}
              <div className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderBg === 'transparent' ? style[bem.is('active', true)] : ''}`}
                   style={{ backgroundColor: 'transparent', border: '1px dashed #ccc' }}
                   onClick={() => updateConfig('windowHeaderBg', 'transparent')} />
              <div className={style[bem.e('color-divider')]}></div>
              <div
                className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderBg === currentWindowHeaderBgVar ? style[bem.is('active', true)] : ''}`}
                style={{ backgroundColor: currentWindowHeaderBgVar }}
                onClick={() => updateConfig('windowHeaderBg', currentWindowHeaderBgVar)}
              />
            </div>
            <div className={style[bem.e('custom-selector')]}>
              <div className={style[bem.e('selection-row')]}>
                {colorSystem.map(c => (
                  <div key={c}
                    className={`${style[bem.e('mini-chip')]} ${config.customWindowHeaderBg.baseColor === c ? style[bem.is('active', true)] : ''}`}
                    onClick={() => updateCustomColor('windowHeaderBg', c, config.customWindowHeaderBg.shade)}
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div className={style[bem.e('selection-row')]}>
                {colorSystemRange.map(r => (
                  <div key={r}
                    className={`${style[bem.e('mini-chip')]} ${config.customWindowHeaderBg.shade === r ? style[bem.is('active', true)] : ''}`}
                    onClick={() => updateCustomColor('windowHeaderBg', config.customWindowHeaderBg.baseColor, r)}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
            <div className={style[bem.e('divider')]}></div>
            <SliderRow label="透明度" value={config.windowHeaderOpacity} min={0} max={100} unit="%" onChange={(val) => updateConfig('windowHeaderOpacity', val)} />
          </div>
        </div>
      </div>

      <div className={style[bem.e('row')]}>
        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><TextFieldsIcon style={{ fontSize: 18, marginRight: 8 }} /> 窗口文字颜色</div>
          <div className={style[bem.e('card')]}>
            <div className={style[bem.e('color-row')]}>
              {PRESET_ACCENTS.map(c => (
                <div key={c}
                  className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderColor === c ? style[bem.is('active', true)] : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => updateConfig('windowHeaderColor', c)}
                />
              ))}
              <div className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderColor === '#ffffff' ? style[bem.is('active', true)] : ''}`}
                   style={{ backgroundColor: '#ffffff', border: '1px solid #eee' }}
                   onClick={() => updateConfig('windowHeaderColor', '#ffffff')} />
              <div className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderColor === '#000000' ? style[bem.is('active', true)] : ''}`}
                   style={{ backgroundColor: '#000000' }}
                   onClick={() => updateConfig('windowHeaderColor', '#000000')} />
              <div className={style[bem.e('color-divider')]}></div>
              <div
                className={`${style[bem.e('color-swatch-small')]} ${config.windowHeaderColor === currentWindowHeaderColorVar ? style[bem.is('active', true)] : ''}`}
                style={{ backgroundColor: currentWindowHeaderColorVar }}
                onClick={() => updateConfig('windowHeaderColor', currentWindowHeaderColorVar)}
              />
            </div>
            <div className={style[bem.e('custom-selector')]}>
              <div className={style[bem.e('selection-row')]}>
                {colorSystem.map(c => (
                  <div key={c}
                    className={`${style[bem.e('mini-chip')]} ${config.customWindowHeaderColor.baseColor === c ? style[bem.is('active', true)] : ''}`}
                    onClick={() => updateCustomColor('windowHeaderColor', c, config.customWindowHeaderColor.shade)}
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div className={style[bem.e('selection-row')]}>
                {colorSystemRange.map(r => (
                  <div key={r}
                    className={`${style[bem.e('mini-chip')]} ${config.customWindowHeaderColor.shade === r ? style[bem.is('active', true)] : ''}`}
                    onClick={() => updateCustomColor('windowHeaderColor', config.customWindowHeaderColor.baseColor, r)}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={style[bem.e('section')]} style={{ flex: 1 }}>
          <div className={style[bem.e('section-title')]}><TextFieldsIcon style={{ fontSize: 18, marginRight: 8 }} /> 全局字体样式</div>
          <div className={style[bem.e('card')]}>
            <div className={style[bem.e('font-list')]}>
              {PRESET_FONTS.map(f => (
                <div key={f.value} className={`${style[bem.e('list-item')]} ${config.fontType === 'preset' && config.fontValue === f.value ? style[bem.is('selected', true)] : ''}`}
                  onClick={() => updateMultipleConfigs({ fontType: 'preset', fontValue: f.value })}>
                  <span style={{fontFamily: f.value, fontSize: 18, width: 28, textAlign: 'center'}}>A</span>
                  <span className={style[bem.e('list-name')]}>{f.name}</span>
                </div>
              ))}
            </div>
            <div className={style[bem.e('divider')]}></div>
            <SliderRow label="字号" value={config.fontSize} min={12} max={24} unit="px" onChange={(val) => updateConfig('fontSize', val)} />
          </div>
        </div>
      </div>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}><RoundedCornerIcon style={{ fontSize: 18, marginRight: 8 }} /> 视觉反馈</div>
        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('toggle-row')]}>
            <div>
              <span className={style[bem.e('label-bold')]}>毛玻璃特效</span>
              <span className={style[bem.e('description')]}>开启全系统窗口高斯模糊</span>
            </div>
            <div className={`${style[bem.e('switch')]} ${config.glassEffect ? style[bem.is('on', true)] : ''}`}
              onClick={() => updateConfig('glassEffect', !config.glassEffect)}>
              <div className={style[bem.e('switch-knob')]}></div>
            </div>
          </div>
          <div className={style[bem.e('divider')]}></div>
          <div>
            <span className={style[bem.e('label-bold')]}>容器圆角</span>
            <div className={style[bem.e('btn-group')]}>
              {[{l:'直角',v:0}, {l:'常规',v:10}, {l:'圆润',v:18}].map(r => (
                <button key={r.v} className={`${style[bem.e('chip')]} ${config.borderRadius === r.v ? style[bem.is('active', true)] : ''}`}
                  onClick={() => updateConfig('borderRadius', r.v)}>{r.l}</button>
              ))}
            </div>
          </div>
          <SliderRow label="半径" value={config.borderRadius} min={0} max={24} unit="px" onChange={(val) => updateConfig('borderRadius', val)} />
          <div className={style[bem.e('divider')]}></div>
          <SliderRow label="背景透明" hint="不会穿透" value={config.windowOpacity} min={0} max={100} unit="%" onChange={(val) => updateConfig('windowOpacity', val)} />
          <div className={style[bem.e('divider')]}></div>
          <SliderRow label="窗口内距" value={config.windowPadding} min={0} max={40} unit="px" onChange={(val) => updateConfig('windowPadding', val)} />
        </div>
      </div>
    </div>
  );
};

export default Personalization;
