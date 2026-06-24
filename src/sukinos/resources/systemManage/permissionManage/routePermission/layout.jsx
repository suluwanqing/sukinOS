import { useState, useEffect } from "react";
import style from "../style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import systemAPI from "@/apis/system/main";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import PageList from "@/component/list/pageList/layout";
import Modal from "@/component/modal/layout";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

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

function RoutePermissionPanel() {
  const [config, setConfig] = useState({ routes: {} });
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editModal, setEditModal] = useState({ visible: false, path: null });
  const [localEdit, setLocalEdit] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewModal, setViewModal] = useState({ visible: false, path: null });
  const [routePickerModal, setRoutePickerModal] = useState({ visible: false, field: '' });
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
      const res = await permissionManageAPI.getRoutePermissions();
      if (res.code === 200) setConfig(res.data || { routes: {} });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await permissionManageAPI.seedRoutePermissions();
      if (res.code === 200) {
        alert.success(res.message || `路由扫描完成，共 ${res.data?.total || 0} 条`);
        fetchConfig();
      }
    } catch (e) { alert.failure(e?.message || "扫描失败"); }
    finally { setSeeding(false); }
  };

  const openRouteEditModal = (path) => {
    const rule = config.routes[path] || { require_auth: true, allowed_roles: [], allowed_users: [] };
    const normalized = {
      require_auth: rule.require_auth ?? rule.requireAuth ?? true,
      allowed_roles: rule.allowed_roles || rule.allowedRoles || [],
      allowed_users: rule.allowed_users || rule.allowedUsers || [],
      methods: rule.methods || [],
      description: rule.description || "",
    };
    setLocalEdit(normalized);
    setEditModal({ visible: true, path });
  };

  const handleRouteModalSave = async () => {
    if (!localEdit) return;
    const path = editModal.path;
    try {
      const res = await permissionManageAPI.updateRoutePermission({ routePath: path, ...localEdit });
      if (res.code === 200) {
        alert.success(res.message || "路由权限已更新");
        setEditModal({ visible: false, path: null });
        setLocalEdit(null);
        fetchConfig();
      } else {
        alert.failure(res.message || "更新失败");
      }
    } catch (e) { alert.failure(e?.message || "更新失败"); }
  };

  const handleRouteModalCancel = () => {
    setEditModal({ visible: false, path: null });
    setLocalEdit(null);
  };

  const addToRouteLocalEdit = (field, val) => {
    if (!val || !localEdit) return;
    const current = localEdit[field] || [];
    if (!current.includes(val)) {
      setLocalEdit(prev => ({ ...prev, [field]: [...current, val] }));
    }
  };

  const removeFromRouteLocalEdit = (field, val) => {
    if (!localEdit) return;
    setLocalEdit(prev => ({ ...prev, [field]: (prev[field] || []).filter(v => v !== val) }));
  };

  const routeEntries = Object.entries(config.routes || {});
  const filtered = searchQuery
    ? routeEntries.filter(([path]) => path.toLowerCase().includes(searchQuery.toLowerCase()))
    : routeEntries;

  const data = filtered.map(([path, rule], idx) => ({
    _idx: idx + 1,
    _path: path,
    _methods: (rule.methods || ["GET"]).join(","),
    _requireAuth: (rule.require_auth ?? rule.requireAuth) !== false,
    _allowedRoles: rule.allowed_roles || rule.allowedRoles || [],
    _allowedUsers: rule.allowed_users || rule.allowedUsers || [],
    _description: rule.description || "",
    _auto: rule._auto === true || rule.Auto === true,
    _locked: rule._locked === true || rule.Locked === true,
    rule,
  }));

  const columns = [
    { prop: "_idx", label: "#", width: 50 },
    { prop: "_path", label: "路由路径", width: 300,
      render: (r) => <strong style={{ fontSize: 12 }}>{r._path}</strong>,
    },
    { prop: "_methods", label: "方法", width: 100,
      render: (r) => <span className={style[bem.e("code")]}>{r._methods}</span>,
    },
    {
      prop: "_requireAuth", label: "访问权限", width: 130,
      render: (r) => {
        if (r._locked) return <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>仅 root</span>;
        if (!r._allowedRoles.length && !r._allowedUsers.length) return <span style={{ fontSize: 12, color: "#999" }}>未配置</span>;
        if (!r._requireAuth) return <span style={{ fontSize: 12, color: "#999" }}>公开(免登录)</span>;
        return <span style={{ fontSize: 12, color: "#52c41a" }}>需登录</span>;
      },
    },
    {
      prop: "_allowedRoles", label: "允许的角色",
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r._allowedRoles || []).map(v => (
            <span key={v} className={style[bem.e("tag")]}>{v}</span>
          ))}
        </div>
      ),
    },
    {
      prop: "_allowedUsers", label: "允许的用户",
      render: (r) => (
        <div className={style[bem.e("tag-list")]}>
          {(r._allowedUsers || []).map(v => (
            <span key={v} className={style[bem.e("tag")]}>
              {typeof v === "number" ? `ID:${v}` : v}
            </span>
          ))}
        </div>
      ),
    },
  ];

  const routeActions = [
    {
      label: "查看",
      icon: <VisibilityIcon style={{ color: "#171717" }} />,
      onClick: (r) => setViewModal({ visible: true, path: r._path }),
    },
    {
      label: "编辑",
      icon: <EditIcon style={{ color: "#171717" }} />,
      onClick: (r) => {
        if (r._locked) { alert.failure("该路由为系统保护路由，仅 root 可访问，不可编辑"); return; }
        openRouteEditModal(r._path);
      },
    },
  ];

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <h3>API 路由权限管理</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} loading={seeding} onClick={handleSeed}>扫描并同步新路由</Button>
          <Button type="default" size="small" onClick={fetchConfig} loading={loading}>刷新</Button>
        </div>
      </div>
      <p className={style[bem.e("desc")]}>
        未配置的路由默认放行。仅在显式配置了 allowedRoles 或 allowedUsers 后才会限制访问。root 用户始终拥有全部路由访问权限，不受路由权限配置限制。受保护的系统路由（以 /system/permission/ 等开头）强制 root-only，不可编辑。
      </p>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索路由路径..."
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #f0f0f3", fontSize: 13, width: 300, outline: "none" }}
        />
        <span className={style[bem.e("count")]} style={{ marginLeft: 12 }}>
          共 {routeEntries.length} 条路由
        </span>
      </div>
      <PageList
        columns={columns}
        data={data.slice((page - 1) * pageSize, page * pageSize)}
        rowKey="_path"
        defaultColumnWidth={150}
        total={data.length}
        current={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
        actions={routeActions}
        actionWidth={140}
      />
      <Modal title={`路由详情 - ${viewModal.path || ""}`} visible={viewModal.visible} onClose={() => setViewModal({ visible: false, path: null })} width={680}>
        {viewModal.path && config.routes[viewModal.path] && (() => {
          const rule = config.routes[viewModal.path];
          const authLabel = (rule.require_auth ?? rule.requireAuth) !== false ? "需要登录" : "免登录";
          const roleTags = (rule.allowed_roles || rule.allowedRoles || []);
          const userTags = (rule.allowed_users || rule.allowedUsers || []);
          return (
            <div>
              <div className={style[bem.e("info-section")]}>
                <div className={style[bem.e("info-section-title")]}>基础信息</div>
                <div className={style[bem.e("info-row")]}>
                  <span className={style[bem.e("info-label")]}>路由路径</span>
                  <span className={style[bem.e("info-value")]} style={{ fontFamily: "monospace", fontSize: 13 }}>{viewModal.path}</span>
                </div>
                <div className={style[bem.e("info-row")]}>
                  <span className={style[bem.e("info-label")]}>请求方法</span>
                  <span className={style[bem.e("info-value")]}>{(rule.methods || ["GET"]).join(", ")}</span>
                </div>
                <div className={style[bem.e("info-row")]}>
                  <span className={style[bem.e("info-label")]}>描述</span>
                  <span className={style[bem.e("info-value")]} style={{ fontWeight: 400, color: "#60646c" }}>{rule.description || "无"}</span>
                </div>
              </div>
              <div className={style[bem.e("info-section")]}>
                <div className={style[bem.e("info-section-title")]}>权限设置</div>
                <div className={style[bem.e("info-row")]}>
                  <span className={style[bem.e("info-label")]}>登录验证</span>
                  <span className={style[bem.e("info-value")]}>{authLabel}</span>
                </div>
                <div className={style[bem.e("info-row")]}>
                  <span className={style[bem.e("info-label")]}>允许的角色</span>
                  <span className={style[bem.e("info-value")]} style={{ fontWeight: 400 }}>
                    {roleTags.length > 0
                      ? <div className={style[bem.e("tag-list")]}>{roleTags.map(v => <span key={v} className={style[bem.e("tag")]}>{v}</span>)}</div>
                      : <span style={{ color: "#999", fontSize: 13 }}>无</span>
                    }
                  </span>
                </div>
                <div className={style[bem.e("info-row")]}>
                  <span className={style[bem.e("info-label")]}>允许的用户</span>
                  <span className={style[bem.e("info-value")]} style={{ fontWeight: 400 }}>
                    {userTags.length > 0
                      ? <div className={style[bem.e("tag-list")]}>{userTags.map(v => <span key={v} className={style[bem.e("tag")]}>ID: {v}</span>)}</div>
                      : <span style={{ color: "#999", fontSize: 13 }}>无</span>
                    }
                  </span>
                </div>
              </div>
              <div className={style[bem.e("form-actions")]}>
                <Button type="default" size="small" onClick={() => setViewModal({ visible: false, path: null })}>关闭</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
      <Modal title={`路由权限 - ${editModal.path || ""}`} visible={editModal.visible} onClose={handleRouteModalCancel} width={900} layout="split">
        <div className={style[bem.e("split-left")]}>
          <div className={style[bem.e("split-left-label")]}>路由路径</div>
          <div style={{ fontSize: 13, fontFamily: "monospace", wordBreak: "break-all", marginBottom: 8 }}>{editModal.path}</div>
          <div className={style[bem.e("split-left-tags")]}>
            {localEdit?.require_auth !== false ? (
              <span className={`${style[bem.e("split-left-badge")]} ${style[bem.e("split-left-badge--primary")]}`}>需登录</span>
            ) : (
              <span className={style[bem.e("split-left-badge")]}>免登录</span>
            )}
          </div>
        </div>
        <div className={style[bem.e("split-right")]}>
          <div className={style[bem.e("form-group")]}>
            <label>
              <input type="checkbox" checked={localEdit?.require_auth !== false} onChange={e => setLocalEdit(prev => prev ? { ...prev, require_auth: e.target.checked } : prev)} style={{ marginRight: 6 }} />
              需要登录验证
            </label>
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>允许的角色</label>
            <div className={style[bem.e("tag-list")]}>
              {(localEdit?.allowed_roles || []).map(v => (
                <span key={v} className={style[bem.e("tag")]}>
                  {v}
                  <button className={style[bem.e("tag-remove")]} onClick={() => removeFromRouteLocalEdit("allowed_roles", v)}>&times;</button>
                </span>
              ))}
              <Button type="default" size="small" onClick={() => setRoutePickerModal({ visible: true, field: 'allowed_roles' })}>+ 添加角色</Button>
            </div>
          </div>
          <div className={style[bem.e("form-group")]}>
            <label>允许的用户</label>
            <div className={style[bem.e("tag-list")]}>
              {(localEdit?.allowed_users || []).map(v => (
                <span key={v} className={style[bem.e("tag")]}>
                  ID: {v}
                  <button className={style[bem.e("tag-remove")]} onClick={() => removeFromRouteLocalEdit("allowed_users", v)}>&times;</button>
                </span>
              ))}
              <Button type="default" size="small" onClick={() => setRoutePickerModal({ visible: true, field: 'allowed_users' })}>+ 添加用户</Button>
            </div>
          </div>
          <div className={style[bem.e("form-actions")]}>
            <Button type="default" size="small" onClick={handleRouteModalCancel}>取消</Button>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleRouteModalSave}>保存</Button>
          </div>
        </div>
      </Modal>
      <Modal
        title={routePickerModal.field === 'allowed_users' ? '添加用户' : '添加角色'}
        visible={routePickerModal.visible}
        onClose={() => setRoutePickerModal({ visible: false, field: '' })}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {routePickerModal.field === 'allowed_users' ? (
            <Select
              value=""
              onChange={(val) => { addToRouteLocalEdit('allowed_users', parseInt(val, 10)); }}
              optionsAsync={userOptionsAsync}
              searchable
              placeholder="搜索添加用户..."
              direction="bottom"
              size="small"
            />
          ) : (
            <Select
              value=""
              onChange={(val) => { addToRouteLocalEdit(routePickerModal.field, val); }}
              options={roleOptions}
              placeholder="选择角色..."
              direction="bottom"
              size="small"
            />
          )}
          <div className={style[bem.e("tag-list")]}>
            {(localEdit?.[routePickerModal.field] || []).map(v => (
              <span key={v} className={style[bem.e("tag")]}>
                {routePickerModal.field === 'allowed_users' ? `ID: ${v}` : v}
                <button className={style[bem.e("tag-remove")]} onClick={() => removeFromRouteLocalEdit(routePickerModal.field, v)}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <Button type="primary" size="small" onClick={() => setRoutePickerModal({ visible: false, field: '' })} style={{ background: "#222", borderColor: "#222" }}>完成</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RoutePermissionPanel;
