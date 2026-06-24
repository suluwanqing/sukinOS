import { useState, useEffect } from "react";
import style from "../style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import Button from "@/component/button/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import Select from "@/component/select/drowSelection/layout";
import PageList from "@/component/list/pageList/layout";
import Modal from "@/component/modal/layout";
import DeleteIcon from "@mui/icons-material/Delete";

const bem = createNamespace("system-permission");

const TYPE_LABELS = {
  publicPaths: "完全公开路径",
  publicPrefixes: "公开前缀",
  selfPrefixes: "强制 root 路由",
};

const TYPE_HINTS = {
  publicPaths: "无需登录，精确匹配",
  publicPrefixes: "无需登录，前缀匹配",
  selfPrefixes: "仅 root 可访问，不受权限配置影响",
};

function MiddlewareWhitelistPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newType, setNewType] = useState("publicPaths");
  const [routeOptionsCache, setRouteOptionsCache] = useState(null);

  useEffect(() => { fetchConfig(); }, []);

  const getRouteOptions = async () => {
    if (routeOptionsCache) return routeOptionsCache;
    const res = await permissionManageAPI.getRoutePermissions();
    if (res.code !== 200) return { items: [], total: 0 };
    const allPaths = Object.keys(res.data?.routes || {});
    const items = allPaths.map(p => ({ label: p, value: p }));
    const cache = { items, total: items.length };
    setRouteOptionsCache(cache);
    return cache;
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await permissionManageAPI.getMiddlewareWhitelist();
      if (res.code === 200) setConfig(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async (updated) => {
    try {
      const res = await permissionManageAPI.updateMiddlewareWhitelist(updated);
      if (res.code === 200) {
        alert.success(res.message || "白名单已更新");
        setConfig(updated);
        return true;
      }
      alert.failure(res.message || "更新失败");
    } catch (e) { alert.failure(e?.message || "更新失败"); }
    return false;
  };

  const handleAdd = async () => {
    const path = newPath.trim();
    if (!path) return;
    const list = [...(config?.[newType] || [])];
    if (list.includes(path)) { alert.failure("该路径已存在"); return; }
    list.push(path);
    const ok = await save({ ...config, [newType]: list });
    if (ok) { setAddModal(false); setNewPath(""); }
  };

  const handleRemove = (field, val) => {
    confirm.show({
      title: "确认移除",
      content: `确定移除路径 "${val}" 吗？`,
      onConfirm: async () => {
        const list = (config?.[field] || []).filter(v => v !== val);
        await save({ ...config, [field]: list });
      }
    });
  };

  const flatData = [];
  if (config) {
    for (const field of ["publicPaths", "publicPrefixes", "selfPrefixes"]) {
      for (const path of (config[field] || [])) {
        flatData.push({ path, type: field, typeLabel: TYPE_LABELS[field], hint: TYPE_HINTS[field] });
      }
    }
  }

  const columns = [
    { prop: "path", label: "路径", width: 400,
      render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{r.path}</span>,
    },
    { prop: "typeLabel", label: "类型", width: 160,
      render: (r) => (
        <span style={{ fontSize: 12, color: "#60646c" }}>
          {r.typeLabel}
          <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>({r.hint})</span>
        </span>
      ),
    },
  ];

  const actions = [
    {
      label: "移除",
      icon: <DeleteIcon style={{ color: "#f43f5e" }} />,
      onClick: (r) => handleRemove(r.type, r.path),
    },
  ];

  return (
    <div className={style[bem.e("section")]}>
      <div className={style[bem.e("section-header")]}>
        <h3>中间件路由白名单</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={() => { setNewPath(""); setNewType("publicPaths"); setAddModal(true); }}>添加路径</Button>
          <Button type="default" size="small" onClick={fetchConfig} loading={loading}>刷新</Button>
        </div>
      </div>
      <p className={style[bem.e("desc")]}>
        仅 root 可操作。白名单中的路径不受路由权限中间件检查(在middleWare之前的一层)。完全公开路径对所有人放行，公开前缀放行所有匹配路径，强制 root 路由仅 root 可访问。
      </p>
      <PageList
        columns={columns}
        data={flatData}
        rowKey={(r) => r.type + r.path}
        defaultColumnWidth={200}
        total={flatData.length}
        actions={actions}
        actionWidth={80}
      />

      <Modal
        title="添加白名单路径"
        visible={addModal}
        onClose={() => setAddModal(false)}
        width={600}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 180 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#171717", marginBottom: 4 }}>类型</label>
            <Select
              value={newType}
              onChange={setNewType}
              options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ label: v, value: k }))}
              direction="bottom"
              size="small"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#171717", marginBottom: 4 }}>路径</label>
            <Select
              value={newPath}
              onChange={setNewPath}
              optionsAsync={({ searchQuery }) => getRouteOptions().then(r => ({
                ...r,
                items: searchQuery
                  ? r.items.filter(i => i.value.toLowerCase().includes(searchQuery.toLowerCase()))
                  : r.items,
              }))}
              searchable
              placeholder="搜索或输入路径..."
              direction="bottom"
              size="small"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Button type="default" size="small" onClick={() => setAddModal(false)}>取消</Button>
            <Button type="primary" size="small" style={{ background: "#222", borderColor: "#222" }} onClick={handleAdd}>添加</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MiddlewareWhitelistPanel;
