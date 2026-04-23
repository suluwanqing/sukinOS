import React, { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PreviewIcon from '@mui/icons-material/Preview';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import ListIcon from '@mui/icons-material/List';

import CheckGroup from "@/component/checkGroup/layout";
import Select from "@/component/select/drowSelection/layout";
import Check from "@/component/check/layout";
import Input from "@/component/input/layout";

const bem = createNamespace('setting');

// === 通用辅助函数：获取深层嵌套路径的值 ===
const getValue = (obj, path) => path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

// === 通用辅助函数：不可变地设置深层嵌套路径的值 ===
const setPathValue = (obj, path, value) => {
  if (path.length === 1) {
    return { ...obj, [path[0]]: value };
  }
  const [head, ...rest] = path;
  return {
    ...obj,
    [head]: setPathValue(obj[head] || {}, rest, value)
  };
};

// === 基础设置配置表：分层架构优化 ===
// 将配置项按照逻辑功能划分为不同的 Group，方便 UI 渲染和后续功能拓展
const CONFIG_GROUPS = [
  {
    groupTitle: '部署与隐私',
    items: [
      { label: '云端上传', path: ['sysOptions', 'shouldUpload'] },
      { label: '应用私有', path: ['sysOptions', 'uploadInfo', 'isPrivate'] },
    ]
  },
  {
    groupTitle: '运行控制',
    items: [
      { label: '暴露状态', path: ['exposeState'] },
      { label: '保存状态', path: ['saveState'] },
    ]
  },
  {
    groupTitle: '同步策略',
    items: [
      { label: '本地同步', path: ['syncLocal'] },
    ]
  }
];

const BasicSettings = ({ appMeta, onUpdateAppMeta, appTypes, appCustomMapper = {} }) => {
  const [isManual, setIsManual] = useState(false);

  // 统一处理布尔值开关的切换，支持任意层级嵌套的精准更新
  const handleToggle = (path) => {
    const currentValue = !!getValue(appMeta, path);
    // setPathValue 会返回一个完整的、带有新值的拷贝对象
    // 我们提取出变动发生的最外层根属性 (例如 'sysOptions' 或 'exposeState')，将其交给外部更新
    const newRootFieldData = setPathValue(appMeta, path, !currentValue)[path[0]];
    onUpdateAppMeta({ [path[0]]: newRootFieldData });
  };

  const handleCustomChange = (key) => {
    // 复用深层路径更新逻辑，使得 custom 的修改也变得极其简单
    handleToggle(['custom', key]);
  };

  const toggleMode = () => {
    setIsManual(!isManual);
    if (isManual) onUpdateAppMeta({ appType: '' });
  };

  return (
    <div className={style[bem.e('settings-card')]}>
      <div className={style[bem.e('card-header')]}>
        <InfoIcon fontSize="small" />
        <h3>基础配置</h3>
      </div>

      <div className={style[bem.e('setting-group')]}>
        {/* 分层渲染配置项：优化了子标题和间距排布 */}
        {CONFIG_GROUPS.map((group) => (
          <div key={group.groupTitle} className={style[bem.e('config-sub-group')]}>
            {/* 子分组标题：使用小字号灰色文本，提升呼吸感 */}
            <div className={style[bem.e('sub-title')]}>{group.groupTitle}</div>
            {group.items.map(({ label, path }) => {
              const isChecked = !!getValue(appMeta, path);
              return (
                <div key={path.join('-')} className={style[bem.e('label-row')]}>
                  <label className={style[bem.e('label')]}>{label}</label>
                  <Check
                    checked={isChecked}
                    onChange={() => handleToggle(path)}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* 应用分类与输入模式 */}
        <div className={style[bem.e('config-sub-group')]}>
            <div className={style[bem.e('sub-title')]}>应用归类</div>
            <div className={style[bem.e('label-row')]} style={{ marginBottom: '8px' }}>
              <label className={style[bem.e('label')]}>应用类型</label>
              <div className={style[bem.e('mode-toggle')]} onClick={toggleMode}>
                {isManual ? <ListIcon fontSize="inherit" /> : <EditIcon fontSize="inherit" />}
                <span>{isManual ? '手动输入' : '选择预设'}</span>
              </div>
            </div>

            {isManual ? (
              <Input
                value={appMeta.appType || 'tool'}
                onChange={(e) => onUpdateAppMeta({ appType: e.target.value })}
                placeholder="自定义应用类型"
                clearable
                size="medium"
              />
            ) : (
              <Select
                boxStyle={{ backgroundColor: 'var(--su-white)', borderRadius: '4px', color: 'var(--su-text-color-primary)', height: '28px', fontSize: '12px', padding: '0 8px', border: '1px solid var(--su-border-color)' }}
                dropdownStyle={{ border: '1px solid var(--su-border-color)', borderRadius: '4px', maxHeight: '200px', padding: '4px 0', backgroundColor: 'var(--su-white)' }}
                optionStyle={{ padding: '6px 8px', fontSize: '12px', color: 'var(--su-text-color-primary)' }}
                showTitle={true}
                value={appMeta.appType}
                options={appTypes}
                onChange={(val) => onUpdateAppMeta({ appType: val })}
                placeholder="选择应用类型"
              />
            )}
        </div>
      </div>

      {/* 动态扩展的 Custom 配置区 */}
      {appMeta.custom && Object.keys(appMeta.custom).length > 0 && (
        <div className={style[bem.e('setting-group')]} style={{ marginTop: '16px', borderTop: '1px solid var(--su-gray-200)', paddingTop: '16px' }}>
          <div className={style[bem.e('config-sub-group')]}>
            <div className={style[bem.e('sub-title')]}>扩展特性 (Custom)</div>
            {Object.entries(appMeta.custom).map(([key, value]) => (
              <div key={key} className={style[bem.e('label-row')]}>
                <label className={style[bem.e('label')]}>{appCustomMapper[key] || key}</label>
                <Check
                  checked={!!value}
                  onChange={() => handleCustomChange(key)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const VisualSettings = ({ appMeta, onUpdateAppMeta }) => {
  const { appIcon, appName, initialSize = {} } = appMeta;

  const handleSizeChange = (key, value) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    onUpdateAppMeta({
      initialSize: {
        ...initialSize,
        [key]: isNaN(numValue) ? 0 : numValue
      }
    });
  };

  return (
    <div className={style[bem.e('settings-card')]}>
      <div className={style[bem.e('card-header')]}>
        <SettingsIcon fontSize="small" />
        <h3>视觉表现</h3>
      </div>

      <div className={style[bem.e('setting-group')]}>
        <label className={style[bem.e('label')]}>图标 URL 路径</label>
        <div style={{ marginTop: '6px' }}>
          <Input
            value={appIcon || '/logo.jpg'}
            onChange={(e) => onUpdateAppMeta({ appIcon: e.target.value })}
            placeholder="/logo.jpg"
            clearable
          />
        </div>
      </div>

      <div className={style[bem.e('preview-section')]}>
        <div className={style[bem.e('thumbnail')]}>
          <div className={style[bem.e('image-container')]}>
            <img
              src={appIcon || '/logo.jpg'}
              alt="icon"
              className={style[bem.e('image')]}
              onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
            />
          </div>
          <div className={style[bem.e('app-name')]}>{appName || '应用名称预览'}</div>
        </div>
      </div>

      <div className={style[bem.e('setting-group')]}>
        <label className={style[bem.e('label')]}>初始视窗尺寸 (px)</label>
        <div className={style[bem.e('size-grid')]}>
          {['w', 'h', 'x', 'y'].map((dim) => (
            <div className={style[bem.e('size-item')]} key={dim}>
              <span className={style[bem.e('size-label')]}>
                {dim === 'w' ? '宽度(W)' : dim === 'h' ? '高度(H)' : dim.toUpperCase()}
              </span>
              <Input
                value={initialSize[dim] || ''}
                onChange={(e) => handleSizeChange(dim, e.target.value)}
                size="small"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UploadSettings = ({ uploadType, setUploadType }) => {
  const handleCheckGroupChange = (values) => {
    if (values && values.length > 0) setUploadType(values[0]);
  };

  return (
    <div className={style[bem.e('settings-card')]}>
      <div className={style[bem.e('card-header')]}>
        <FileUploadIcon fontSize="small" />
        <h3>部署模式</h3>
      </div>
      <div className={style[bem.e('setting-group')]}>
        <div className={style[bem.e('check-group-wrapper')]}>
          <CheckGroup
            mode="single"
            value={[uploadType]}
            onChange={handleCheckGroupChange}
            options={[
              { label: '单文件', value: 'file' },
              { label: '逻辑页', value: 'logic' },
              { label: '多页面', value: 'bundle' }
            ]}
            size="small"
            plain={false}
            type="primary"
          />
        </div>
      </div>
    </div>
  );
};

function Setting({ appMeta, appTypes, appCustomMapper, onUpdateAppMeta, onCreate, onPreview, uploadType, setUploadType }) {
  const { appName, description } = appMeta;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <span className={style[bem.e('title')]}>应用全局配置</span>
      </div>

      <div className={style[bem.e('scroll-area')]}>
        <div className={style[bem.e('details-wrapper')]}>
          <Input
            value={appName || ''}
            onChange={(e) => onUpdateAppMeta({ appName: e.target.value })}
            placeholder="应用全局名称"
            size="medium"
            clearable
          />
          <Input
            value={description || ''}
            onChange={(e) => onUpdateAppMeta({ description: e.target.value })}
            placeholder="简短描述信息"
            maxLength={25}
            size="medium"
            clearable
          />
        </div>

        <BasicSettings
          appMeta={appMeta}
          onUpdateAppMeta={onUpdateAppMeta}
          appTypes={appTypes}
          appCustomMapper={appCustomMapper}
        />

        <VisualSettings
          appMeta={appMeta}
          onUpdateAppMeta={onUpdateAppMeta}
        />

        <UploadSettings
          uploadType={uploadType}
          setUploadType={setUploadType}
        />
      </div>

      <div className={style[bem.e('footer-actions')]}>
        <button className={style[bem.e('preview-btn')]} onClick={onPreview}>
          <PreviewIcon fontSize="small" />
          效果预览
        </button>
        <button className={style[bem.e('create-btn')]} onClick={onCreate} disabled={!appName}>
          <AddCircleOutlineIcon fontSize="small" />
          执行创建
        </button>
      </div>
    </div>
  );
}

export default React.memo(Setting);
