import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import PreviewIcon from '@mui/icons-material/Preview';
import AppsIcon from '@mui/icons-material/Apps';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InfoIcon from '@mui/icons-material/Info';
import CheckGroup from "@/component/checkGroup/layout";
import Select from "@/component/select/drowSelection/layout";

const bem = createNamespace('config');
const BasicSettings = ({ appMeta, onUpdateAppMeta, appTypes }) => {
  return (
    <div className={style[bem.e('settings-card')]}>
      <div className={style[bem.e('card-header')]}>
        <InfoIcon />
        <h3>基础设置</h3>
      </div>

      <div className={style[bem.e('setting-group')]}>
        <label className={style[bem.e('label')]}>应用类型</label>
        <Select
           boxStyle={{
            backgroundColor: 'transparent',
            borderRadius: 'var(--su-border-radius)',
            color: 'white',
            height: 'var(--select-height)',
            fontSize: 'var(--select-font-size)',
            padding: '0 var(--select-padding)'
          }}
          dropdownStyle={{
            border: '1px solid var(--su-border-color-light)',
            borderRadius: 'var(--su-border-radius)',
            maxHeight: '200px',
            padding: '4px 0'
          }}
          optionStyle={{
            padding: '6px var(--select-padding)',
            fontSize: 'var(--select-font-size)',
            color: 'var(--su-text-color-regular)'
          }}
          showTitle={true}
          value={appMeta.appType}
          options={appTypes}
          onChange={(val) => onUpdateAppMeta({ appType: val })}
          placeholder="请选择应用类型"
        />
      </div>
    </div>
  );
};

const VisualSettings = ({ appMeta, onUpdateAppMeta }) => {
  const { appIcon, appName } = appMeta;
  return (
    <div className={style[bem.e('settings-card')]}>
      <div className={style[bem.e('card-header')]}>
        <SettingsIcon />
        <h3>视觉设置</h3>
      </div>

      <div className={style[bem.e('setting-group')]}>
        <label className={style[bem.e('label')]}>图标 URL</label>
        <input
          type="url"
          className={style[bem.e('input')]}
          value={appIcon}
          onChange={e => onUpdateAppMeta({ appIcon: e.target.value })}
          placeholder="/logo.jpg"
        />
      </div>

      <div className={style[bem.e('preview-section')]}>
        <div className={style[bem.e('thumbnail')]}>
          <div className={style[bem.e('image-container')]}>
            <img
              src={appIcon}
              alt="icon"
              className={style[bem.e('image')]}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.jpg';
              }}
            />
          </div>
          <div className={style[bem.e('app-name')]}>
            {appName || '应用名'}
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadSettings = ({ uploadType, setUploadType, appMeta, onUpdateAppMeta }) => {
  const { initialSize } = appMeta;

  const handleSizeChange = (key, value) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    onUpdateAppMeta({
      initialSize: {
        ...initialSize,
        [key]: isNaN(numValue) ? 0 : numValue
      }
    });
  };

  const checkGroupValue = [uploadType];
  const handleCheckGroupChange = (values) => {
    if (values && values.length > 0) {
      setUploadType(values[0]);
    }
  };

  return (
    <div className={style[bem.e('settings-card')]}>
      <div className={style[bem.e('card-header')]}>
        <FileUploadIcon />
        <h3>上传配置</h3>
      </div>

      <div className={style[bem.e('setting-group')]}>
        <div className={style[bem.e('check-group-wrapper')]}>
          <CheckGroup
            mode="single"
            value={checkGroupValue}
            onChange={handleCheckGroupChange}
            options={[
              { label: '单页文件', value: 'file' },
              { label: '逻辑单页', value: 'logic' },
              { label: '多页应用', value: 'bundle' }
            ]}
            size="small"
            plain={false}
            type="primary"
          />
        </div>
        <div className={style[bem.e('hint')]}>
          选择资源类型
        </div>
      </div>

      <div className={style[bem.e('setting-group')]}>
        <label className={style[bem.e('label')]}>初始窗口 (px)</label>
        <div className={style[bem.e('size-grid')]}>
          <div className={style[bem.e('size-item')]}>
            <span className={style[bem.e('size-label')]}>宽 (W)</span>
            <input
              type="text"
              className={style[bem.e('size-input')]}
              value={initialSize.w}
              onChange={(e) => handleSizeChange('w', e.target.value)}
            />
          </div>
          <div className={style[bem.e('size-item')]}>
            <span className={style[bem.e('size-label')]}>高 (H)</span>
            <input
              type="text"
              className={style[bem.e('size-input')]}
              value={initialSize.h}
              onChange={(e) => handleSizeChange('h', e.target.value)}
            />
          </div>
          <div className={style[bem.e('size-item')]}>
            <span className={style[bem.e('size-label')]}>X</span>
            <input
              type="text"
              className={style[bem.e('size-input')]}
              value={initialSize.x}
              onChange={(e) => handleSizeChange('x', e.target.value)}
            />
          </div>
          <div className={style[bem.e('size-item')]}>
            <span className={style[bem.e('size-label')]}>Y</span>
            <input
              type="text"
              className={style[bem.e('size-input')]}
              value={initialSize.y}
              onChange={(e) => handleSizeChange('y', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function Config({
  appMeta,
  appTypes,
  onUpdateAppMeta,
  onCreate,
  onPreview,
  currentView,
  uploadType,
  setUploadType
}) {
  const { appName } = appMeta;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <div className={style[bem.e('project-info')]}>
          <div className={style[bem.e('title-row')]}>
            <AppsIcon color="primary" />
            <span className={style[bem.e('title')]}>App信息</span>
          </div>
          <div className={style[bem.e('details')]}>
            <input
              className={style[bem.e('name-input')]}
              value={appName}
              onChange={e => onUpdateAppMeta({ appName: e.target.value })}
              placeholder="请输入应用名称"
            />
          </div>
        </div>

        {currentView === 'devCenter' && (
          <div className={style[bem.e('actions')]}>
            <button
              className={style[bem.e('preview-btn')]}
              onClick={onPreview}
            >
              <PreviewIcon fontSize="small" />
              预览
            </button>
            <button
              className={style[bem.e('create-btn')]}
              onClick={onCreate}
              disabled={!appName}
            >
              <AddCircleOutlineIcon fontSize="small" />
              创建
            </button>
          </div>
        )}
      </div>

      <div className={style[bem.e('scroll-area')]}>
        <BasicSettings
            appMeta={appMeta}
            onUpdateAppMeta={onUpdateAppMeta}
            appTypes={appTypes}
        />

        <VisualSettings
          appMeta={appMeta}
          onUpdateAppMeta={onUpdateAppMeta}
        />
        {currentView === 'upload' && (
          <UploadSettings
            uploadType={uploadType}
            setUploadType={setUploadType}
            appMeta={appMeta}
            onUpdateAppMeta={onUpdateAppMeta}
          />
        )}
      </div>
    </div>
  );
}

export default Config;
