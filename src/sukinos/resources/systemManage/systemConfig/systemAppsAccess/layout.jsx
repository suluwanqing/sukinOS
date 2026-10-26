import { useState, useEffect, useRef, useCallback } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import systemAPI from "@/apis/system/main";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import PageList from "@/component/list/pageList/layout";
import Modal from "@/component/modal/layout";
import { usePermission } from "@/hooks/usePermission/main";
import kernel from "@/sukinos/utils/process/kernel";

import { Pencil as EditIcon, Eye as VisibilityIcon, EyeOff as VisibilityOffIcon, Trash2 as DeleteIcon, Plus as AddIcon } from 'lucide-react';

const bem = createNamespace("system-apps-access");

const ROLE_OPTIONS = [
  { label: "root", value: "root" },
  { label: "developer", value: "developer" },
  { label: "user", value: "user" },
];

// 前端字段名 -> 后端字段名
const FIELD_MAP = {
  defaultVisibleTo: "default_visible_to",
  allowedUsers: "allowed_users",
  allowedRoles: "allowed_roles",
};

function SystemAppsAccess() {
  const { hasPermission } = usePermission();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  // 本地编辑缓存：appId -> { defaultVisibleTo, allowedUsers, allowedRoles }
  const [edits, setEdits] = useState({});
  const [dirty, setDirty] = useState({});
  const [editModal, setEditModal] = useState({ visible: false, app: null });
  const [localEdit, setLocalEdit] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewModal, setViewModal] = useState({ visible: false, app: null });
  const [addModal, setAddModal] = useState(false);
  const [newAppId, setNewAppId] = useState("");
  const [newAppLabel, setNewAppLabel] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [roleOptions, setRoleOptions] = useState(ROLE_OPTIONS);

  useEffect(() => {
    permissionManageAPI.getRoleList().then(res => {
      if (res.code === 200) {
        setRoleOptions((res.data || []).map(r => ({ label: r.label, value: r.name })));
      }
    });
  }, []);

  const searchUsers = useCallback(({ page, pageSize, searchQuery }) => {
    return systemAPI.getUserList({ page, pageSize, keyword: searchQuery || "" })
      .then(res => {
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
      });
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await permissionManageAPI.getSystemApps();
      if (res.code === 200) setApps(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getField = (app, field) => {
    if (edits[app.appId] && edits[app.appId][field] !== undefined) {
      return edits[app.appId][field];
    }
    return app[field] || [];
  };

  const updateField = (appId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || {}), [field]: value },
    }));
    setDirty(prev => ({ ...prev, [appId]: true }));
  };

  const handleSaveRow = async (app) => {
    const edit = edits[app.appId];
    if (!edit) return;
    const payload = {};
    for (const [frontKey, backKey] of Object.entries(FIELD_MAP)) {
      if (edit[frontKey] !== undefined) payload[backKey] = edit[frontKey];
    }
    try {
      const res = await permissionManageAPI.updateSystemAppAccess({ appId: app.appId, ...payload });
      if (res.code === 200) {
        alert.success(res.message || `${app.label} 配置已更新`);
        setEdits(prev => { const n = { ...prev }; delete n[app.appId]; return n; });
        setDirty(prev => { const n = { ...prev }; delete n[app.appId]; return n; });
        await fetchData();
        kernel.syncSystemAccess();
      }
    } catch (e) { alert.failure(e?.message || "更新失败"); }
  };

  const toggleHidden = async (app) => {
    try {
      const res = await permissionManageAPI.updateSystemAppAccess({ appId: app.appId, hidden: !app.hidden });
      if (res.code === 200) {
        alert.success(res.message || (app.hidden ? "已取消隐藏" : "已隐藏"));
        fetchData();
        kernel.syncSystemAccess();
      }
    } catch (e) { alert.failure(e?.message || "操作失败"); }
  };

  const addToList = (appId, field, val, current) => {
    if (current.includes(val)) return;
    updateField(appId, field, [...current, val]);
  };

  const removeFromList = (appId, field, current, val) => {
    updateField(appId, field, current.filter(v => v !== val));
  };

  const data = apps.map(app => {
    const defaultVisibleTo = getField(app, "defaultVisibleTo");
    const allowedUsers = getField(app, "allowedUsers");
    const allowedRoles = getField(app, "allowedRoles");
    const isDirty = dirty[app.appId];
    return {
      ...app,
      _defaultVisibleTo: defaultVisibleTo,
      _allowedUsers: allowedUsers,
      _allowedRoles: allowedRoles,
      _isDirty: isDirty,
      _badgeText: app.hidden ? "已隐藏" : "可见",
      _badgeType: app.hidden ? "badge-off" : "badge-on",
    };
  });

  const openEditModal = (app) => {
    const currentEdit = edits[app.appId] || {};
    setEditModal({ visible: true, app });
    setLocalEdit({
      defaultVisibleTo: currentEdit.defaultVisibleTo !== undefined ? currentEdit.defaultVisibleTo : (app.defaultVisibleTo || []),
      allowedUsers: currentEdit.allowedUsers !== undefined ? currentEdit.allowedUsers : (app.allowedUsers || []),
      allowedRoles: currentEdit.allowedRoles !== undefined ? currentEdit.allowedRoles : (app.allowedRoles || []),
    });
  };

  const handleModalSave = async () => {
    if (!localEdit || !editModal.app) return;
    const app = editModal.app;
    const payload = {};
    for (const [frontKey, backKey] of Object.entries(FIELD_MAP)) {
      if (localEdit[frontKey] !== undefined) payload[backKey] = localEdit[frontKey];
    }
    try {
      const res = await permissionManageAPI.updateSystemAppAccess({ appId: app.appId, ...payload });
      if (res.code === 200) {
        alert.success(res.message || `${app.label} 配置已更新`);
        setEditModal({ visible: false, app: null });
        setLocalEdit(null);
        setEdits(prev => { const n = { ...prev }; delete n[app.appId]; return n; });
        setDirty(prev => { const n = { ...prev }; delete n[app.appId]; return n; });
        await fetchData();
        kernel.syncSystemAccess();
      }
    } catch (e) { alert.failure(e?.message || "更新失败"); }
  };

  const handleModalCancel = () => {
    setEditModal({ visible: false, app: null });
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


  const columns = [
    {
      prop: "label",
      label: "APP",
      width: 170,
      render: (r) => (
        <div className="flex flex-col min-w-0">
          <strong className="text-foreground text-[13px] truncate">{r.label}</strong>
          <div className={style[bem.e("code")]}>{r.appId}</div>
        </div>
      ),
    },
    {
      prop: "_defaultVisibleTo",
      label: "默认可见",
      minWidth: 140,
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r._defaultVisibleTo || []).map(v => (
            <span key={v} className={style[bem.e("tag")]}>{v}</span>
          ))}
          {(!r._defaultVisibleTo || r._defaultVisibleTo.length === 0) && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      prop: "_allowedUsers",
      label: "允许的用户",
      minWidth: 150,
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r._allowedUsers || []).map(v => (
            <span key={v} className={style[bem.e("tag")]}>
              {typeof v === "number" ? `ID:${v}` : v}
            </span>
          ))}
          {(!r._allowedUsers || r._allowedUsers.length === 0) && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      prop: "_allowedRoles",
      label: "允许的角色",
      minWidth: 140,
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r._allowedRoles || []).map(v => (
            <span key={v} className={style[bem.e("tag")]}>{v}</span>
          ))}
          {(!r._allowedRoles || r._allowedRoles.length === 0) && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      prop: "_badgeText",
      label: "状态",
      width: 90,
      render: (r) => (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {r._isDirty && <span className={style[bem.e("dirty")]} title="有未保存的变更" />}
          <span className={style[bem.e(r._badgeType)]}>{r._badgeText}</span>
        </div>
      ),
    },
  ];

 
  const appActions = [
    {
      label: "查看",
      icon: <VisibilityIcon className="size-3.5 text-foreground" />,
      onClick: (r) => setViewModal({ visible: true, app: r }),
    },
    ...(hasPermission("system:apps_access:edit") ? [
      {
        label: "编辑",
        icon: <EditIcon className="size-3.5 text-foreground" />,
        onClick: (r) => openEditModal(r),
      },
      {
        label: "切换显隐",
        icon: <VisibilityOffIcon className="size-3.5 text-amber-500" />,
        onClick: (r) => toggleHidden(r),
      },
      {
        label: "删除",
        icon: <DeleteIcon className="size-3.5 text-destructive" />,
        onClick: (r) => {
          if (r.appId === "sys-systemManage") {
            return alert.warning("系统核心管理应用不允许删除");
          }
          confirm.show({
            title: "删除系统APP",
            content: `确定删除"${r.label}"(${r.appId})吗？此操作不可恢复。`,
            onConfirm: async () => {
              const res = await permissionManageAPI.deleteSystemApp(r.appId);
              if (res.code === 200) {
                alert.success(res.message || "已删除");
                fetchData();
                kernel.syncSystemAccess();
              } else {
                alert.failure(res.message || "删除失败");
              }
            },
          });
        },
      }
    ] : []),
  ];

  const handleAddApp = async () => {
    const appId = newAppId.trim();
    const label = newAppLabel.trim();
    if (!appId || !label) { alert.failure("APP标识和显示名不能为空"); return; }
    const res = await permissionManageAPI.createSystemApp({ app_id: appId, label, description: newAppDesc.trim() });
    if (res.code === 200) {
      alert.success(res.message || "创建成功");
      setAddModal(false); setNewAppId(""); setNewAppLabel(""); setNewAppDesc("");
      fetchData();
    } else alert.failure(res.message || "创建失败");
  };

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <div>
          <h3>系统内置 APP 可见性控制</h3>
          <p className={style[bem.e("desc")]}>
            双向控制：可向普通用户开放系统管理功能(正向放权)，也可隐藏开发者工具(逆向限制)。
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button type="dark" size="small" onClick={() => setAddModal(true)}>
            <AddIcon size={15} style={{ marginRight: 2 }} />添加 APP
          </Button>
          <Button type="default" size="small" onClick={fetchData} loading={loading}>刷新</Button>
        </div>
      </div>

      <PageList
        columns={columns}
        data={data.slice((page - 1) * pageSize, page * pageSize)}
        rowKey="appId"
        defaultColumnWidth={160}
        total={data.length}
        current={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
        actions={appActions}
        actionWidth={140}
        actionFixed={true}
      />

      <Modal
        title={`APP 详情 - ${viewModal.app?.label || ""}`}
        visible={viewModal.visible}
        onClose={() => setViewModal({ visible: false, app: null })}
        width={620}
      >
        {viewModal.app && (
          <div className="flex flex-col gap-4">
            <div className={style[bem.e("form-group")]}>
              <label>APP 信息</label>
              <div style={{ fontSize: 13, color: "#60646c" }}>
                <strong>{viewModal.app.label}</strong> ({viewModal.app.appId})
              </div>
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>默认可见角色</label>
              <div className={style[bem.e("tag-list")]}>
                {(viewModal.app.defaultVisibleTo || []).map(v => (
                  <span key={v} className={style[bem.e("tag")]}>{v}</span>
                ))}
                {(!viewModal.app.defaultVisibleTo || viewModal.app.defaultVisibleTo.length === 0) && (
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>无</span>
                )}
              </div>
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>允许的用户</label>
              <div className={style[bem.e("tag-list")]}>
                {(viewModal.app.allowedUsers || []).map(v => (
                  <span key={v} className={style[bem.e("tag")]}>ID: {v}</span>
                ))}
                {(!viewModal.app.allowedUsers || viewModal.app.allowedUsers.length === 0) && (
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>无</span>
                )}
              </div>
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>允许的角色</label>
              <div className={style[bem.e("tag-list")]}>
                {(viewModal.app.allowedRoles || []).map(v => (
                  <span key={v} className={style[bem.e("tag")]}>{v}</span>
                ))}
                {(!viewModal.app.allowedRoles || viewModal.app.allowedRoles.length === 0) && (
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>无</span>
                )}
              </div>
            </div>
            <div className={style[bem.e("form-group")]}>
              <label>当前可见状态</label>
              <div style={{ fontSize: 13, color: "#60646c" }}>
                {viewModal.app.hidden ? "已隐藏" : "可见"}
              </div>
            </div>
            <div className={style[bem.e("form-actions")]}>
              <Button type="default" size="small" onClick={() => setViewModal({ visible: false, app: null })}>关闭</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={`APP 可见性配置 - ${editModal.app?.label || ""}`}
        visible={editModal.visible}
        onClose={handleModalCancel}
        width={760}
        layout="split"
      >
        <div className={style[bem.e("split-left")]}>
          <div className={style[bem.e("split-left-label")]}>目标 APP</div>
          <div className={style[bem.e("split-left-title")]}>{editModal.app?.label || ""}</div>
          <div className={style[bem.e("split-left-sub")]}>{editModal.app?.appId || ""}</div>
          <div className={style[bem.e("split-left-tags")]}>
            {editModal.app?.hidden ? (
              <span className={style[bem.e("split-left-badge-off")]}>已隐藏</span>
            ) : (
              <span className={style[bem.e("split-left-badge-on")]}>可见</span>
            )}
            {(localEdit?.defaultVisibleTo || []).map(v => (
              <span key={v} className={style[bem.e("split-left-badge")]}>{v}</span>
            ))}
          </div>
        </div>

        <div className={style[bem.e("split-right")]}>
          <div className={style[bem.e("form-group")]}>
            <label>默认可见角色</label>
            <div className={style[bem.e("inline-select")]}>
              <Select
                value=""
                onChange={val => addToLocalEdit("defaultVisibleTo", val)}
                options={roleOptions}
                placeholder="添加角色..."
                direction="bottom"
                size="small"
              />
              <div className={style[bem.e("tag-list")]}>
                {(localEdit?.defaultVisibleTo || []).map(v => (
                  <span key={v} className={style[bem.e("tag")]}>
                    {v}
                    <button type="button" className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit("defaultVisibleTo", v)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={style[bem.e("form-group")]}>
            <label>允许的用户</label>
            <div className={style[bem.e("inline-select")]}>
              <Select
                value=""
                onChange={val => addToLocalEdit("allowedUsers", parseInt(val, 10))}
                optionsAsync={searchUsers}
                searchable
                placeholder="搜索用户..."
                direction="bottom"
                size="small"
              />
              <div className={style[bem.e("tag-list")]}>
                {(localEdit?.allowedUsers || []).map(v => (
                  <span key={v} className={style[bem.e("tag")]}>
                    ID: {v}
                    <button type="button" className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit("allowedUsers", v)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={style[bem.e("form-group")]}>
            <label>允许的角色</label>
            <div className={style[bem.e("inline-select")]}>
              <Select
                value=""
                onChange={val => addToLocalEdit("allowedRoles", val)}
                options={roleOptions}
                placeholder="选择角色..."
                direction="bottom"
                size="small"
              />
              <div className={style[bem.e("tag-list")]}>
                {(localEdit?.allowedRoles || []).map(v => (
                  <span key={v} className={style[bem.e("tag")]}>
                    {v}
                    <button type="button" className={style[bem.e("tag-remove")]} onClick={() => removeFromLocalEdit("allowedRoles", v)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={handleModalCancel}>取消</Button>
            <Button type="dark" size="small" onClick={handleModalSave}>保存更改</Button>
          </div>
        </div>
      </Modal>

      <Modal title="添加系统 APP" visible={addModal} onClose={() => setAddModal(false)} width={460}>
        <div className="flex flex-col gap-3.5">
          <div className={style[bem.e("form-group")]}>
            <label>APP 标识</label>
            <input
              type="text"
              value={newAppId}
              onChange={e => setNewAppId(e.target.value)}
              className={style[bem.e("input")]}
              placeholder="如: sys-my-app"
            />
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>显示名</label>
            <input
              type="text"
              value={newAppLabel}
              onChange={e => setNewAppLabel(e.target.value)}
              className={style[bem.e("input")]}
              placeholder="如: 我的应用"
            />
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>描述（可选）</label>
            <input
              type="text"
              value={newAppDesc}
              onChange={e => setNewAppDesc(e.target.value)}
              className={style[bem.e("input")]}
              placeholder="简短描述"
            />
          </div>
          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={() => setAddModal(false)}>取消</Button>
            <Button type="dark" size="small" onClick={handleAddApp}>确认添加</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SystemAppsAccess;
