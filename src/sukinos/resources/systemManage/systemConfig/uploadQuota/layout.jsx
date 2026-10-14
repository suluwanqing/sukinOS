import { useState, useEffect, useRef, useCallback } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";

import sysConfigAPI from "@/apis/system/config";
import permissionManageAPI from "@/apis/system/permissionManage";
import systemAPI from "@/apis/system/main";

import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { usePermission } from "@/hooks/usePermission/main";

const bem = createNamespace("system-upload-quota");

const MB = 1048576;

// 界面上填 MB，落库是字节。留空表示「这一档不配」，由后端落到下一档，不是配 0
const mbToBytes = (text) => {
  const num = Number(String(text ?? "").trim());
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * MB);
};

const bytesToMb = (bytes) => (bytes == null ? "" : String(Number((bytes / MB).toFixed(4))));

const formatBytes = (bytes) => (bytes == null ? "未配置" : `${bytes} 字节`);

function UploadQuota() {
  const { isRoot, hasPermission } = usePermission();
  const canWrite = isRoot && hasPermission("system:config:manage");

  const [defaultMb, setDefaultMb] = useState("");
  const [roleRows, setRoleRows] = useState([]);
  const [userRows, setUserRows] = useState([]);
  const [meta, setMeta] = useState({ fallbackBytes: null, viewer: null, unresolvedUserKeys: [] });
  const [roleOptions, setRoleOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRoleId, setNewRoleId] = useState("");
  const [newUserId, setNewUserId] = useState("");

  const userLabelCache = useRef({});

  const loadQuota = useCallback(() => {
    setLoading(true);
    sysConfigAPI.getUploadQuota()
      .then(res => {
        if (res?.code !== 200 || !res.data) return;
        const view = res.data;
        const cfg = view.config || {};
        const labels = view.userLabels || {};
        setDefaultMb(bytesToMb(cfg.defaultMaxSizeBytes));
        setRoleRows(Object.entries(cfg.roleMaxSizeBytes || {}).map(([role, bytes]) => ({
          role,
          mb: bytesToMb(bytes),
        })));
        setUserRows(Object.entries(cfg.userMaxSizeBytes || {}).map(([id, bytes]) => {
          const label = labels[id] || `ID ${id}`;
          userLabelCache.current[id] = label;
          return { id, label, mb: bytesToMb(bytes) };
        }));
        setMeta({
          fallbackBytes: view.fallbackBytes ?? null,
          viewer: view.viewer || null,
          unresolvedUserKeys: view.unresolvedUserKeys || [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // 这两个端点后端都过 RequireRoot，非 root 请求只会拿到 403，不发比发好
    if (!isRoot) return;
    loadQuota();
    permissionManageAPI.getRoleList().then(res => {
      if (res?.code === 200) {
        setRoleOptions((res.data || []).map(r => ({ label: `${r.label}（${r.name}）`, value: r.name })));
      }
    });
  }, [isRoot, loadQuota]);

  const searchUsers = useCallback(({ page, pageSize, searchQuery }) =>
    systemAPI.getUserList({ page, pageSize, keyword: searchQuery || "" })
      .then(res => {
        if (res?.code === 200 && res.data) {
          const items = (res.data.items || []).map(u => {
            const label = `${u.username}（${u.account}）ID:${u.id}`;
            userLabelCache.current[String(u.id)] = label;
            return { label, value: u.id };
          });
          return { items, total: res.data.total };
        }
        return { items: [], total: 0 };
      }), []);

  const addRoleRow = () => {
    if (!newRoleId) return alert.warning("请先选一个角色");
    if (roleRows.some(row => row.role === newRoleId)) return alert.warning("该角色已有档位");
    setRoleRows(prev => [...prev, { role: newRoleId, mb: "" }]);
    setNewRoleId("");
  };

  const addUserRow = () => {
    if (!newUserId) return alert.warning("请先搜索并选择一个账号");
    const id = String(newUserId);
    if (userRows.some(row => row.id === id)) return alert.warning("该账号已有档位");
    setUserRows(prev => [...prev, {
      id,
      label: userLabelCache.current[id] || `ID ${id}`,
      mb: "",
    }]);
    setNewUserId("");
  };

  const patchRow = (setter, index, patch) => {
    setter(prev => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const buildPayload = () => {
    const problems = [];

    const trimmed = String(defaultMb).trim();
    let defaultBytes = null;
    if (trimmed !== "") {
      defaultBytes = mbToBytes(trimmed);
      if (defaultBytes === null) problems.push(`默认档「${trimmed}」不是正数（留空才是回落兜底常量）`);
    }

    const roleMaxSizeBytes = {};
    roleRows.forEach(row => {
      const bytes = mbToBytes(row.mb);
      if (bytes === null) {
        problems.push(`角色 ${row.role} 的上限没填或不是正数`);
        return;
      }
      roleMaxSizeBytes[row.role] = bytes;
    });

    const userMaxSizeBytes = {};
    userRows.forEach(row => {
      const bytes = mbToBytes(row.mb);
      if (bytes === null) {
        problems.push(`账号 ${row.label} 的上限没填或不是正数`);
        return;
      }
      userMaxSizeBytes[row.id] = bytes;
    });

    return { payload: { defaultMaxSizeBytes: defaultBytes, roleMaxSizeBytes, userMaxSizeBytes }, problems };
  };

  const handleSave = () => {
    const { payload, problems } = buildPayload();
    if (problems.length) return alert.warning(problems[0]);

    setSaving(true);
    sysConfigAPI.updateUploadQuota(payload)
      .then(res => {
        if (res?.code !== 200 || !res.data) return;
        const dropped = res.data.dropped || [];
        if (dropped.length) alert.warning(res.message || "已保存，但有项被丢弃");
        else alert.success(res.message || "配额已保存并生效");
        const cfg = res.data.config || {};
        const labels = res.data.userLabels || {};
        setDefaultMb(bytesToMb(cfg.defaultMaxSizeBytes));
        setRoleRows(Object.entries(cfg.roleMaxSizeBytes || {}).map(([role, bytes]) => ({ role, mb: bytesToMb(bytes) })));
        setUserRows(Object.entries(cfg.userMaxSizeBytes || {}).map(([id, bytes]) => ({
          id,
          label: labels[id] || userLabelCache.current[id] || `ID ${id}`,
          mb: bytesToMb(bytes),
        })));
        setMeta(prev => ({
          ...prev,
          viewer: res.data.viewer || prev.viewer,
          unresolvedUserKeys: res.data.unresolvedUserKeys || [],
        }));
      })
      .finally(() => setSaving(false));
  };

  const usedRoleValues = roleRows.map(row => row.role);
  const pickableRoles = roleOptions.filter(opt => !usedRoleValues.includes(opt.value));
  const configuredEmpty = String(defaultMb).trim() === "" && roleRows.length === 0 && userRows.length === 0;

  if (!isRoot) {
    return (
      <div className={style[bem.b()]}>
        <div className={style[bem.e("notice")]}>上传配额只能由超级管理员查看和修改，当前账号不是 root。</div>
      </div>
    );
  }

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("head")]}>
        <div>
          <h2 className={style[bem.e("title")]}>APP 上传体积上限</h2>
          <p className={style[bem.e("desc")]}>
            回落链：指定用户 &gt; 角色 &gt; 全局默认 &gt; 服务端兜底常量。留空的档位视为不配，直接落到下一档
          </p>
        </div>
        <div className={style[bem.e("head-actions")]}>
          <Button type="default" size="medium" onClick={loadQuota} loading={loading}>重新载入</Button>
          {canWrite && (
            <Button type="dark" size="medium" loading={saving} onClick={handleSave}>应用并生效</Button>
          )}
        </div>
      </div>

      <div className={style[bem.e("notice")]}>
        这条上限只在 <code>/sukinos/app/upload</code> 与 <code>/sukinos/app/update</code> 判定；本地开发同步与预览都不经过它。
        量的是出网的 worker 包字节（载荷以原文与预编译双份内联），比界面上的载荷合计大得多，两者不能互相换算。
        0 既不是关闭也不是无限，它就是一个无效值。
      </div>

      <div className={style[bem.e("resolved")]}>
        <span>
          按当前配置解析到你：
          <strong>{meta.viewer ? `${bytesToMb(meta.viewer.bytes) || "—"} MB` : "—"}</strong>
          {meta.viewer && <em className={style[bem.e("tier")]}>命中 {meta.viewer.tier}</em>}
        </span>
        <span>服务端兜底常量：<strong>{formatBytes(meta.fallbackBytes)}</strong></span>
      </div>

      {configuredEmpty && (
        <div className={style[bem.e("warning")]}>
          三档都还没配，现在所有人都走服务端兜底常量；配好之后这里会显示实际生效的那份。
        </div>
      )}

      {meta.unresolvedUserKeys.length > 0 && (
        <div className={style[bem.e("warning")]}>
          用户档里有 {meta.unresolvedUserKeys.length} 个账号在 users 表查不到（ID：
          {meta.unresolvedUserKeys.join("、")}），这些档位仍然生效，只是显示不出账号名。
        </div>
      )}

      <div className={style[bem.e("card")]}>
        <div className={style[bem.e("card-head")]}>
          <div className={style[bem.e("card-title")]}>全局默认档</div>
          <p className={style[bem.e("card-desc")]}>所有没被用户档、角色档命中的账号都用它</p>
        </div>
        <div className={style[bem.e("row")]}>
          <div className={style[bem.e("row-label")]}>默认</div>
          <div className={style[bem.e("mb-input")]}>
            <input
              type="number"
              min="0"
              step="0.1"
              value={defaultMb}
              disabled={!canWrite}
              onChange={e => setDefaultMb(e.target.value)}
              placeholder="留空即不配"
            />
            <span className={style[bem.e("unit")]}>MB</span>
          </div>
          <div className={style[bem.e("bytes")]}>{formatBytes(mbToBytes(defaultMb))}</div>
        </div>
      </div>

      <div className={style[bem.e("card")]}>
        <div className={style[bem.e("card-head")]}>
          <div className={style[bem.e("card-title")]}>按角色分配</div>
          <p className={style[bem.e("card-desc")]}>
            root 账号固定按归一后的 root 档判定，不看 permission.role；没列出的角色走默认档
          </p>
        </div>

        {roleRows.length === 0 && <div className={style[bem.e("empty")]}>还没有角色档，所有角色都走默认档</div>}
        {roleRows.map((row, idx) => (
          <div key={row.role} className={style[bem.e("row")]}>
            <div className={style[bem.e("row-label")]}>{row.role}</div>
            <div className={style[bem.e("mb-input")]}>
              <input
                type="number"
                min="0"
                step="0.1"
                value={row.mb}
                disabled={!canWrite}
                onChange={e => patchRow(setRoleRows, idx, { mb: e.target.value })}
                placeholder="留空即不配"
              />
              <span className={style[bem.e("unit")]}>MB</span>
            </div>
            <div className={style[bem.e("bytes")]}>{formatBytes(mbToBytes(row.mb))}</div>
            {canWrite && (
              <button className={style[bem.e("btn-remove")]} onClick={() => setRoleRows(prev => prev.filter((_, i) => i !== idx))}>
                删除
              </button>
            )}
          </div>
        ))}

        {canWrite && (
          <div className={style[bem.e("adder")]}>
            <Select
              value={newRoleId}
              onChange={setNewRoleId}
              options={pickableRoles}
              placeholder="选择角色..."
              direction="bottom"
              size="small"
            />
            <Button type="dark" plain size="small" onClick={addRoleRow}>加入角色档</Button>
          </div>
        )}
      </div>

      <div className={style[bem.e("card")]}>
        <div className={style[bem.e("card-head")]}>
          <div className={style[bem.e("card-title")]}>按指定账号分配</div>
          <p className={style[bem.e("card-desc")]}>优先级最高，会盖掉该账号的角色档与默认档；给 root 账号配也一样生效</p>
        </div>

        {userRows.length === 0 && <div className={style[bem.e("empty")]}>还没有用户档</div>}
        {userRows.map((row, idx) => (
          <div key={row.id} className={style[bem.e("row")]}>
            <div className={style[bem.e("row-label")]} title={`用户 ID ${row.id}`}>{row.label}</div>
            <div className={style[bem.e("mb-input")]}>
              <input
                type="number"
                min="0"
                step="0.1"
                value={row.mb}
                disabled={!canWrite}
                onChange={e => patchRow(setUserRows, idx, { mb: e.target.value })}
                placeholder="留空即不配"
              />
              <span className={style[bem.e("unit")]}>MB</span>
            </div>
            <div className={style[bem.e("bytes")]}>{formatBytes(mbToBytes(row.mb))}</div>
            {canWrite && (
              <button className={style[bem.e("btn-remove")]} onClick={() => setUserRows(prev => prev.filter((_, i) => i !== idx))}>
                删除
              </button>
            )}
          </div>
        ))}

        {canWrite && (
          <div className={style[bem.e("adder")]}>
            <Select
              value={newUserId}
              onChange={setNewUserId}
              optionsAsync={searchUsers}
              searchable
              placeholder="搜索账号..."
              direction="bottom"
              size="small"
            />
            <Button type="dark" plain size="small" onClick={addUserRow}>加入用户档</Button>
          </div>
        )}
      </div>

      {!canWrite && (
        <div className={style[bem.e("notice")]}>
          缺少 system:config:manage 权限位，只给看不给改。需要说明的是：这两个端点在后端只认 root，
          这个权限位只是界面上的第二道确认。
        </div>
      )}
    </div>
  );
}

export default UploadQuota;
