import { useState, useEffect, useCallback } from "react";
import style from "../style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import systemAPI from "@/apis/system/main";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import Modal from "@/component/modal/layout";

const bem = createNamespace("system-permission");

const ROLE_OPTIONS = [
  { label: "root", value: "root" },
  { label: "developer", value: "developer" },
  { label: "user", value: "user" },

];

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

function RegistryPowerPanel() {
  const [config, setConfig] = useState({ allowedUsers: [], allowedRoles: [] });
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [pickVal, setPickVal] = useState("");
  const [roleOptions, setRoleOptions] = useState(ROLE_OPTIONS);

  useEffect(() => { fetchConfig(); }, []);

  useEffect(() => {
    permissionManageAPI.getRoleList().then(res => {
      if (res.code === 200) {
        const dynOptions = (res.data || []).map(r => ({ label: r.label, value: r.name }));
        setRoleOptions(dynOptions);
      }
    });
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await permissionManageAPI.getRegistryPower();
      if (res.code === 200) {
        const cfg = res.data || {};
        setConfig(cfg);
        setSelectedUsers(cfg.allowed_users || cfg.allowedUsers || []);
        setSelectedRoles(cfg.allowed_roles || cfg.allowedRoles || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveRegistryConfig = useCallback(async (users, roles) => {
    const data = { allowed_users: users, allowed_roles: roles };
    try {
      const res = await permissionManageAPI.updateRegistryPower(data);
      if (res.code === 200) {
        setSelectedUsers(users);
        setSelectedRoles(roles);
      } else {
        alert.failure(res.message || "更新失败");
      }
    } catch (e) { alert.failure(e?.message || "更新失败"); }
  }, []);

  const addUser = () => {
    if (!pickVal) return;
    const uid = parseInt(pickVal, 10);
    if (selectedUsers.includes(uid)) return;
    confirm.show({
      title: "确认添加授权用户",
      content: `确定添加用户 ID:${uid} 的注册权吗？`,
      onConfirm: () => {
        saveRegistryConfig([...selectedUsers, uid], selectedRoles);
        setPickVal("");
        setUserPickerOpen(false);
      },
      onCancel: () => { setPickVal(""); setUserPickerOpen(false); }
    });
  };

  const removeUser = (uid) => {
    confirm.show({
      title: "确认移除",
      content: `确定移除用户 ID:${uid} 的注册权吗？`,
      onConfirm: () => saveRegistryConfig(selectedUsers.filter(u => u !== uid), selectedRoles),
    });
  };

  const addRole = () => {
    if (!pickVal || selectedRoles.includes(pickVal)) return;
    confirm.show({
      title: "确认添加授权角色",
      content: `确定添加角色"${pickVal}"的注册权吗？`,
      onConfirm: () => {
        saveRegistryConfig(selectedUsers, [...selectedRoles, pickVal]);
        setPickVal("");
        setRolePickerOpen(false);
      },
      onCancel: () => { setPickVal(""); setRolePickerOpen(false); }
    });
  };

  const removeRole = (role) => {
    confirm.show({
      title: "确认移除",
      content: `确定移除角色"${role}"的注册权吗？`,
      onConfirm: () => saveRegistryConfig(selectedUsers, selectedRoles.filter(r => r !== role)),
    });
  };

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <h3>注册权管理</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="default" size="small" onClick={fetchConfig} loading={loading}>刷新</Button>
        </div>
      </div>
      <p className={style[bem.e("desc")]}>
        控制谁有权限将 APP 加入权限注册池。默认仅 root 有权限。在此放权后，指定的用户或角色将能在权限注册池中添加/移除 APP。root 用户始终拥有注册权。
      </p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div className={style[bem.e("registry-list-wrap")]}>
          <div className={style[bem.e("registry-list-header")]}>
            <label>允许的用户</label>
          </div>
          <div className={style[bem.e("registry-list-body")]}>
            {selectedUsers.length === 0 ? (
              <div className={style[bem.e("registry-empty")]}>无</div>
            ) : (
              selectedUsers.map(uid => (
                <div key={uid} className={style[bem.e("registry-item")]}>
                  <span>ID: {uid}</span>
                  <button className={style[bem.e("registry-item-remove")]} onClick={() => removeUser(uid)}>×</button>
                </div>
              ))
            )}
          </div>
          <div className={style[bem.e("registry-list-footer")]}>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={() => { setPickVal(""); setUserPickerOpen(true); }}>添加用户</Button>
          </div>
        </div>
        <div className={style[bem.e("registry-list-wrap")]}>
          <div className={style[bem.e("registry-list-header")]}>
            <label>允许的角色</label>
          </div>
          <div className={style[bem.e("registry-list-body")]}>
            {selectedRoles.length === 0 ? (
              <div className={style[bem.e("registry-empty")]}>无</div>
            ) : (
              selectedRoles.map(role => (
                <div key={role} className={style[bem.e("registry-item")]}>
                  <span>{role}</span>
                  <button className={style[bem.e("registry-item-remove")]} onClick={() => removeRole(role)}>×</button>
                </div>
              ))
            )}
          </div>
          <div className={style[bem.e("registry-list-footer")]}>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={() => { setPickVal(""); setRolePickerOpen(true); }}>添加角色</Button>
          </div>
        </div>
      </div>
      <Modal title="添加授权用户" visible={userPickerOpen} onClose={() => setUserPickerOpen(false)} width={500}>
        <div className={style[bem.e("form-group")]}>
          <label>选择用户</label>
          <Select
            value=""
            onChange={(val) => setPickVal(val)}
            optionsAsync={(params) => userOptionsAsync(params).then(r => ({ ...r, items: r.items.filter(it => !selectedUsers.includes(parseInt(it.value, 10))) }))}
            searchable
            placeholder="搜索并选择用户..."
            direction="bottom"
            size="small"
          />
        </div>
        <div className={style[bem.e("form-actions")]}>
          <Button type="default" size="small" onClick={() => setUserPickerOpen(false)}>取消</Button>
          <Button type="primary" size="small" disabled={!pickVal} style={{ background: "#222", borderColor: "#222" }} onClick={addUser}>确认添加</Button>
        </div>
      </Modal>
      <Modal title="添加授权角色" visible={rolePickerOpen} onClose={() => setRolePickerOpen(false)} width={500}>
        <div className={style[bem.e("form-group")]}>
          <label>选择角色</label>
          <div style={{ position: "relative", overflow: "visible" }}>
            <Select
              value={pickVal}
              onChange={setPickVal}
              options={roleOptions.filter(r => !selectedRoles.includes(r.value))}
              placeholder="选择角色..."
              direction="bottom"
              size="small"
            />
          </div>
        </div>
        <div className={style[bem.e("form-actions")]}>
          <Button type="default" size="small" onClick={() => setRolePickerOpen(false)}>取消</Button>
          <Button type="primary" size="small" disabled={!pickVal} style={{ background: "#222", borderColor: "#222" }} onClick={addRole}>确认添加</Button>
        </div>
      </Modal>
    </div>
  );
}

export default RegistryPowerPanel;
