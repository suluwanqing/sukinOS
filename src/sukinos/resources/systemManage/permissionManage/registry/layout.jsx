import { useState, useEffect } from "react";
import style from "../style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import systemAPI from "@/apis/system/main";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import PageList from "@/component/list/pageList/layout";
import Modal from "@/component/modal/layout";
import SettingsIcon from "@mui/icons-material/Settings";

const bem = createNamespace("system-permission");

const userOptionsAsync = async ({ page, pageSize, searchQuery }) => {
  const res = await systemAPI.getUserList({ page, pageSize, keyword: searchQuery || "" });
  if (res?.code === 200 && res.data) {
    return {
      items: (res.data.items || []).map(u => ({
        label: `${u.username} (${u.account}) [ID:${u.id}]`,
        value: u.id,
      })),
      total: res.data.total,
    };
  }
  return { items: [], total: 0 };
};

function PermissionRegistry({ appList, registryMap, onRefresh }) {
  const [addModal, setAddModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState("");
  const [authModal, setAuthModal] = useState({ visible: false, app: null });
  const [actorRules, setActorRules] = useState({ allowed_users: [], allowed_roles: [], denied_users: [], denied_roles: [] });
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    permissionManageAPI.getRoleList().then(res => {
      if (res.code === 200) {
        setRoleOptions((res.data || []).map(r => ({ label: r.label || r.name, value: r.name })));
      }
    });
  }, []);

  const registryIds = new Set(Object.keys(registryMap));

  const handleRemove = async (resourceId) => {
    confirm.show({
      title: "移出权限池",
      content: "确定将该 APP 移出权限控制池吗？",
      onConfirm: async () => {
        try {
          const res = await permissionManageAPI.registerApp({ resource_id: resourceId, permission_enabled: false });
          if (res.code === 200) {
            alert.success(res.message || "已从权限控制池移除");
            onRefresh();
          } else { alert.failure(res.message || "操作失败"); }
        } catch { alert.failure("操作失败"); }
      }
    });
  };

  const handleAdd = async () => {
    if (!selectedApp) return;
    try {
      const res = await permissionManageAPI.registerApp({ resource_id: selectedApp, permission_enabled: true });
      if (res.code === 200) {
        alert.success(res.message || "已加入权限控制池");
        setAddModal(false);
        setSelectedApp("");
        onRefresh();
      } else { alert.failure(res.message || "操作失败"); }
    } catch { alert.failure("操作失败"); }
  };

  const openAuthModal = (app) => {
    const raw = app.actorRules || {};
    setActorRules({
      allowed_users: raw.allowed_users || raw.allowedUsers || [],
      allowed_roles: raw.allowed_roles || raw.allowedRoles || [],
      denied_users: raw.denied_users || raw.deniedUsers || [],
      denied_roles: raw.denied_roles || raw.deniedRoles || [],
    });
    setAuthModal({ visible: true, app });
  };

  const addActorItem = (field, val) => {
    setActorRules(prev => {
      const list = prev[field] || [];
      if (list.includes(val)) return prev;
      return { ...prev, [field]: [...list, val] };
    });
  };

  const removeActorItem = (field, val) => {
    setActorRules(prev => ({ ...prev, [field]: (prev[field] || []).filter(v => v !== val) }));
  };

  const handleAuthSave = async () => {
    const app = authModal.app;
    if (!app) return;
    try {
      const res = await permissionManageAPI.assignAppActors({ resourceId: app.resourceId, actor_rules: actorRules });
      if (res.code === 200) {
        alert.success(res.message || "授权配置已更新");
        setAuthModal({ visible: false, app: null });
        onRefresh();
      } else { alert.failure(res.message || "更新失败"); }
    } catch (e) { alert.failure(e?.message || "更新失败"); }
  };

  const unregisteredApps = appList.filter(app => !registryIds.has(app.resourceId));
  const addAppOptions = unregisteredApps.map(app => ({
    label: `${app.appName} (${app.resourceId})`,
    value: app.resourceId,
  }));

  const data = Object.entries(registryMap).map(([resourceId, item]) => ({
    resourceId,
    appName: item.app_name || item.appName || resourceId,
    actorRules: item.actor_rules || item.actorRules || {},
  }));

  const columns = [
    { prop: "appName", label: "APP名称", width: 200,
      render: (r) => <strong>{r.appName}</strong>,
    },
    { prop: "resourceId", label: "资源ID", width: 250 },
  ];

  const actions = [
    { label: "授权", icon: <SettingsIcon style={{ color: "#171717" }} />, onClick: (r) => openAuthModal(r) },
    { label: "移出", onClick: (r) => handleRemove(r.resourceId), style: { color: "#f43f5e" } },
  ];

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <h3>APP 权限注册池</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={style[bem.e("count")]}>已注册: {registryIds.size} 个</span>
          <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={() => { setSelectedApp(""); setAddModal(true); }} disabled={unregisteredApps.length === 0}>添加 APP</Button>
        </div>
      </div>
      <p className={style[bem.e("desc")]}>
        将 APP 加入权限注册池后，只有被授权的用户才能在商店中看到并安装。未注册到池中的 APP 对所有用户可见。root 始终拥有全部权限。
      </p>
      <PageList
        columns={columns}
        data={data}
        rowKey="resourceId"
        defaultColumnWidth={150}
        total={data.length}
        actions={actions}
        actionWidth={120}
      />

      <Modal title="添加 APP 到权限注册池" visible={addModal} onClose={() => setAddModal(false)} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>选择 APP</label>
          <Select value={selectedApp} onChange={setSelectedApp} options={addAppOptions} placeholder="请选择要加入权限池的 APP..." direction="bottom" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button type="default" size="small" onClick={() => setAddModal(false)}>取消</Button>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleAdd}>确认添加</Button>
          </div>
        </div>
      </Modal>

      <Modal title={`授权配置 - ${authModal.app?.appName || ""}`} visible={authModal.visible} onClose={() => setAuthModal({ visible: false, app: null })} width={720}>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 16, lineHeight: 1.5 }}>
          黑名单优先匹配，白名单匹配即授权。被授权的用户/角色可在商店中看到并安装此 APP。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className={style[bem.e("registry-list-wrap")]}>
            <div className={style[bem.e("registry-list-header")]}><label>拒绝的用户</label></div>
            <div className={style[bem.e("registry-list-body")]}>
              {actorRules.denied_users.length === 0 ? <div className={style[bem.e("registry-empty")]}>无</div> : actorRules.denied_users.map(v => (
                <div key={v} className={style[bem.e("registry-item")]}>
                  <span>ID: {v}</span>
                  <button className={style[bem.e("registry-item-remove")]} onClick={() => removeActorItem("denied_users", v)}>×</button>
                </div>
              ))}
            </div>
            <div className={style[bem.e("registry-list-footer")]}>
              <div style={{ position: "relative", overflow: "visible", width: "100%" }}>
                <Select value="" onChange={(val) => addActorItem("denied_users", parseInt(val, 10))} optionsAsync={userOptionsAsync} searchable placeholder="添加拒绝用户..." direction="bottom" size="small" />
              </div>
            </div>
          </div>
          <div className={style[bem.e("registry-list-wrap")]}>
            <div className={style[bem.e("registry-list-header")]}><label>拒绝的角色</label></div>
            <div className={style[bem.e("registry-list-body")]}>
              {actorRules.denied_roles.length === 0 ? <div className={style[bem.e("registry-empty")]}>无</div> : actorRules.denied_roles.map(v => (
                <div key={v} className={style[bem.e("registry-item")]}>
                  <span>{v}</span>
                  <button className={style[bem.e("registry-item-remove")]} onClick={() => removeActorItem("denied_roles", v)}>×</button>
                </div>
              ))}
            </div>
            <div className={style[bem.e("registry-list-footer")]}>
              <div style={{ position: "relative", overflow: "visible", width: "100%" }}>
                <Select value="" onChange={(val) => addActorItem("denied_roles", val)} options={roleOptions} placeholder="选择拒绝角色..." direction="bottom" size="small" />
              </div>
            </div>
          </div>
          <div className={style[bem.e("registry-list-wrap")]}>
            <div className={style[bem.e("registry-list-header")]}><label>允许的用户</label></div>
            <div className={style[bem.e("registry-list-body")]}>
              {actorRules.allowed_users.length === 0 ? <div className={style[bem.e("registry-empty")]}>无</div> : actorRules.allowed_users.map(v => (
                <div key={v} className={style[bem.e("registry-item")]}>
                  <span>ID: {v}</span>
                  <button className={style[bem.e("registry-item-remove")]} onClick={() => removeActorItem("allowed_users", v)}>×</button>
                </div>
              ))}
            </div>
            <div className={style[bem.e("registry-list-footer")]}>
              <div style={{ position: "relative", overflow: "visible", width: "100%" }}>
                <Select value="" onChange={(val) => addActorItem("allowed_users", parseInt(val, 10))} optionsAsync={userOptionsAsync} searchable placeholder="添加允许用户..." direction="bottom" size="small" />
              </div>
            </div>
          </div>
          <div className={style[bem.e("registry-list-wrap")]}>
            <div className={style[bem.e("registry-list-header")]}><label>允许的角色</label></div>
            <div className={style[bem.e("registry-list-body")]}>
              {actorRules.allowed_roles.length === 0 ? <div className={style[bem.e("registry-empty")]}>无</div> : actorRules.allowed_roles.map(v => (
                <div key={v} className={style[bem.e("registry-item")]}>
                  <span>{v}</span>
                  <button className={style[bem.e("registry-item-remove")]} onClick={() => removeActorItem("allowed_roles", v)}>×</button>
                </div>
              ))}
            </div>
            <div className={style[bem.e("registry-list-footer")]}>
              <div style={{ position: "relative", overflow: "visible", width: "100%" }}>
                <Select value="" onChange={(val) => addActorItem("allowed_roles", val)} options={roleOptions} placeholder="选择允许角色..." direction="bottom" size="small" />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button type="default" size="small" onClick={() => setAuthModal({ visible: false, app: null })}>取消</Button>
          <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleAuthSave}>保存授权</Button>
        </div>
      </Modal>
    </div>
  );
}

export default PermissionRegistry;
