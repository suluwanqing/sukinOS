import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  CodeXml,
  FileDown,
  History,
  RefreshCw,
  RotateCcw,
  Trash2,
  Undo2,
  X
} from "lucide-react";

import Button from "@/component/button/layout";
import Modal from "@/component/modal/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";
import { createNamespace } from "/utils/js/classcreate";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import { safeNameSegment } from "@/sukinos/utils/process/workerFiles";
import PackageInspector from "./PackageInspector";
import style from "./style.module.css";

const bem = createNamespace("system-app");

const STATUS_LABEL = {
  active: "正常上架",
  disabled: "禁用下架",
  under_review: "审核中"
};

const SOURCE_LABEL = {
  developer: "开发者上传",
  reviewer: "审核端改包",
  meta: "元数据变更",
  system: "系统",
  migrate: "历史迁移"
};

const fmtBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const fmtTime = (val) => {
  if (!val) return "-";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const saveBlob = (blob, filename) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};

const readBlobError = async (blob) => {
  try {
    const body = JSON.parse(await blob.text());
    return body?.message || "下载失败";
  } catch {
    return "下载失败：响应不是应用包";
  }
};

const statusTone = (item) => {
  if (item.isPending) return "pending";
  if (item.isDeleted) return "deleted";
  if (item.status === "active") return "active";
  if (item.status === "under_review") return "review";
  return "disabled";
};

function VersionRow({ item, busy, rollbackBlocked, onInspect, onDownload, onActivate, onDelete, onRestore }) {
  const canActivate = !item.isPending && !item.isDeleted && item.fileExists && !item.fileEmpty;
  const canDelete = !item.isPending && !item.isDeleted;
  const canRestore = item.isDeleted && !item.filePurged && item.fileExists && !item.fileEmpty;
  const locked = !item.filePurged && !item.fileExists;

  return (
    <div className={style[bem.e("version-row")]}>
      <div className={style[bem.e("version-main")]}>
        <div className={style[bem.e("version-head")]}>
          <strong>v{item.version}</strong>
          <span className={style[bem.e("version-status")]} data-tone={statusTone(item)}>
            {item.isPending ? "待审" : item.isDeleted ? "已删除" : STATUS_LABEL[item.status] || item.status}
          </span>
          {item.filePurged && <span data-tone="purged" className={style[bem.e("version-status")]}>文件已清除</span>}
          {!item.filePurged && !item.fileExists && <span data-tone="purged" className={style[bem.e("version-status")]}>文件缺失</span>}
          {!item.filePurged && item.fileEmpty && <span data-tone="purged" className={style[bem.e("version-status")]}>空包不可用</span>}
        </div>
        <div className={style[bem.e("version-meta")]}>
          {SOURCE_LABEL[item.source] || item.source || "未知来源"} · {fmtTime(item.createdAt)}
          {item.size ? ` · ${fmtBytes(item.size)}` : ""}
          {item.operatorId ? ` · 操作者 ${item.operatorId}` : ""}
        </div>
        {item.diffNote && <div className={style[bem.e("version-note")]}>{item.diffNote}</div>}
        {item.auditOpinion && <div className={style[bem.e("version-note")]}>{item.auditOpinion}</div>}
        <div className={style[bem.e("version-file")]} title={item.fileName || ""}>
          {item.fileName || "-"}
        </div>
      </div>
      <div className={style[bem.e("version-ops")]}>
        {canActivate && (
          <Button
            variant="outline"
            size="xs"
            icon={<RotateCcw size={12} />}
            disabled={rollbackBlocked}
            title={rollbackBlocked ? "请先驳回待审版本" : ""}
            onClick={() => onActivate(item)}
          >
            回滚到此版本
          </Button>
        )}
        {canRestore && (
          <Button
            variant="outline"
            size="xs"
            icon={<Undo2 size={12} />}
            loading={busy === `restore-${item.revisionId}`}
            onClick={() => onRestore(item)}
          >
            恢复
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={() => onDelete(item)}>
            删除
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          icon={<CodeXml size={12} />}
          disabled={locked}
          loading={busy === `inspect-${item.revisionId}`}
          onClick={() => onInspect(item)}
        >
          包检查
        </Button>
        <Button
          variant="ghost"
          size="xs"
          icon={<FileDown size={12} />}
          disabled={locked}
          loading={busy === `download-${item.revisionId}`}
          onClick={() => onDownload(item)}
        >
          下载
        </Button>
      </div>
    </div>
  );
}

export default function VersionPanel({ resourceId, onChanged, refreshSignal = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [busy, setBusy] = useState("");
  const [forceBusy, setForceBusy] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionOpinion, setDecisionOpinion] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [purgeFile, setPurgeFile] = useState(false);
  const [inspectorRow, setInspectorRow] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return sukinosAppManageAPI.getAppVersions({ resourceId, includeDeleted: true })
      .then(res => {
        if (res?.code === 200) {
          setData(res.data);
        } else {
          setError(res?.message || "获取版本列表失败");
        }
      })
      .catch(e => setError(e?.message || "获取版本列表失败"))
      .finally(() => setLoading(false));
  }, [resourceId]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const current = data?.current || null;
  //下架应用审批通过只换版本，不顺带上架
  const keepsDelisted = current?.status === "disabled";
  const items = useMemo(() => data?.items || [], [data]);
  const pendingItem = useMemo(() => items.find(item => item.isPending) || null, [items]);
  const historyItems = useMemo(
    () => items.filter(item => !item.isPending && (showDeleted || !item.isDeleted)),
    [items, showDeleted]
  );
  const deletedCount = useMemo(() => items.filter(item => item.isDeleted).length, [items]);

  const afterMutation = (message) => {
    if (message) alert.success(message);
    load();
    onChanged?.();
  };

  const toggleForceUpdate = (current) => {
    if (!current) return;
    const next = !current.forceUpdate;
    confirm.show({
      title: next ? "标记强制更新" : "取消强制更新",
      content: next
        ? `标记后，所有低于 v${current.version} 的已安装客户端在下次冷启动时会被拦截并要求更新。`
        : "取消后，旧版本客户端可以继续使用。",
      confirmText: next ? "标记" : "取消标记",
      onConfirm: async () => {
        setForceBusy(true);
        try {
          const res = await sukinosAppManageAPI.setAppForceUpdate({
            resourceId,
            forceUpdate: next
          });
          if (res?.code === 200) {
            afterMutation(next ? "已标记强制更新" : "已取消强制更新");
          } else {
            alert.failure(res?.message || "操作失败");
          }
        } catch (e) {
          alert.failure(e?.message || "操作失败");
        } finally {
          setForceBusy(false);
        }
      }
    });
  };

  const download = async (item) => {
    setBusy(`download-${item.revisionId}`);
    try {
      const res = await sukinosAppManageAPI.downloadAppPackage({
        resourceId,
        revisionId: item.revisionId || undefined
      });
      if (res instanceof Blob) {
        if (res.type.includes("json")) {
          alert.failure(await readBlobError(res));
          return;
        }
        const ext = /\.[^.]+$/.exec(item.fileName || "")?.[0] || ".js";
        saveBlob(res, `${safeNameSegment(`${item.appName || "app"}-v${item.version}`)}${ext}`);
      } else {
        alert.failure(res?.message || "下载失败");
      }
    } catch (e) {
      alert.failure(e?.message || "下载失败");
    } finally {
      setBusy("");
    }
  };

  const inspect = async (item) => {
    setBusy(`inspect-${item.revisionId}`);
    try {
      let metaInfo = null;
      if (item.revisionId) {
        const res = await sukinosAppManageAPI.getAppVersionDetail({ resourceId, revisionId: item.revisionId });
        if (res?.code !== 200) {
          alert.failure(res?.message || "获取版本详情失败");
          return;
        }
        metaInfo = res.data?.metaInfo || null;
      }
      setInspectorRow({
        resourceId,
        revisionId: item.revisionId || undefined,
        appName: item.appName,
        version: item.version,
        fileName: item.fileName,
        size: item.size,
        metaInfo,
        replaceExisting: Boolean(item.isPending)
      });
    } finally {
      setBusy("");
    }
  };

  const openDecision = (type, item) => {
    setDecision({ type, item });
    setDecisionOpinion(item.auditOpinion || "");
  };

  const submitDecision = async () => {
    if (!decision) return;
    const { type, item } = decision;
    setBusy(`decision-${type}`);
    try {
      const payload = {
        resourceId,
        revisionId: item.revisionId,
        auditOpinion: decisionOpinion || undefined
      };
      const res = type === "approve"
        ? await sukinosAppManageAPI.approveAppVersion(payload)
        : type === "reject"
          ? await sukinosAppManageAPI.rejectAppVersion(payload)
          : await sukinosAppManageAPI.activateAppVersion(payload);
      if (res?.code === 200) {
        setDecision(null);
        afterMutation(res.message || (
          type === "approve" ? (keepsDelisted ? `v${item.version} 已通过，应用保持下架` : `v${item.version} 已上线`)
            : type === "reject" ? `v${item.version} 已驳回`
              : `已回滚到 v${item.version}${res.data?.forceUpdate ? "，旧客户端会收到强制更新" : ""}`
        ));
      } else {
        alert.failure(res?.message || "操作失败");
      }
    } catch (e) {
      alert.failure(e?.message || "操作失败");
    } finally {
      setBusy("");
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setBusy("delete");
    try {
      const res = await sukinosAppManageAPI.deleteAppVersion({
        resourceId,
        revisionId: deleteTarget.revisionId,
        purgeFile
      });
      if (res?.code === 200) {
        setDeleteTarget(null);
        setPurgeFile(false);
        afterMutation(res.message || `v${deleteTarget.version} 已逻辑删除`);
      } else {
        alert.failure(res?.message || "删除失败");
      }
    } catch (e) {
      alert.failure(e?.message || "删除失败");
    } finally {
      setBusy("");
    }
  };

  const handleRestore = async (item) => {
    setBusy(`restore-${item.revisionId}`);
    try {
      const res = await sukinosAppManageAPI.restoreAppVersion({ resourceId, revisionId: item.revisionId });
      if (res?.code === 200) {
        afterMutation(res.message || `v${item.version} 已恢复`);
      } else {
        alert.failure(res?.message || "恢复失败");
      }
    } catch (e) {
      alert.failure(e?.message || "恢复失败");
    } finally {
      setBusy("");
    }
  };

  const decisionTitle = decision
    ? (decision.type === "approve" ? (keepsDelisted ? "审核通过（保持下架）" : "审核通过并上线")
      : decision.type === "reject" ? "驳回待审版本"
        : "回滚到历史版本")
    : "";

  return (
    <div className={style[bem.e("version-panel")]}>
      <div className={style[bem.e("version-panel-head")]}>
        <span className={style[bem.e("version-panel-title")]}>
          <History size={14} /> 版本管理与上线决策
        </span>
        <Button variant="ghost" size="xs" loading={loading} onClick={() => load()}>刷新</Button>
      </div>

      {loading && !data && (
        <div className={style[bem.e("center")]}>
          <span className={style[bem.e("spinner")]} />
        </div>
      )}

      {!loading && error && <p className={style[bem.e("code-text")]}>{error}</p>}

      {current && (
        <div className={style[bem.e("version-card")]}>
          <div className={style[bem.e("version-card-head")]}>
            <span className={style[bem.e("version-card-title")]}>当前可用版本</span>
            <span className={style[bem.e("version-status")]} data-tone={statusTone(current)}>
              {STATUS_LABEL[current.status] || current.status}
            </span>
            {current.forceUpdate && (
              <span className={style[bem.e("version-status")]} data-tone="forced">强制更新</span>
            )}
          </div>
          <div className={style[bem.e("version-meta")]}>
            v{current.version} · {SOURCE_LABEL[current.source] || current.source || "未知来源"} · {fmtTime(current.createdAt)}
            {current.size ? ` · ${fmtBytes(current.size)}` : ""}
          </div>
          {current.auditOpinion && <div className={style[bem.e("version-note")]}>{current.auditOpinion}</div>}
          {current.forceUpdate && (
            <div className={style[bem.e("version-note")]}>
              低于 v{current.version} 的已安装客户端冷启动会被拦截，并要求更新到当前版本
            </div>
          )}
          {current.fileEmpty && (
            <div className={style[bem.e("version-danger")]}>
              <AlertTriangle size={13} />当前版本是 0 字节空包，无法安装；请让开发者重新提交并通过审核
            </div>
          )}
          <div className={style[bem.e("version-ops")]}>
            <Button
              variant="ghost"
              size="xs"
              icon={<CodeXml size={12} />}
              loading={busy === "inspect-undefined"}
              onClick={() => inspect(current)}
            >
              包检查
            </Button>
            <Button
              variant="ghost"
              size="xs"
              icon={<FileDown size={12} />}
              loading={busy === "download-undefined"}
              onClick={() => download(current)}
            >
              下载当前包
            </Button>
            {(current.forceUpdate
              || (current.status === "active" && current.fileExists && !current.fileEmpty)) && (
              <Button
                variant={current.forceUpdate ? "ghost" : "outline"}
                size="xs"
                icon={<RefreshCw size={12} />}
                loading={forceBusy}
                onClick={() => toggleForceUpdate(current)}
              >
                {current.forceUpdate ? "取消强制更新" : "标记强制更新"}
              </Button>
            )}
          </div>
        </div>
      )}

      {pendingItem && (
        <div className={style[bem.e("version-card")]} data-tone="pending">
          <div className={style[bem.e("version-card-head")]}>
            <span className={style[bem.e("version-card-title")]}>
              <Clock3 size={13} /> 待审版本 v{pendingItem.version}
            </span>
            <span className={style[bem.e("version-status")]} data-tone="pending">线上版本保持可用</span>
          </div>
          <div className={style[bem.e("version-meta")]}>
            {SOURCE_LABEL[pendingItem.source] || pendingItem.source || "未知来源"} · {fmtTime(pendingItem.createdAt)}
            {pendingItem.size ? ` · ${fmtBytes(pendingItem.size)}` : ""}
          </div>
          {pendingItem.diffNote && <div className={style[bem.e("version-note")]}>{pendingItem.diffNote}</div>}
          {!pendingItem.fileExists && (
            <div className={style[bem.e("version-danger")]}>
              <AlertTriangle size={13} />待审版本的物理包缺失，无法通过审核
            </div>
          )}
          {pendingItem.fileExists && pendingItem.fileEmpty && (
            <div className={style[bem.e("version-danger")]}>
              <AlertTriangle size={13} />待审版本是 0 字节空包，无法通过审核，请让开发者重新提交
            </div>
          )}
          <div className={style[bem.e("version-note")]}>
            存在待审版本时无法回滚历史版本，请先驳回待审版本
          </div>
          <div className={style[bem.e("version-ops")]}>
            <Button
              variant="default"
              size="xs"
              icon={<Check size={12} />}
              disabled={!pendingItem.fileExists || pendingItem.fileEmpty}
              onClick={() => openDecision("approve", pendingItem)}
            >
              通过并上线
            </Button>
            <Button
              variant="outline"
              size="xs"
              icon={<X size={12} />}
              onClick={() => openDecision("reject", pendingItem)}
            >
              驳回
            </Button>
            <Button
              variant="ghost"
              size="xs"
              icon={<CodeXml size={12} />}
              loading={busy === `inspect-${pendingItem.revisionId}`}
              onClick={() => inspect(pendingItem)}
            >
              包检查
            </Button>
            <Button
              variant="ghost"
              size="xs"
              icon={<FileDown size={12} />}
              loading={busy === `download-${pendingItem.revisionId}`}
              onClick={() => download(pendingItem)}
            >
              下载
            </Button>
          </div>
        </div>
      )}

      <div className={style[bem.e("version-history-head")]}>
        <span>历史版本 · {historyItems.length}</span>
        <Button
          variant={showDeleted ? "outline" : "ghost"}
          size="xs"
          onClick={() => setShowDeleted(prev => !prev)}
        >
          {showDeleted ? "隐藏已删除" : `显示已删除${deletedCount ? ` (${deletedCount})` : ""}`}
        </Button>
      </div>

      {historyItems.length === 0 ? (
        <div className={style[bem.e("version-empty")]}>暂无历史版本</div>
      ) : (
        <div className={style[bem.e("version-list")]}>
          {historyItems.map(item => (
            <VersionRow
              key={item.revisionId}
              item={item}
              busy={busy}
              rollbackBlocked={!!pendingItem}
              onInspect={inspect}
              onDownload={download}
              onActivate={(row) => openDecision("activate", row)}
              onDelete={(row) => {
                setDeleteTarget(row);
                setPurgeFile(false);
              }}
              onRestore={handleRestore}
            />
          ))}
        </div>
      )}

      <Modal
        title={decisionTitle}
        visible={Boolean(decision)}
        onClose={() => setDecision(null)}
        width={520}
      >
        {decision && (
          <>
            <p className={style[bem.e("version-dialog-line")]}>
              {decision.type === "approve" && (keepsDelisted
                ? `v${decision.item.version} 通过后替换当前版本；应用当前为下架状态，通过后仍保持下架，商店不会分发。`
                : `v${decision.item.version} 通过后立即替换当前线上版本，旧版本转入历史留档。`)}
              {decision.type === "reject" && `v${decision.item.version} 将被标记为禁用并移出待审，线上版本不受影响。`}
              {decision.type === "activate" && `当前线上 v${current?.version ?? "-"} 转入历史，v${decision.item.version} 重新成为唯一可用版本。`
                + (keepsDelisted ? "应用当前为下架状态，回滚后仍保持下架，商店不会分发。" : "")}
            </p>
            {decision.type === "activate" && (
              <p className={style[bem.e("version-warning")]}>
                <AlertTriangle size={13} />
                回滚到更低版本会标记强制更新，已安装更高版本的客户端会被要求重建。
              </p>
            )}
            <div className={style[bem.e("form-item")]}>
              <label>{decision.type === "reject" ? "驳回原因" : "审核意见 / 变更说明"}</label>
              <textarea
                className={style[bem.e("input-textarea")]}
                style={{ minHeight: 88 }}
                value={decisionOpinion}
                onChange={e => setDecisionOpinion(e.target.value)}
                placeholder={decision.type === "reject" ? "说明驳回原因，将回显给上传开发者" : "可选，将记录在版本快照上"}
              />
            </div>
            <div className={style[bem.e("audit-actions")]} style={{ marginTop: 12 }}>
              <Button variant="outline" size="sm" onClick={() => setDecision(null)}>取消</Button>
              <Button variant="default" size="sm" loading={busy.startsWith("decision-")} onClick={submitDecision}>
                {decision.type === "approve" ? "确认通过" : decision.type === "reject" ? "确认驳回" : "确认回滚"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        title="删除历史版本"
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        width={520}
      >
        {deleteTarget && (
          <>
            <p className={style[bem.e("version-dialog-line")]}>
              将 v{deleteTarget.version} 标记为已删除：版本记录保留，可随时恢复；物理文件默认留在磁盘上。
            </p>
            <label className={style[bem.e("version-check")]}>
              <input
                type="checkbox"
                checked={purgeFile}
                onChange={e => setPurgeFile(e.target.checked)}
              />
              同时删除物理文件（不可恢复；仍被其他版本引用时会被拒绝）
            </label>
            {purgeFile && (
              <p className={style[bem.e("version-warning")]}>
                <AlertTriangle size={13} />
                勾选后该包文件会从磁盘移除，之后无法再恢复这个版本。
              </p>
            )}
            <div className={style[bem.e("audit-actions")]} style={{ marginTop: 12 }}>
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
              <Button variant="default" size="sm" loading={busy === "delete"} onClick={submitDelete}>
                {purgeFile ? "删除并清除文件" : "确认删除"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {inspectorRow && (
        <PackageInspector
          row={inspectorRow}
          onClose={() => setInspectorRow(null)}
          onSubmitted={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
