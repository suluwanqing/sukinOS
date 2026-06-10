import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import { selectorStoreSettingStorePath, sukinOsActions } from "@/sukinos/store";
import Input from '@/component/input/layout';
import { alert } from "@/component/alert/layout";
import {
  SUKINOS_STORE_REMOTE_BASE,
  SUKINOS_STORE_REMOTE_TOTAL,
  SUKINOS_STORE_REMOTE_UPLOAD,
  SUKINOS_STORE_REMOTE_CHECK_UPDATES,
  SUKINOS_STORE_REMOTE_SEARCH,
  SUKINOS_STORE_REMOTE_MY_UPLOAD,
  SUKINOS_STORE_REMOTE_DELETE
} from "@/sukinos/utils/config";

const bem = createNamespace('setting');

//从绝对路径中剥离 baseUrl 得到用于展示的相对路径
const getRelativePath = (fullUrl, baseUrl) => {
  if (!fullUrl || !baseUrl) return fullUrl || '';
  if (fullUrl.startsWith(baseUrl)) {
    let relative = fullUrl.substring(baseUrl.length);
    return relative.startsWith('/') ? relative : '/' + relative;
  }
  return fullUrl;
};

//将 baseUrl 和 相对路径 重新拼接成 绝对路径 用于保存
const getAbsoluteUrl = (baseUrl, relativePath) => {
  if (!baseUrl || !relativePath) return relativePath || baseUrl || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanRelative = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  return cleanBase + cleanRelative;
};

// 配置项定义 (默认值动态计算为相对路径)
const SECTIONS = [
  {
    id: 'base',
    title: '核心连接',
    desc: '定义应用商店的基础通讯地址。',
    items: [
      { key: 'baseUrl', label: '基础 API 地址', defaultVal: SUKINOS_STORE_REMOTE_BASE }
    ]
  },
  {
    id: 'discovery',
    title: '发现与检索',
    desc: '控制应用列表的获取方式与搜索逻辑。',
    items: [
      { key: 'listUrl', label: '列表接口', defaultVal: getRelativePath(SUKINOS_STORE_REMOTE_TOTAL, SUKINOS_STORE_REMOTE_BASE) },
      { key: 'searchUrl', label: '搜索接口', defaultVal: getRelativePath(SUKINOS_STORE_REMOTE_SEARCH, SUKINOS_STORE_REMOTE_BASE) },
      { key: 'checkUpdatesUrl', label: '更新检查接口', defaultVal: getRelativePath(SUKINOS_STORE_REMOTE_CHECK_UPDATES, SUKINOS_STORE_REMOTE_BASE) }
    ]
  },
  {
    id: 'management',
    title: '应用管理',
    desc: '管理应用上传、删除及云端同步的接口。',
    items: [
      { key: 'uploadUrl', label: '上传接口', defaultVal: getRelativePath(SUKINOS_STORE_REMOTE_UPLOAD, SUKINOS_STORE_REMOTE_BASE) },
      { key: 'myUploadUrl', label: '我的应用接口', defaultVal: getRelativePath(SUKINOS_STORE_REMOTE_MY_UPLOAD, SUKINOS_STORE_REMOTE_BASE) },
      { key: 'deleteUrl', label: '删除接口', defaultVal: getRelativePath(SUKINOS_STORE_REMOTE_DELETE, SUKINOS_STORE_REMOTE_BASE) }
    ]
  }
];

function Setting() {
  const dispatch = useDispatch();
  // 获取 Redux 中的真实配置
  const originStorePath = useSelector(selectorStoreSettingStorePath) || {};
  // 本地草稿状态，用于暂存用户的修改 (草稿中存的也是展示用的"相对路径")
  const [draftConfig, setDraftConfig] = useState({});

  useEffect(() => {
    setDraftConfig({});
  }, [originStorePath]);

  // 处理输入框变更（只更新本地草稿）
  const handleInputChange = (key, value) => {
    setDraftConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 计算是否有未保存的修改
  const hasChanges = useMemo(() => {
    return SECTIONS.some(section =>
      section.items.some(item => {
        // 从仓库中拿到绝对路径
        const originAbsolute = originStorePath[item.key];
        // 算出它在界面上原本该显示的样子 (减去 baseUrl)
        let originDisplayVal = originAbsolute;
        if (item.key !== 'baseUrl') {
           originDisplayVal = getRelativePath(originAbsolute, originStorePath.baseUrl || SUKINOS_STORE_REMOTE_BASE);
        }

        const currentVal = draftConfig[item.key] !== undefined
          ? draftConfig[item.key]
          : originDisplayVal;

        return currentVal !== originDisplayVal;
      })
    );
  }, [originStorePath, draftConfig]);

  // 提交保存
  const handleSave = () => {
    // 确定保存时使用的 baseUrl (如果用户修改了 baseUrl 就用修改后的，否则用原有的)
    const baseToSave = draftConfig.baseUrl !== undefined
      ? draftConfig.baseUrl
      : (originStorePath.baseUrl || SUKINOS_STORE_REMOTE_BASE);

    SECTIONS.forEach(section => {
      section.items.forEach(item => {
        const originAbsolute = originStorePath[item.key];
        let originDisplayVal = originAbsolute;
        if (item.key !== 'baseUrl') {
           originDisplayVal = getRelativePath(originAbsolute, originStorePath.baseUrl || SUKINOS_STORE_REMOTE_BASE);
        }

        const currentDisplayVal = draftConfig[item.key] !== undefined
          ? draftConfig[item.key]
          : originDisplayVal;

        // 以 baseUrl 为基础，拼接成即将存入 store 的绝对路径
        let absoluteToSave = currentDisplayVal;
        if (item.key !== 'baseUrl') {
           absoluteToSave = getAbsoluteUrl(baseToSave, currentDisplayVal);
        }

        // 判断算出来的终极绝对路径和原本仓库里的绝对路径一不一样
        if (absoluteToSave !== originAbsolute) {
           if (!currentDisplayVal || currentDisplayVal.trim() === '' || currentDisplayVal === item.defaultVal) {
              dispatch(sukinOsActions.resetStorePath(item.key));
           } else {
              dispatch(sukinOsActions.setStorePath({ key: item.key, value: absoluteToSave }));
           }
        }
      });
    });

    setDraftConfig({});
    alert.success('配置已更新');
  };

  // 放弃修改
  const handleCancel = () => {
    setDraftConfig({});
    alert.success('已撤销所有未保存的修改');
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <div className={style[bem.e('hero')]}>
          <h2>设置</h2>
          <div className={style[bem.e('desc')]}>
            自定义 API 接口以连接私有软件源。
          </div>
        </div>
      </div>

      <div className={style[bem.e('list')]}>
        {SECTIONS.map((section) => (
          <div key={section.id} className={style[bem.e('card')]}>
            <div className={style[bem.e('card-header')]}>
                <div className={style[bem.e('section-title')]}>{section.title}</div>
                <div className={style[bem.e('section-desc')]}>{section.desc}</div>
            </div>

            <div className={style[bem.e('form-grid')]}>
                {section.items.map(item => {
                    const originAbsolute = originStorePath[item.key] || item.defaultVal;
                    // 剥离 BaseUrl 后用于在输入框显示的字符串
                    let originDisplayVal = originAbsolute;
                    if (item.key !== 'baseUrl') {
                       originDisplayVal = getRelativePath(originAbsolute, originStorePath.baseUrl || SUKINOS_STORE_REMOTE_BASE);
                    }

                    const val = draftConfig[item.key] !== undefined
                      ? draftConfig[item.key]
                      : originDisplayVal;

                    const isDirty = val !== originDisplayVal;

                    return (
                        <div key={item.key} className={style[bem.e('form-item')]}>
                            <div className={style[bem.e('label')]}>
                                {item.label}
                                {isDirty && <span className={style[bem.e('badge-dirty')]}>•</span>}
                            </div>
                            <Input
                                value={val}
                                onChange={(e) => {
                                  const newValue = e && e.target !== undefined ? e.target.value : e;
                                  handleInputChange(item.key, newValue);
                                }}
                                placeholder={`默认: ${item.defaultVal}`}
                                isRound
                                clearable
                            />
                        </div>
                    )
                })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部浮动操作栏：仅在有修改时显示 */}
      <div className={[
          style[bem.e('action-bar')],
          style[bem.is('visible', hasChanges)]
      ].join(' ')}>
          <div className={style[bem.e('bar-content')]}>
              <span className={style[bem.e('bar-text')]}>检测到未保存的配置更改</span>
              <div className={style[bem.e('bar-btns')]}>
                  <button  className={style[bem.e('btn-action')]} onClick={handleCancel} >放弃</button>
                  <button className={style[bem.e('btn-action')]} onClick={handleSave}>
                       保存更改
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}

export default Setting;
