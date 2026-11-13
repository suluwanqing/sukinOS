import { useState, useEffect, useCallback } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";

import sysConfigAPI from "@/apis/system/config";

import Button from "@/component/button/layout";
import { Input } from "@/component/input/layout";
import { alert } from "@/component/alert/layout";
import { usePermission } from "@/hooks/usePermission/main";

const bem = createNamespace("app-revision-retention");

const MIN_REVISIONS = 1;
const MAX_REVISIONS = 200;
const FALLBACK_REVISIONS = 20;

const formatTime = (value) => {
  if (!value) return "尚未保存过";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

function RevisionRetention() {
  const { isRoot, hasPermission } = usePermission();
  const canWrite = isRoot && hasPermission("system:config:manage");

  const [maxRevisions, setMaxRevisions] = useState(String(FALLBACK_REVISIONS));
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(() => {
    setLoading(true);
    sysConfigAPI.getRevisionRetention()
      .then(res => {
        if (res?.code !== 200 || !res.data) return;
        setMaxRevisions(String(res.data.maxRevisions ?? FALLBACK_REVISIONS));
        setUpdatedAt(res.data.updatedAt || null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    //端点后端过 RequireRoot，非 root 请求只会拿到 403，不发比发好
    if (!isRoot) return;
    loadConfig();
  }, [isRoot, loadConfig]);

  const handleSave = () => {
    const trimmed = String(maxRevisions).trim();
    const value = Number(trimmed);
    if (!Number.isInteger(value) || value < MIN_REVISIONS || value > MAX_REVISIONS) {
      return alert.warning(`保留数量必须是 ${MIN_REVISIONS}-${MAX_REVISIONS} 之间的整数`);
    }

    setSaving(true);
    sysConfigAPI.updateRevisionRetention({ maxRevisions: value })
      .then(res => {
        if (res?.code !== 200 || !res.data) return;
        setMaxRevisions(String(res.data.maxRevisions));
        setUpdatedAt(res.data.updatedAt || null);
        alert.success(res.message || "保留数量已保存并生效");
      })
      .finally(() => setSaving(false));
  };

  if (!isRoot) {
    return (
      <div className={style[bem.b()]}>
        <div className={style[bem.e("notice")]}>包修订保留设置只能由超级管理员查看和修改，当前账号不是 root。</div>
      </div>
    );
  }

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("head")]}>
        <div>
          <h2 className={style[bem.e("title")]}>APP 包修订保留数量</h2>
          <p className={style[bem.e("desc")]}>
            审核端每次改包重提前都会把旧状态留档，这里决定每个 APP 最多保留多少条历史修订
          </p>
        </div>
        <div className={style[bem.e("head-actions")]}>
          <Button variant="outline" size="sm" onClick={loadConfig} loading={loading}>重新载入</Button>
          {canWrite && (
            <Button variant="dark" size="sm" loading={saving} onClick={handleSave}>保存并生效</Button>
          )}
        </div>
      </div>

      <div className={style[bem.e("notice")]}>
        重提成功后按资源保留最新 N 条修订，更旧的修订行会被删除；对应物理包只有在不再被当前行与剩余修订引用时才会一并清理。
        合法范围 {MIN_REVISIONS}-{MAX_REVISIONS}，0 既不是「不保留」也不是「无限」，它就是一个无效值。
      </div>

      <div className={style[bem.e("card")]}>
        <div className={style[bem.e("card-head")]}>
          <div className={style[bem.e("card-title")]}>每个 APP 保留修订数</div>
          <p className={style[bem.e("card-desc")]}>默认 {FALLBACK_REVISIONS} 条，改小之后下一次重提就会按新值剪枝</p>
        </div>
        <div className={style[bem.e("row")]}>
          <div className={style[bem.e("number-input")]}>
            <Input
              size="small"
              style={{ width: 110 }}
              type="number"
              min={MIN_REVISIONS}
              max={MAX_REVISIONS}
              step={1}
              value={maxRevisions}
              disabled={!canWrite}
              onChange={e => setMaxRevisions(e.target.value)}
              placeholder={`${MIN_REVISIONS}-${MAX_REVISIONS}`}
            />
            <span className={style[bem.e("unit")]}>条 / APP</span>
          </div>
          <div className={style[bem.e("meta")]}>
            最后更新：{formatTime(updatedAt)}
          </div>
        </div>
      </div>

      {!canWrite && (
        <div className={style[bem.e("notice")]}>
          缺少 system:config:manage 权限位，只给看不给改。这两个端点在后端只认 root，这个权限位只是界面上的第二道确认。
        </div>
      )}
    </div>
  );
}

export default RevisionRetention;
