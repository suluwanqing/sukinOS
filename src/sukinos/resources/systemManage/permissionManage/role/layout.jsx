import { useState, useEffect } from "react";
import style from "../style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
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

function RolePanel() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, role: null });
  const [localEdit, setLocalEdit] = useState({ name: "", label: "", description: "" });
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", label: "", description: "" });
  const [deleteLoading, setDeleteLoading] = useState({});

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await permissionManageAPI.getRoleList();
      if (res.code === 200) setRoles(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openEditModal = (role) => {
    setLocalEdit({ name: role.name, label: role.label, description: role.description || "" });
    setEditModal({ visible: true, role });
  };

  const handleEditSave = async () => {
    try {
      const res = await permissionManageAPI.updateRole({ roleId: editModal.role.id, label: localEdit.label, description: localEdit.description });
      if (res.code === 200) {
        alert.success(res.message || "角色已更新");
        setEditModal({ visible: false, role: null });
        fetchRoles();
      } else {
        alert.failure(res.message || "更新失败");
      }
    } catch (e) { alert.failure(e?.message || "更新失败"); }
  };

  const handleDelete = (role) => {
    confirm.show({
      title: "确认删除",
      content: `确定删除角色"${role.label}"吗？`,
      onConfirm: async () => {
        const res = await permissionManageAPI.deleteRole({ roleId: role.id });
        if (res.code === 200) {
          alert.success(res.message || "角色已删除");
          fetchRoles();
        } else {
          alert.failure(res.message || "删除失败");
        }
      }
    });
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.label.trim()) {
      alert.failure("角色标识和显示名不能为空");
      return;
    }
    try {
      const res = await permissionManageAPI.createRole(createForm);
      if (res.code === 200) {
        alert.success(res.message || "角色已创建");
        setCreateModal(false);
        setCreateForm({ name: "", label: "", description: "" });
        fetchRoles();
      }
    } catch (e) { alert.failure(e?.message || "创建失败"); }
  };

  const columns = [
    { prop: "label", label: "角色名", width: 140,
      render: (r) => (
        <>
          <strong>{r.label}</strong>
          {r.is_system && <span className={style[bem.e("badge-on")]} style={{ marginLeft: 8, fontSize: 11 }}>系统</span>}
        </>
      ),
    },
    { prop: "name", label: "标识", width: 120,
      render: (r) => <span className={style[bem.e("code")]}>{r.name}</span>,
    },
    { prop: "description", label: "描述", width: 240 },
    { prop: "user_count", label: "用户数", width: 80,
      render: (r) => <span>{r.user_count ?? r.userCount ?? 0}</span>,
    },
    {
      prop: "_actions", label: "操作", width: 120,
      render: (r) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className={style[bem.e("action-btn")]}
            onClick={() => openEditModal(r)}
            title="编辑"
            style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, display: "inline-flex", alignItems: "center" }}
          >
            <EditIcon style={{ color: "#171717", fontSize: 18 }} />
          </button>
          {!r.is_system && (
            <button
              className={style[bem.e("action-btn")]}
              onClick={() => handleDelete(r)}
              title="删除"
              style={{ border: "none", background: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, display: "inline-flex", alignItems: "center" }}
            >
              <DeleteIcon style={{ color: "#ef4444", fontSize: 18 }} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <h3>角色管理</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="default" size="small" onClick={fetchRoles} loading={loading}>刷新</Button>
          <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={() => setCreateModal(true)}>添加角色</Button>
        </div>
      </div>
      <p className={style[bem.e("desc")]}>
        角色是权限配置的基础单元。系统内置角色不可删除。root 用户始终拥有全部权限，不受角色配置限制。通过角色可关联菜单可见性、路由访问和 APP 访问控制。
      </p>
      <PageList
        columns={columns}
        data={roles}
        rowKey="id"
        defaultColumnWidth={150}
        total={roles.length}
      />
      <Modal
        title={`编辑角色 - ${editModal.role?.label || ""}`}
        visible={editModal.visible}
        onClose={() => setEditModal({ visible: false, role: null })}
        width={600}
      >
        <div>
          <div className={style[bem.e("info-section")]}>
            <div className={style[bem.e("info-section-title")]}>基本信息</div>
            <div className={style[bem.e("info-row")]}>
              <span className={style[bem.e("info-label")]}>角色标识</span>
              <span className={style[bem.e("info-value")]} style={{ fontWeight: 400, fontSize: 13, color: "#60646c" }}>{localEdit.name}</span>
            </div>
          </div>
          <div className={style[bem.e("info-section")]}>
            <div className={style[bem.e("info-section-title")]}>编辑信息</div>
            <div className={style[bem.e("form-group")]} style={{ marginTop: 8 }}>
              <label>显示名</label>
              <input
                type="text"
                value={localEdit.label}
                onChange={e => setLocalEdit(prev => ({ ...prev, label: e.target.value }))}
                className={style[bem.e("input")]}
                placeholder="输入显示名"
              />
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>描述</label>
              <textarea
                value={localEdit.description}
                onChange={e => setLocalEdit(prev => ({ ...prev, description: e.target.value }))}
                className={style[bem.e("textarea")]}
                placeholder="输入角色描述"
                rows={3}
              />
            </div>
          </div>
          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={() => setEditModal({ visible: false, role: null })}>取消</Button>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleEditSave}>保存</Button>
          </div>
        </div>
      </Modal>
      <Modal
        title="添加新角色"
        visible={createModal}
        onClose={() => setCreateModal(false)}
        width={600}
      >
        <div>
          <div className={style[bem.e("info-section")]}>
            <div className={style[bem.e("info-section-title")]}>角色信息</div>
            <div className={style[bem.e("form-group")]} style={{ marginTop: 8 }}>
              <label>角色标识 *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className={style[bem.e("input")]}
                placeholder="如: manager"
              />
              <div className={style[bem.e("desc")]}>唯一标识，创建后不可修改</div>
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>显示名 *</label>
              <input
                type="text"
                value={createForm.label}
                onChange={e => setCreateForm(prev => ({ ...prev, label: e.target.value }))}
                className={style[bem.e("input")]}
                placeholder="如: 经理"
              />
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>描述</label>
              <textarea
                value={createForm.description}
                onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                className={style[bem.e("textarea")]}
                placeholder="输入角色描述"
                rows={3}
              />
            </div>
          </div>
          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={() => { setCreateModal(false); setCreateForm({ name: "", label: "", description: "" }); }}>取消</Button>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleCreate}>创建</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RolePanel;
