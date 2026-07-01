import { useState, useEffect } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";

import sysConfigAPI from "@/apis/system/config";

import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import { usePermission } from "@/hooks/usePermission/main";

const bem = createNamespace("config-items-manager");

function ConfigItemsManager() {
  const { hasPermission } = usePermission();
  const [configs, setConfigs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [oldKey, setOldKey] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [rawJsonValue, setRawJsonValue] = useState("");
  const [configDescription, setConfigDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [reservedConfigKeys, setReservedConfigKeys] = useState([]);
  const [presetTemplates, setPresetTemplates] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const loadConfigs = () => {
    setLoading(true);
    sysConfigAPI.getAllConfigs()
      .then(res => {
        if (res?.code === 200) setConfigs(res.data || []);
        else alert.failure(res?.message || "配置项列表加载失败");
      })
      .catch(() => alert.failure("读取静态配置失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConfigs();
    sysConfigAPI.getSystemStaticConfig()
      .then(res => {
        if (res?.code === 200 && res.data) {
          setReservedConfigKeys(res.data.reservedConfigKeys || []);
          setPresetTemplates(res.data.presetTemplates || []);
          setTemplateOptions(res.data.templateOptions || []);
        }
      })
      .catch(() => console.warn("未能同步后端标准模板预置配置"));
  }, []);

  const filteredConfigs = configs.filter(item =>
    item.configKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setTargetKey("");
    setConfigDescription("");
    setSelectedTemplate("");
    setRawJsonValue(JSON.stringify({ enabled: true }, null, 2));
  };

  const handleOpenCreateModal = () => {
    setModalType("create");
    setOldKey("");
    resetForm();
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setModalType("edit");
    setOldKey(item.configKey);
    setTargetKey(item.configKey);
    setConfigDescription(item.configDescription || "");
    setSelectedTemplate("");
    setRawJsonValue(JSON.stringify(item.configValue, null, 2));
    setModalVisible(true);
  };

  const handleTemplateChange = (templateKey) => {
    setSelectedTemplate(templateKey);
    if (!templateKey) return;
    const matched = presetTemplates.find(item => item.configKey === templateKey);
    if (matched) {
      if (modalType === "create" && !targetKey) setTargetKey(templateKey);
      setConfigDescription(matched.configDescription || "");
      setRawJsonValue(JSON.stringify(matched.configValue, null, 2));
    }
  };

  const handleSaveItem = () => {
    const trimmedKey = targetKey.trim();
    if (!trimmedKey) return alert.warning("配置项键值不能为空");

    let parsedValue;
    try { parsedValue = JSON.parse(rawJsonValue); }
    catch { return alert.failure("JSON 格式错误"); }

    setSaving(true);

    if (modalType === "create") {
      sysConfigAPI.createConfigItem({ configKey: trimmedKey, configValue: parsedValue, configDescription })
        .then(res => {
          if (res?.code === 200) { alert.success("配置项创建成功"); setModalVisible(false); loadConfigs(); }
          else alert.failure(res?.message || "操作失败");
        })
        .catch(() => alert.failure("网络请求故障"))
        .finally(() => setSaving(false));
    } else {
      sysConfigAPI.updateConfigItem({ oldConfigKey: oldKey, newConfigKey: trimmedKey, configValue: parsedValue, configDescription })
        .then(res => {
          if (res?.code === 200) { alert.success("配置项已更新"); setModalVisible(false); loadConfigs(); }
          else alert.failure(res?.message || "更新失败");
        })
        .catch(() => alert.failure("网络请求故障"))
        .finally(() => setSaving(false));
    }
  };

  const handleDeleteItem = (item) => {
    if (reservedConfigKeys.includes(item.configKey)) {
      return alert.failure(`${item.configKey} 为系统保留键，禁止删除`);
    }
    confirm.show({
      title: "删除配置项",
      content: `确定彻底删除 "${item.configKey}" 吗？`,
      onConfirm: () => {
        sysConfigAPI.deleteConfigItem({ configKey: item.configKey })
          .then(res => {
            if (res?.code === 200) { alert.success("已删除"); loadConfigs(); }
            else alert.failure(res?.message || "删除失败");
          });
      }
    });
  };

  const isKeyReserved = modalType === "edit" && reservedConfigKeys.includes(oldKey);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("head")]}>
        <div>
          <h2 className={style[bem.e("title")]}>通用配置项</h2>
          <p className={style[bem.e("desc")]}>管理系统全局静态配置字典项</p>
        </div>
        {hasPermission("system:config:manage") && (
          <Button type="dark" size="medium" onClick={handleOpenCreateModal}>新增配置</Button>
        )}
      </div>

      <div className={style[bem.e("search")]}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="搜索配置 Key..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className={style[bem.e("list")]}>
        {loading ? (
          <div className={style[bem.e("center")]}><span className={style[bem.e("spinner")]} /></div>
        ) : filteredConfigs.length > 0 ? (
          <div className={style[bem.e("cards")]}>
            {filteredConfigs.map(item => (
              <div key={item.id} className={style[bem.e("card")]}>
                <div className={style[bem.e("card-head")]}>
                  <div className={style[bem.e("card-info")]}>
                    <code className={style[bem.e("key")]}>{item.configKey}</code>
                    {item.configDescription && (
                      <span className={style[bem.e("desc-text")]}>{item.configDescription}</span>
                    )}
                  </div>
                  <div className={style[bem.e("card-actions")]}>
                    {hasPermission("system:config:manage") && (
                      <>
                        <button className={style[bem.e("btn-icon")]} title="编辑" onClick={() => handleOpenEditModal(item)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        {!reservedConfigKeys.includes(item.configKey) && (
                          <button className={style[bem.e("btn-icon")]} title="删除" onClick={() => handleDeleteItem(item)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className={style[bem.e("card-body")]}>
                  <pre className={style[bem.e("code")]}>{JSON.stringify(item.configValue, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={style[bem.e("empty")]}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            <p>未找到匹配的配置项</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVisible && (
        <div className={style[bem.e("overlay")]} onClick={() => setModalVisible(false)}>
          <div className={style[bem.e("modal")]} onClick={e => e.stopPropagation()}>
            <div className={style[bem.e("modal-head")]}>
              <h3 className={style[bem.e("modal-title")]}>{modalType === "create" ? "新增配置项" : "编辑配置项"}</h3>
              <button className={style[bem.e("modal-close")]} onClick={() => setModalVisible(false)}>取消</button>
            </div>
            <div className={style[bem.e("modal-body")]}>
              {!isKeyReserved && (
                <div className={style[bem.e("preset-box")]}>
                  <label className={style[bem.e("preset-label")]}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    从预设模板载入
                  </label>
                  <Select value={selectedTemplate} onChange={handleTemplateChange} options={templateOptions} direction="bottom" />
                </div>
              )}
              <div className={style[bem.e("field")]}>
                <label>Key</label>
                <input value={targetKey} onChange={e => setTargetKey(e.target.value)} placeholder="例如: vfs_mount_settings" disabled={isKeyReserved} />
              </div>
              <div className={style[bem.e("field")]}>
                <label>描述</label>
                <input value={configDescription} onChange={e => setConfigDescription(e.target.value)} placeholder="简要描述该配置项的用途" />
              </div>
              <div className={style[bem.e("field")]}>
                <label>Value <span className={style[bem.e("label-muted")]}>(JSON)</span></label>
                <textarea className={style[bem.e("editor")]} value={rawJsonValue} onChange={e => setRawJsonValue(e.target.value)} placeholder='例如: { "enabled": true }' spellCheck={false} />
              </div>
            </div>
            <div className={style[bem.e("modal-foot")]}>
              <Button type="default" plain size="medium" onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="dark" size="medium" loading={saving} onClick={handleSaveItem}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigItemsManager;