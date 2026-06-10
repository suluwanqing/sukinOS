import { useState, useEffect, useMemo } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";

import sysConfigAPI from "@/apis/system/config";

// 公共组件与命令提示引入
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";

const bem = createNamespace("config-items-manager");

function ConfigItemsManager() {
  const [configs, setConfigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [oldKey, setOldKey] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [rawJsonValue, setRawJsonValue] = useState("");
  const [saving, setSaving] = useState(false);

  // 状态化存储后端动态供给的标准预置项和保留键数组
  const [reservedConfigKeys, setReservedConfigKeys] = useState([]);
  const [presetTemplates, setPresetTemplates] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const loadConfigs = () => {
    setLoading(true);
    sysConfigAPI.getAllConfigs()
      .then(res => {
        if (res?.code === 200) {
          setConfigs(res.data || []);
        } else {
          alert.failure(res?.message || "配置项列表加载失败");
        }
      })
      .catch(() => {
        alert.failure("读取静态配置失败");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // 初始化拉取后端配置与预设字典并对接驼峰命名字段
  useEffect(() => {
    loadConfigs();

    sysConfigAPI.getSystemStaticConfig()
      .then(res => {
        if (res?.code === 200 && res.data) {
          const { reservedConfigKeys, presetTemplates, templateOptions } = res.data;
          setReservedConfigKeys(reservedConfigKeys || []);
          setPresetTemplates(presetTemplates || []);
          setTemplateOptions(templateOptions || []);
        }
      })
      .catch(() => {
        console.warn("未能成功同步后端标准模板预置配置");
      });
  }, []);

  const filteredConfigs = configs.filter(item =>
    item.configKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setModalType("create");
    setOldKey("");
    setTargetKey("");
    setSelectedTemplate("");
    setRawJsonValue(JSON.stringify({ enabled: true }, null, 2));
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setModalType("edit");
    setOldKey(item.configKey);
    setTargetKey(item.configKey);
    setSelectedTemplate("");
    setRawJsonValue(JSON.stringify(item.configValue, null, 2));
    setModalVisible(true);
  };

  const handleTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
    if (!templateKey) return;

    // 直接在已经转换成列表数组的 presetTemplates 中寻找对应项，规避键值转换困扰
    const matched = presetTemplates.find(item => item.configKey === templateKey);
    if (matched) {
      if (modalType === "create" && !targetKey) {
        setTargetKey(templateKey);
      }
      setRawJsonValue(JSON.stringify(matched.configValue, null, 2));
    }
  };

  const handleSaveItem = () => {
    const trimmedKey = targetKey.trim();
    if (!trimmedKey) {
      alert.warning("配置项键值不能为空");
      return;
    }

    let parsedValue = null;
    try {
      parsedValue = JSON.parse(rawJsonValue);
    } catch (err) {
      alert.failure("JSON 报体解析失败，请检查并保证规范的 JSON 格式语法");
      return;
    }

    setSaving(true);

    if (modalType === "create") {
      sysConfigAPI.createConfigItem({ configKey: trimmedKey, configValue: parsedValue })
        .then(res => {
          if (res?.code === 200) {
            alert.success("配置项成功创建");
            setModalVisible(false);
            loadConfigs();
          } else {
            alert.failure(res?.message || "操作配置项失败");
          }
        })
        .catch(() => {
          alert.failure("同步网络请求故障");
        })
        .finally(() => {
          setSaving(false);
        });
    } else {
      sysConfigAPI.updateConfigItem({
        oldConfigKey: oldKey,
        newConfigKey: trimmedKey,
        configValue: parsedValue
      })
        .then(res => {
          if (res?.code === 200) {
            alert.success("配置项信息及键名已更新");
            setModalVisible(false);
            loadConfigs();
          } else {
            alert.failure(res?.message || "更新配置项失败");
          }
        })
        .catch(() => {
          alert.failure("同步网络请求故障");
        })
        .finally(() => {
          setSaving(false);
        });
    }
  };

  const handleDeleteItem = (item) => {
    // 校验配置键是否包含于保留列表中
    if (reservedConfigKeys.includes(item.configKey)) {
      alert.failure(`核心规则配置 ${item.configKey} 属于系统底层保护字典，禁止在此物理删除`);
      return;
    }

    confirm.show({
      title: "物理删除静态配置项",
      content: `警告：彻底移除配置标识 ${item.configKey} 可能会导致关联的后端模块崩溃，是否确认删除该核心字典？`,
      onConfirm: () => {
        sysConfigAPI.deleteConfigItem(item.configKey)
          .then(res => {
            if (res?.code === 200) {
              alert.success("配置项物理删除成功");
              loadConfigs();
            } else {
              alert.failure(res?.message || "物理移除失败");
            }
          });
      }
    });
  };

  // 检测当前编辑项的键名是否属于系统保留键
  const isKeyReserved = modalType === "edit" && reservedConfigKeys.includes(oldKey);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("head")]}>
        <div className={style[bem.e("head-info")]}>
          <div className={style[bem.e("title")]}>通用字典项管理器</div>
          <p className={style[bem.e("desc")]}>直接对 MySQL 中的 system_configs 表内容执行 CRUD 物理交互，保存用于整站及后端的静态字典项</p>
        </div>
      </div>

      <div className={style[bem.e("toolbar")]}>
        <div className={style[bem.e("search-container")]}>
          <input
            placeholder="根据配置 Key 标识符检索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="dark" size="medium" onClick={handleOpenCreateModal}>
          <span>新增全局配置项</span>
        </Button>
      </div>

      <div className={style[bem.e("list-container")]}>
        {loading ? (
          <div className={style[bem.e("center")]}>
            <span className={style[bem.e("spinner")]} />
          </div>
        ) : filteredConfigs.length > 0 ? (
          <div className={style[bem.e("grid")]}>
            {filteredConfigs.map(item => (
              <div key={item.id} className={style[bem.e("card")]}>
                <div className={style[bem.e("card-head")]}>
                  <div className={style[bem.e("card-title-box")]}>
                    <span className={style[bem.e("card-title")]}>{item.configKey}</span>
                  </div>
                  <div className={style[bem.e("card-actions")]}>
                    <button
                      className={style[bem.e("action-btn-edit")]}
                      title="编辑修改内容及修改标识键"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      编辑
                    </button>
                    {/* 包含于保留键列表的项不可显示删除按钮 */}
                    {!reservedConfigKeys.includes(item.configKey) && (
                      <button
                        className={style[bem.e("action-btn-delete")]}
                        title="物理彻底删除"
                        onClick={() => handleDeleteItem(item)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
                <div className={style[bem.e("card-body")]}>
                  <pre className={style[bem.e("code-block")]}>
                    {JSON.stringify(item.configValue, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={style[bem.e("empty")]}>
            未检索到对应的全局静态字典项，请重新输入或点击按钮新增
          </div>
        )}
      </div>

      {modalVisible && (
        <div className={style[bem.e("overlay")]} onClick={() => setModalVisible(false)}>
          <div className={style[bem.e("modal")]} onClick={e => e.stopPropagation()}>
            <div className={style[bem.e("modal-head")]}>
              <div className={style[bem.e("modal-title")]}>
                {modalType === "create" ? "新增字典配置项" : "更新静态配置数据"}
              </div>
              <button className={style[bem.e("modal-close")]} onClick={() => setModalVisible(false)}>
                关闭
              </button>
            </div>

            <div className={style[bem.e("modal-body")]}>
              {/* 仅在非保留核心键时提供标准配置骨架载入下拉选择 */}
              {!isKeyReserved && (
                <div className={style[bem.e("form-item")]}>
                  <label className={style[bem.e("preset-label")]}>
                    <span>载入预置标准配置参数模板</span>
                  </label>
                  <div className={style[bem.e("template-select-wrapper")]}>
                    <Select
                      value={selectedTemplate}
                      onChange={handleTemplateChange}
                      options={templateOptions}
                      direction="bottom"
                    />
                  </div>
                  <p className={style[bem.e("form-help")]}>可快速选用现成的主题配置文件骨架，保障核心属性格式和拼写完全合规</p>
                </div>
              )}

              <div className={style[bem.e("form-item")]}>
                <label>配置项标识键名（Config Key）</label>
                <input
                  className={style[bem.e("input-text")]}
                  placeholder="例如: vfs_mount_settings"
                  value={targetKey}
                  onChange={e => setTargetKey(e.target.value)}
                  disabled={isKeyReserved}
                />
                <p className={style[bem.e("form-help")]}>
                  {modalType === "edit"
                    ? (isKeyReserved
                        ? `核心配置键 ${oldKey} 为系统底层依赖的保护标识符，禁止在此修改标识键名。`
                        : `原键名：${oldKey}。修改此处的键名后，系统会自动重命名数据库中关联的标识符。`)
                    : "用于在后端及前台唯一调取配置的标识字符，不可重复，不可使用中文及特殊字符"
                  }
                </p>
              </div>

              <div className={style[bem.e("form-item")]}>
                <label>配置内容 JSON 数据载荷（Config Value）</label>
                <textarea
                  className={style[bem.e("input-textarea")]}
                  placeholder="例如: { 'enabled': true }"
                  value={rawJsonValue}
                  onChange={e => setRawJsonValue(e.target.value)}
                  rows={10}
                  // 内容输入区保持正常启用状态，方便随时进行修改
                />
                <p className={style[bem.e("form-help")]}>输入完整的 JSON 对象格式，建议保持缩进以方便校验</p>
              </div>
            </div>

            <div className={style[bem.e("modal-footer")]}>
              <Button type="default" plain size="medium" onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="dark" size="medium" loading={saving} onClick={handleSaveItem}>
                <span>应用更改</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigItemsManager;
