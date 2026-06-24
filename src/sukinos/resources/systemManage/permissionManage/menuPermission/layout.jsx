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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const bem = createNamespace("system-permission");

const ROLE_OPTIONS = [
  { label: "root", value: "root" },
  { label: "developer", value: "developer" },
  { label: "user", value: "user" },
];

const NAV_ITEMS = [
  { id: "overview", label: "管理概览" },
  { id: "users", label: "成员中心" },
  { id: "behavior", label: "审计分析" },
  { id: "systemConfig", label: "系统配置" },
  { id: "systemUpdate", label: "更新日志" },
  { id: "systemLog", label: "系统日志" },
  { id: "appManage", label: "应用管理" },
  { id: "permissionManage", label: "权限管理" },
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

function MenuPermissionPanel() {
  const [config, setConfig] = useState({ menus: {} });
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, menuId: null });
  const [localEdit, setLocalEdit] = useState(null);
  const [pickerModal, setPickerModal] = useState({ visible: false, field: '' });
  const [addMenuModal, setAddMenuModal] = useState(false);
  const [newMenuId, setNewMenuId] = useState("");
  const [newMenuLabel, setNewMenuLabel] = useState("");
  const [roleOptions, setRoleOptions] = useState(ROLE_OPTIONS);

  useEffect(() => { fetchConfig(); }, []);

  useEffect(() => {
    permissionManageAPI.getRoleList().then(res => {
      if (res.code === 200) {
        setRoleOptions((res.data || []).map(r => ({ label: r.label, value: r.name })));
      }
    });
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await permissionManageAPI.getMenuPermissions();
      if (res.code === 200) setConfig(res.data || { menus: {} });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getMenuConfig = (menuId) => {
    const raw = config.menus[menuId];
    if (!raw) return { default_roles: [], allowed_users: [], allowed_roles: [] };
    return {
      default_roles: raw.default_roles || raw.defaultRoles || [],
      allowed_users: raw.allowed_users || raw.allowedUsers || [],
      allowed_roles: raw.allowed_roles || raw.allowedRoles || [],
    };
  };

  const openEditModal = (menuId) => {
    const current = getMenuConfig(menuId);
    setLocalEdit({ ...current });
    setEditModal({ visible: true, menuId });
  };

  const handleModalSave = () => {
    if (!localEdit) return;
    const menuId = editModal.menuId;
    const updatedMenus = { ...config.menus };
    updatedMenus[menuId] = {
      ...(updatedMenus[menuId] || {}),
      default_roles: localEdit.default_roles || [],
      allowed_users: localEdit.allowed_users || [],
      allowed_roles: localEdit.allowed_roles || [],
    };
    const updated = { menus: updatedMenus };
    setConfig(updated);
    setEditModal({ visible: false, menuId: null });
    setLocalEdit(null);
    permissionManageAPI.updateMenuPermissions(updated).then(res => {
      if (res.code === 200) alert.success(res.message || "菜单权限已更新");
      else alert.failure(res.message || "更新失败");
    }).catch(e => alert.failure(e?.message || "更新失败"));
  };

  const handleModalCancel = () => {
    setEditModal({ visible: false, menuId: null });
    setLocalEdit(null);
  };

  const addToLocalEdit = (field, val) => {
    if (!val || !localEdit) return;
    const current = localEdit[field] || [];
    if (!current.includes(val)) {
      setLocalEdit(prev => ({ ...prev, [field]: [...current, val] }));
    }
  };

  const removeFromLocalEdit = (field, val) => {
    if (!localEdit) return;
    setLocalEdit(prev => ({ ...prev, [field]: (prev[field] || []).filter(v => v !== val) }));
  };

  const handleAddMenu = () => {
    const id = newMenuId.trim();
    const label = newMenuLabel.trim();
    if (!id || !label) {
      alert.failure("菜单标识和显示名不能为空");
      return;
    }
    if (config.menus[id]) {
      alert.failure("该菜单标识已存在");
      return;
    }
    const updatedMenus = { ...config.menus, [id]: { _label: label, default_roles: [], allowed_users: [], allowed_roles: [] } };
    const updated = { menus: updatedMenus };
    setConfig(updated);
    setAddMenuModal(false);
    setNewMenuId("");
    setNewMenuLabel("");
    permissionManageAPI.updateMenuPermissions(updated).then(res => {
      if (res.code === 200) alert.success(res.message || `菜单"${label}"已添加`);
      else alert.failure(res.message || "添加失败");
    }).catch(e => alert.failure(e?.message || "添加失败"));
  };

  const getMenuLabel = (menuId) => {
    if (!menuId) return "";
    const nav = NAV_ITEMS.find(n => n.id === menuId);
    if (nav) return nav.label;
    const custom = config.menus[menuId];
    return custom?._label || menuId;
  };

  const customMenuIds = Object.keys(config.menus).filter(id => !NAV_ITEMS.find(n => n.id === id));
  const customMenus = customMenuIds.map(id => ({ id, label: config.menus[id]?._label || id }));

  const data = [...NAV_ITEMS, ...customMenus].map(item => ({
    ...item,
    ...getMenuConfig(item.id),
  }));

  const columns = [
    {
      prop: "label", label: "菜单", width: 160,
      render: (r) => (
        <>
          <strong>{r.label}</strong>
          <div className={style[bem.e("code")]}>{r.id}</div>
        </>
      ),
    },
    {
      prop: "default_roles", label: "默认可见角色",
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r.default_roles || []).length > 0
            ? r.default_roles.map(v => (
                <span key={v} className={style[bem.e("tag")]}>{v}</span>
              ))
            : <span style={{ fontSize: 12, color: "#999" }}>未配置（默认全可见）</span>
          }
        </div>
      ),
    },
    {
      prop: "allowed_users", label: "允许的用户",
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r.allowed_users || []).length > 0
            ? r.allowed_users.map(v => (
                <span key={v} className={style[bem.e("tag")]}>{v}</span>
              ))
            : <span style={{ fontSize: 12, color: "#999" }}>无</span>
          }
        </div>
      ),
    },
    {
      prop: "allowed_roles", label: "允许的角色",
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r.allowed_roles || []).length > 0
            ? r.allowed_roles.map(v => (
                <span key={v} className={style[bem.e("tag")]}>{v}</span>
              ))
            : <span style={{ fontSize: 12, color: "#999" }}>无</span>
          }
        </div>
      ),
    },
    {
      prop: "_actions", label: "操作", width: 120,
      render: (r) => (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button className={style[bem.e("action-btn")]} onClick={() => openEditModal(r.id)} title="编辑">
            <EditIcon style={{ color: "#171717", fontSize: 16 }} />
            <span style={{ marginLeft: 2, fontSize: 12 }}>编辑</span>
          </button>
          {!isNavItem(r.id) && (
            <button className={style[bem.e("action-btn")]} onClick={() => {
              confirm.show({
                title: "删除菜单",
                content: `确定删除菜单"${getMenuLabel(r.id)}"及其权限配置吗？`,
                onConfirm: () => {
                  const updatedMenus = { ...config.menus };
                  delete updatedMenus[r.id];
                  const updated = { menus: updatedMenus };
                  setConfig(updated);
                  permissionManageAPI.updateMenuPermissions(updated).then(res => {
                    if (res.code === 200) alert.success(`菜单"${getMenuLabel(r.id)}"已删除`);
                    else alert.failure(res.message || "删除失败");
                  }).catch(e => alert.failure(e?.message || "删除失败"));
                },
              });
            }} title="删除" style={{ color: "#f43f5e" }}>
              <DeleteIcon style={{ fontSize: 16 }} />
              <span style={{ marginLeft: 2, fontSize: 12 }}>删除</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const isNavItem = (id) => NAV_ITEMS.some(n => n.id === id);

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <h3>菜单权限管理</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={() => { setNewMenuId(""); setNewMenuLabel(""); setAddMenuModal(true); }}>添加菜单</Button>
          <Button type="default" size="small" onClick={fetchConfig} loading={loading}>刷新</Button>
        </div>
      </div>
      <p className={style[bem.e("desc")]}>
        控制系统侧边栏导航菜单对各角色/用户的可见性。优先级：默认可见角色 → 允许的用户 → 允许的角色（三者任一匹配即可访问）。未配置的角色默认全可见。
      </p>
      <PageList
        columns={columns}
        data={data}
        rowKey="id"
        defaultColumnWidth={180}
        total={data.length}
      />
      <Modal
        title={`菜单权限 - ${getMenuLabel(editModal.menuId)}`}
        visible={editModal.visible}
        onClose={handleModalCancel}
        width={900}
        layout="split"
      >
        <div className={style[bem.e("split-left")]}>
          <div className={style[bem.e("split-left-label")]}>菜单</div>
          <div className={style[bem.e("split-left-title")]}>{getMenuLabel(editModal.menuId)}</div>
          <div className={style[bem.e("split-left-sub")]}>{editModal.menuId}</div>
          <div className={style[bem.e("split-left-tags")]}>
            {(localEdit?.default_roles || []).length > 0
              ? localEdit.default_roles.map(v => (
                  <span key={v} className={style[bem.e("split-left-badge")]}>{v}</span>
                ))
              : <span className={style[bem.e("split-left-badge")]}>默认全可见</span>
            }
          </div>
        </div>
        <div className={style[bem.e("split-right")]}>
          <div className={style[bem.e("form-group")]}>
            <label>默认可见角色</label>
            <div className={style[bem.e("tag-list")]}>
              {(localEdit?.default_roles || []).map(v => (
                <span key={v} className={style[bem.e("tag")]}>
                  {v}
                  <button className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit("default_roles", v)}>&times;</button>
                </span>
              ))}
              <Button type="default" size="small" onClick={() => setPickerModal({ visible: true, field: 'default_roles' })}>+ 添加角色</Button>
            </div>
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>允许的用户</label>
            <div className={style[bem.e("tag-list")]}>
              {(localEdit?.allowed_users || []).map(v => (
                <span key={v} className={style[bem.e("tag")]}>
                  ID: {v}
                  <button className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit("allowed_users", v)}>&times;</button>
                </span>
              ))}
              <Button type="default" size="small" onClick={() => setPickerModal({ visible: true, field: 'allowed_users' })}>+ 添加用户</Button>
            </div>
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>允许的角色</label>
            <div className={style[bem.e("tag-list")]}>
              {(localEdit?.allowed_roles || []).map(v => (
                <span key={v} className={style[bem.e("tag")]}>
                  {v}
                  <button className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit("allowed_roles", v)}>&times;</button>
                </span>
              ))}
              <Button type="default" size="small" onClick={() => setPickerModal({ visible: true, field: 'allowed_roles' })}>+ 添加角色</Button>
            </div>
          </div>
          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={handleModalCancel}>取消</Button>
            <Button type="default" size="small" onClick={handleModalSave} style={{ background: "#222", borderColor: "#222", color: "#fff" }}>保存</Button>
          </div>
        </div>
      </Modal>
      <Modal
        title={pickerModal.field === 'allowed_users' ? '添加用户' : '添加角色'}
        visible={pickerModal.visible}
        onClose={() => setPickerModal({ visible: false, field: '' })}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pickerModal.field === 'allowed_users' ? (
            <Select
              value=""
              onChange={(val) => { addToLocalEdit('allowed_users', parseInt(val, 10)); }}
              optionsAsync={userOptionsAsync}
              searchable
              placeholder="搜索添加用户..."
              direction="bottom"
              size="small"
            />
          ) : (
            <Select
              value=""
              onChange={(val) => { addToLocalEdit(pickerModal.field, val); }}
              options={roleOptions}
              placeholder="选择角色..."
              direction="bottom"
              size="small"
            />
          )}
          <div className={style[bem.e("tag-list")]}>
            {(localEdit?.[pickerModal.field] || []).map(v => (
              <span key={v} className={style[bem.e("tag")]}>
                {pickerModal.field === 'allowed_users' ? `ID: ${v}` : v}
                <button className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit(pickerModal.field, v)}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button type="primary" size="small" onClick={() => setPickerModal({ visible: false, field: '' })} style={{ background: "#222", borderColor: "#222" }}>完成</Button>
          </div>
        </div>
      </Modal>
      <Modal
        title="添加自定义菜单"
        visible={addMenuModal}
        onClose={() => setAddMenuModal(false)}
        width={500}
      >
        <div>
          <div className={style[bem.e("form-group")]}>
            <label>菜单标识</label>
            <input
              type="text"
              value={newMenuId}
              onChange={e => setNewMenuId(e.target.value)}
              className={style[bem.e("input")]}
              placeholder="如: custom-settings"
            />
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>显示名</label>
            <input
              type="text"
              value={newMenuLabel}
              onChange={e => setNewMenuLabel(e.target.value)}
              className={style[bem.e("input")]}
              placeholder="如: 自定义设置"
            />
          </div>
          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={() => setAddMenuModal(false)}>取消</Button>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleAddMenu}>确认添加</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MenuPermissionPanel;
