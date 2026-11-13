import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { init, use } from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import PageList from "@/component/list/pageList/layout";
import Button from "@/component/button/layout";
import { Input } from "@/component/input/layout";
import Modal from "@/component/modal/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";

import { Search as SearchIcon, Eye as VisibilityIcon, Trash2 as DeleteIcon, CircleCheck as CheckCircleOutlineIcon, CircleAlert as ErrorOutlineIcon, MessageSquareText as RateReviewIcon, Settings2 as AppSettingsAltIcon, RefreshCw as RefreshIcon, FileDown as FileDownloadIcon, CodeXml as CodeIcon, HardDrive as HardDriveIcon } from 'lucide-react';

import useDebounce from "@/sukinos/hooks/useDebounce";
import useThrottle from "@/sukinos/hooks/useThrottle";
import { usePermission } from "@/hooks/usePermission/main";
import { buildWorkerFileTree, safeNameSegment, splitDataUrl } from "@/sukinos/utils/process/workerFiles";
import PackageInspector from "./PackageInspector";
import VersionPanel from "./VersionPanel";
import FileManagerModal from "./FileManagerModal";

use([
  PieChart,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer
]);

const bem = createNamespace("system-app");

const STATUS_FILTER_OPTIONS = [
  { label: "全部状态", value: "" },
  { label: "正常上架", value: "active" },
  { label: "禁用下架", value: "disabled" },
  { label: "审核中", value: "under_review" }
];

const AUDIT_STATUS_OPTIONS = [
  { label: "正常上架 (Active)", value: "active" },
  { label: "禁用下架 (Disabled)", value: "disabled" },
  { label: "审核中 (Under Review)", value: "under_review" }
];

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

function useChart(ref, option, deps) {
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) chartRef.current = init(ref.current);
    if (option) chartRef.current.setOption(option, true);
    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, deps);
  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className={[style[bem.e("stat-card")], style[bem.em("stat-card", tone)]].join(" ")}>
      <div className={style[bem.e("stat-icon")]}>{icon}</div>
      <div className={style[bem.e("stat-body")]}>
        <div className={style[bem.e("stat-label")]}>{label}</div>
        <div className={style[bem.e("stat-value")]}>{value ?? 0}</div>
      </div>
    </div>
  );
}

function AppDetailAndAuditModal({ resourceId, onClose, onRefresh }) {
  const { isRoot } = usePermission();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 审核暂存状态
  const [targetStatus, setTargetStatus] = useState("");
  const [auditOpinion, setAuditOpinion] = useState("");
  const [forceBusy, setForceBusy] = useState(false);
  const [metaEditVisible, setMetaEditVisible] = useState(false);
  const [metaEditValue, setMetaEditValue] = useState("");
  const [metaViewVisible, setMetaViewVisible] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [versionSignal, setVersionSignal] = useState(0);

  const loadDetail = (silent = false) => {
    if (!silent) setLoading(true);
    sukinosAppManageAPI.getSystemAppDetail({ resourceId })
      .then(res => {
        if (res?.code === 200) {
          setDetail(res.data);
          setTargetStatus(res.data.status);
          setAuditOpinion(res.data.auditOpinion || "");
        } else {
          alert.failure(res?.message || "获取详情数据失败");
          onClose();
        }
      })
      .finally(() => setLoading(false));
  };

  const handleVersionChanged = () => {
    loadDetail(true);
    setVersionSignal(signal => signal + 1);
    onRefresh?.();
  };

  useEffect(() => {
    loadDetail();
  }, [resourceId]);

  const handleToggleForceUpdate = () => {
    const next = !detail?.forceUpdate;
    confirm.show({
      title: next ? "标记强制更新" : "取消强制更新",
      content: next
        ? `开启后，所有低于 v${detail.version} 的已安装客户端冷启动会被拦截并提示更新。`
        : "取消后，旧版本客户端可以继续使用，不再被冷启动拦截。",
      onConfirm: async () => {
        setForceBusy(true);
        try {
          const res = await sukinosAppManageAPI.setAppForceUpdate({
            resourceId,
            forceUpdate: next
          });
          if (res?.code === 200) {
            alert.success(next ? "已标记强制更新" : "已取消强制更新");
            loadDetail(true);
            setVersionSignal(signal => signal + 1);
            onRefresh?.();
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

  const handleAuditSubmit = () => {
    setSubmitLoading(true);
    sukinosAppManageAPI.updateAppStatus({
      resourceId,
      status: targetStatus,
      auditOpinion: auditOpinion
    })
      .then(res => {
        if (res?.code === 200) {
          alert.success(res.message || "状态审核更新成功");
          onRefresh();
          onClose();
        } else {
          alert.failure(res?.message || "变更状态失败");
        }
      })
      .finally(() => setSubmitLoading(false));
  };

  return (
    <Modal
      title="应用管理与状态审计中心"
      visible
      onClose={onClose}
      width={760}
    >
      {loading ? (
            <div className={style[bem.e("center")]}>
              <span className={style[bem.e("spinner")]} />
            </div>
          ) : detail && (
            <>
              <div className={style[bem.e("detail-grid")]}>
                <div>
                  <label>应用名称</label>
                  <p>{detail.appName}</p>
                </div>
                <div>
                  <label>当前可用版本</label>
                  <p>
                    v{detail.version}
                    {detail.pendingVersion && (
                      <span className={style[bem.e("version-tag")]} data-tone="pending">
                        待审 v{detail.pendingVersion}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label>所属开发者 ID</label>
                  <p>{detail.userId}</p>
                </div>
                <div>
                  <label>物理包大小</label>
                  <p>{fmtBytes(detail.size)}</p>
                </div>
                <div>
                  <label>发布时间</label>
                  <p>{fmtTime(detail.publishedAt || detail.createdAt || detail.metaInfo?.createdAt)}</p>
                </div>
                <div>
                  <label>创建时间</label>
                  <p>{fmtTime(detail.createdAt || detail.metaInfo?.createdAt)}</p>
                </div>
                <div>
                  <label>版本来源</label>
                  <p>{detail.source || "-"}</p>
                </div>
                <div>
                  <label>资源唯一标识 (ResourceId)</label>
                  <p className={style[bem.e("code-text")]}>{detail.resourceId}</p>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label>应用分发绝对路径</label>
                  <p className={style[bem.e("code-text")]}>{detail.url}</p>
                </div>
              </div>

              <div className={style[bem.e("detail-block")]}>
                <label>元数据 (MetaInfo)
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setMetaViewVisible(true)}
                  >
                    查看
                  </Button>
                  {isRoot && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setMetaEditValue(JSON.stringify(detail.metaInfo || {}, null, 2));
                        setMetaEditVisible(true);
                      }}
                    >
                      编辑
                    </Button>
                  )}
                </label>
                <p className={style[bem.e("inspector-summary")]}>
                  {detail.metaInfo
                    ? `${Object.keys(detail.metaInfo).length} 个字段 · 版本 ${detail.metaInfo.version || "-"} · 入口 ${detail.metaInfo.entries?.view || "-"}`
                    : "无元数据描述"}
                  {" "}长内容已折叠，点击“查看”展开
                </p>
              </div>

              <div className={style[bem.e("audit-actions")]} style={{ justifyContent: "flex-start" }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<CodeIcon size={14} />}
                  onClick={() => setInspectorVisible(true)}
                >
                  查看包内容与预览
                </Button>
              </div>

              <Modal
                title="元数据 (MetaInfo)"
                visible={metaViewVisible}
                onClose={() => setMetaViewVisible(false)}
                width={760}
              >
                <div className={style[bem.e("detail-block")]}>
                  <pre>{detail.metaInfo ? JSON.stringify(detail.metaInfo, null, 2) : "无元数据描述"}</pre>
                </div>
              </Modal>

              {inspectorVisible && (
                <PackageInspector
                  row={{
                    resourceId,
                    appName: detail.appName,
                    version: detail.version,
                    fileName: detail.fileName,
                    size: detail.size,
                    metaInfo: detail.metaInfo
                  }}
                  onClose={() => setInspectorVisible(false)}
                  onSubmitted={handleVersionChanged}
                />
              )}

              <Modal
                title="编辑元数据 (MetaInfo)"
                visible={metaEditVisible}
                onClose={() => setMetaEditVisible(false)}
                width={680}
              >
                <div className={style[bem.e("form-item")]}>
                  <label>JSON 数据</label>
                  <textarea
                    className={style[bem.e("input-textarea")]}
                    value={metaEditValue}
                    onChange={e => setMetaEditValue(e.target.value)}
                    rows={15}
                    placeholder="输入 JSON 格式的元数据"
                  />
                </div>
                <div className={style[bem.e("audit-actions")]} style={{ marginTop: 16 }}>
                  <Button variant="outline" size="sm" onClick={() => setMetaEditVisible(false)}>取消</Button>
                  <Button variant="default" size="sm" onClick={() => {
                    try {
                      const parsed = JSON.parse(metaEditValue);
                      // 元数据改动不碰线上包：有待审就改待审，否则另生成一个待审版本
                      sukinosAppManageAPI.updateAppVersionMeta({
                        resourceId,
                        metaInfo: parsed,
                        note: "管理端修改元数据"
                      }).then(res => {
                        if (res?.code === 200) {
                          alert.success(res.data?.pending
                            ? `元数据已写入待审版本 v${res.data.version}，线上版本保持可用`
                            : "元数据已更新");
                          setMetaEditVisible(false);
                          loadDetail(true);
                          setVersionSignal(signal => signal + 1);
                          onRefresh?.();
                        } else {
                          alert.failure(res?.message || "更新失败");
                        }
                      });
                    } catch {
                      alert.failure("JSON 格式错误");
                    }
                  }}>保存</Button>
                </div>
              </Modal>

              {isRoot && (
                <VersionPanel
                  resourceId={resourceId}
                  refreshSignal={versionSignal}
                  onChanged={handleVersionChanged}
                />
              )}

              {isRoot && (
                <div className={style[bem.e("audit-pane")]}>
                  <div className={style[bem.e("card-head")]} style={{ padding: "0 0 12px 0" }}>当前版本上下架与强制更新</div>
                  <div className={style[bem.e("audit-row")]}>
                    <div className={style[bem.e("filter")]}>
                      <label>调整应用状态</label>
                      <Select
                        size="small"
                        value={targetStatus}
                        onChange={setTargetStatus}
                        options={AUDIT_STATUS_OPTIONS}
                        direction="bottom"
                      />
                    </div>
                  </div>
                  <div className={style[bem.e("audit-force")]}>
                    <label>强制更新</label>
                    <div className={style[bem.e("force-row")]}>
                      <Button
                        variant={detail.forceUpdate ? "ghost" : "outline"}
                        size="sm"
                        loading={forceBusy}
                        disabled={!detail.forceUpdate && detail.status !== "active"}
                        onClick={handleToggleForceUpdate}
                      >
                        {detail.forceUpdate ? "取消强制更新" : "标记强制更新"}
                      </Button>
                      <span className={style[bem.e("force-hint")]}>
                        {detail.forceUpdate
                          ? `已开启：低于 v${detail.version} 的客户端冷启动会被拦截`
                          : detail.status === "active"
                            ? `开启后，低于 v${detail.version} 的已安装客户端会被要求更新`
                            : "仅正常上架应用可标记强制更新"}
                      </span>
                    </div>
                  </div>
                  <div className={style[bem.e("audit-opinion")]}>
                    <label>状态反馈意见 / 下架原因批注</label>
                    <textarea
                      placeholder="请输入对该应用状态变更的反馈或审核原因说明（将向上传开发者进行公开展示）"
                      value={auditOpinion}
                      onChange={e => setAuditOpinion(e.target.value)}
                    />
                  </div>
                  <div className={style[bem.e("audit-actions")]}>
                    <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
                    <Button variant="default" size="sm" loading={submitLoading} onClick={handleAuditSubmit}>
                      应用并更新变更
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
    </Modal>
  );
}

const DOWNLOAD_MODE_OPTIONS = [
  { label: "原始内联包（单文件，逐字无损）", value: "raw" },
  { label: "解析后的源文件（多文件 zip）", value: "parsed" }
];

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

// blob 请求里失败响应同样是 Blob（后端把 code 放 body），只能从内容读出文案
const readBlobError = async (blob) => {
  try {
    const body = JSON.parse(await blob.text());
    return body?.message || "下载失败";
  } catch {
    return "下载失败：响应不是应用包";
  }
};

const VERSION_STATUS_LABEL = {
  active: "正常上架",
  disabled: "禁用下架",
  under_review: "审核中"
};

// 已清除、缺失或 0 字节的包后端也取不回来，直接不进可选列表
const isDownloadableVersion = (item) => (
  !item.filePurged && item.fileExists !== false && !item.fileEmpty
);

function versionOptionLabel(item, tag) {
  const status = item.isCurrent && item.status !== "active"
    ? ` · ${VERSION_STATUS_LABEL[item.status] || item.status}`
    : "";
  return `${tag} v${item.version || "-"}${status}`;
}

function AppDownloadModal({ row, onClose }) {
  const [mode, setMode] = useState("raw");
  const [versions, setVersions] = useState(null);
  const [versionError, setVersionError] = useState("");
  const [versionKey, setVersionKey] = useState("");
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packing, setPacking] = useState(false);
  const [error, setError] = useState("");
  // 每个版本只拉一次，来回切版本不重复发请求
  const cacheRef = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    // 版本列表失败不阻断主流程：退回列表行上的当前版信息
    const fallback = {
      current: {
        revisionId: null,
        resourceId: row.resourceId,
        version: row.version,
        fileName: row.fileName,
        size: row.size,
        status: row.status,
        isCurrent: true,
        filePurged: false,
        fileExists: true,
        fileEmpty: false
      },
      items: []
    };
    sukinosAppManageAPI.getAppVersions({ resourceId: row.resourceId, includeDeleted: true })
      .then(res => {
        if (cancelled) return;
        if (res?.code === 200 && res.data?.current) {
          setVersions(res.data);
        } else {
          setVersionError(res?.message || "版本列表加载失败，仅可下载当前版");
          setVersions(fallback);
        }
      })
      .catch(e => {
        if (cancelled) return;
        setVersionError(e?.message || "版本列表加载失败，仅可下载当前版");
        setVersions(fallback);
      });
    return () => { cancelled = true; };
  }, [row.resourceId, row.version, row.fileName, row.size, row.status]);

  const { downloadOptions, unavailableCount } = useMemo(() => {
    if (!versions) return { downloadOptions: [], unavailableCount: 0 };
    const all = [versions.current, ...(versions.items || [])].filter(Boolean);
    const options = [];
    let unavailable = 0;
    all.forEach(item => {
      if (!isDownloadableVersion(item)) {
        unavailable += 1;
        return;
      }
      const tag = item.isCurrent
        ? "当前版"
        : item.isPending ? "待审" : item.isDeleted ? "已删除" : "历史";
      options.push({
        value: item.revisionId == null ? "current" : String(item.revisionId),
        label: versionOptionLabel(item, tag),
        item
      });
    });
    return { downloadOptions: options, unavailableCount: unavailable };
  }, [versions]);

  const activeKey = downloadOptions.some(opt => opt.value === versionKey)
    ? versionKey
    : (downloadOptions[0]?.value || "");
  const selectedVersion = downloadOptions.find(opt => opt.value === activeKey)?.item || null;
  const selectedRevisionId = selectedVersion?.revisionId ?? null;

  useEffect(() => {
    if (!versions) return;
    if (!selectedVersion) {
      setPkg(null);
      setLoading(false);
      setError("没有可下载的版本包");
      return;
    }
    const cacheKey = selectedRevisionId == null ? "current" : String(selectedRevisionId);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setPkg(cached);
      setError("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      setPkg(null);
      try {
        const res = await sukinosAppManageAPI.downloadAppPackage({
          resourceId: row.resourceId,
          revisionId: selectedRevisionId ?? undefined
        });
        if (cancelled) return;
        if (res instanceof Blob) {
          if (res.type.includes("json")) {
            setError(await readBlobError(res));
            return;
          }
          const text = await res.text();
          const entry = { blob: res, tree: buildWorkerFileTree(text) };
          cacheRef.current.set(cacheKey, entry);
          setPkg(entry);
        } else {
          setError(res?.message || "下载失败");
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "下载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [versions, selectedVersion, selectedRevisionId, row.resourceId]);

  const tree = pkg?.tree || null;
  const parsedUsable = Boolean(tree?.recognized) && !tree?.parseError;
  const fileCount = tree ? Object.keys(tree.files).length : 0;
  // 根目录名与后缀都按后端落库规则生成，避免自由文本应用名把 zip 条目带歪
  const baseName = safeNameSegment(`${row.appName}-v${selectedVersion?.version || row.version}`);
  const packageExt = /\.[^.]+$/.exec(selectedVersion?.fileName || "")?.[0] || ".js";

  const handleDownload = async () => {
    if (!pkg) return;
    if (mode === "raw") {
      saveBlob(pkg.blob, `${baseName}${packageExt}`);
      return;
    }
    setPacking(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const root = zip.folder(`${baseName}-source`);
      Object.entries(pkg.tree.files).forEach(([path, value]) => {
        // 采集期折成 data URL 的二进制必须还原成字节，写成文本就是废文件
        const data = splitDataUrl(value);
        if (data?.isBase64) root.file(path, data.body, { base64: true });
        else if (data) root.file(path, decodeURIComponent(data.body));
        else root.file(path, value);
      });
      saveBlob(await zip.generateAsync({ type: "blob" }), `${baseName}-source.zip`);
    } catch (e) {
      alert.failure(`打包失败：${e?.message || "未知错误"}`);
    } finally {
      setPacking(false);
    }
  };

  return (
    <Modal
      title={`下载文件 · ${row.appName}`}
      visible
      onClose={onClose}
      width={620}
      minHeight={240}
    >
      {downloadOptions.length > 1 && (
        <div className={style[bem.e("form-item")]}>
          <label>版本</label>
          <Select
            size="small"
            value={activeKey}
            onChange={setVersionKey}
            options={downloadOptions.map(({ value, label }) => ({ value, label }))}
            direction="bottom"
          />
        </div>
      )}

      {versionError && <p className={style[bem.e("code-text")]}>{versionError}</p>}
      {unavailableCount > 0 && (
        <p className={style[bem.e("code-text")]}>
          有 {unavailableCount} 个版本的包已清除、缺失或为空，未列入可选。
        </p>
      )}

      {loading && <p className={style[bem.e("code-text")]}>正在取回包体…</p>}

      {!loading && error && (
        <p className={style[bem.e("code-text")]}>{error}</p>
      )}

      {!loading && !error && tree && (
        <>
          <div className={style[bem.e("form-item")]}>
            <label>下载内容</label>
            <Select
              size="small"
              value={mode}
              onChange={setMode}
              options={DOWNLOAD_MODE_OPTIONS}
              direction="bottom"
            />
          </div>

          <div className={style[bem.e("detail-block")]}>
            <label>包体</label>
            <pre>{
              `版本 v${selectedVersion?.version || "-"} · 物理文件 ${selectedVersion?.fileName || "-"} · 体积 ${fmtBytes(selectedVersion?.size)}\n` +
              (mode === "raw"
                ? "逐字取回磁盘上那份内联 worker，视图原文与预编译产物都在其中。"
                : `解析后 ${fileCount} 个文件${tree.hasLogic ? `，主逻辑 ${tree.logicFileName}` : "，无主逻辑块"}。\n` +
                  "导出的是块里内联的原文：视图与样式来自原始内容包，预编译产物不在其中（可由原文重生成），" +
                  "主逻辑优先取原始源码块（缺该块的历史包取到的是执行块），" +
                  "CSS Modules 的类名是运行时加过后缀的形态。" +
                  (tree.pathAdjusted
                    ? `\n其中 ${tree.pathAdjusted} 个路径名带非法字符或穿越段，落地时已被规整——逐字取回请用原始文件。`
                    : ""))
            }</pre>
          </div>

          {!parsedUsable && (
            <p className={style[bem.e("code-text")]}>
              {tree.parseError
                ? `内联包未能解析（${tree.parseError}），只能下载原始文件。`
                : "不识别为 SukinOS 内联包（没有取到配置块与内容块），只能下载原始文件。"}
            </p>
          )}
        </>
      )}

      <div className={style[bem.e("audit-actions")]} style={{ marginTop: 16 }}>
        <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
        <Button
          variant="default"
          size="sm"
          loading={packing}
          disabled={loading || Boolean(error) || !pkg || (mode === "parsed" && !parsedUsable)}
          onClick={handleDownload}
        >
          {mode === "raw" ? "下载原始文件" : "打包下载源文件"}
        </Button>
      </div>
    </Modal>
  );
}

function AppManage() {
  const { hasPermission, isRoot } = usePermission();
  const [listRes, setListRes] = useState({ items: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("");

  const [selected, setSelected] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [downloadRow, setDownloadRow] = useState(null);
  const [inspectorRow, setInspectorRow] = useState(null);
  const [filesOpen, setFilesOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 聚合前端统计
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0, underReview: 0 });

  const debouncedSetKeyword = useDebounce((val) => {
    setKeyword(val);
    setPage(1);
  }, 500);

  const debouncedSetUserId = useDebounce((val) => {
    setUserId(val);
    setPage(1);
  }, 500);

  const handleKeywordChange = (e) => {
    const val = e.target.value;
    setKeywordInput(val);
    debouncedSetKeyword(val);
  };

  const handleUserIdChange = (e) => {
    const val = e.target.value;
    setUserIdInput(val);
    debouncedSetUserId(val);
  };

  // 获取后台统计数据
  const loadStats = useCallback(() => {
    if (!isRoot) return Promise.resolve();
    return sukinosAppManageAPI.getAppStatistics()
      .then(res => {
        if (res?.code === 200) {
          setStats(res.data);
        }
      });
  }, [isRoot]);

  const loadList = useCallback(() => {
    if (!isRoot) return Promise.resolve();
    return sukinosAppManageAPI.getSystemAppList({
      current: page,
      pageSize,
      keyword: keyword || undefined,
      status: status || undefined,
      userId: userId ? parseInt(userId, 10) : undefined
    }).then(res => {
      if (res?.code === 200) {
        // PageList 用 id 作 key，这里把 resourceId 映射过去
        const formattedItems = (res.data?.items || []).map(item => ({
          ...item,
          id: item.resourceId
        }));

        setListRes({
          items: formattedItems,
          // 分页字段在响应里是嵌套结构
          total: res.data?.pagination?.totalItems || 0,
          totalPages: res.data?.pagination?.totalPages || 1
        });
      } else {
        alert.failure(res?.message || "应用资源数据载入失败");
      }
    });
  }, [page, pageSize, keyword, status, userId, isRoot]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // 列表与统计一起刷新
    Promise.all([loadStats(), loadList()])
      .then(() => {
        alert.success("平台应用数据同步成功");
      })
      .catch(() => {
        alert.failure("同步失败");
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [loadStats, loadList]);

  const throttledRefresh = useThrottle(handleRefresh, 1000, [handleRefresh]);

  useEffect(() => {
    loadStats();
    loadList();
  }, [loadStats, loadList]);

  const statusOption = useMemo(() => {
    if (!stats.total) return null;
    return {
      tooltip: { trigger: "item" },
      legend: { bottom: 4, icon: "circle", textStyle: { fontSize: 11 } },
      series: [
        {
          type: "pie",
          radius: ["50%", "70%"],
          center: ["50%", "42%"],
          label: { show: false },
          data: [
            { name: "正常上架", value: stats.active },
            { name: "审核中", value: stats.underReview },
            { name: "禁用下架", value: stats.disabled }
          ],
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "#ffffff" },
          color: ["#10b981", "#f59e0b", "#f43f5e"]
        }
      ]
    };
  }, [stats]);

  const statusRef = useRef(null);
  useChart(statusRef, statusOption, [statusOption]);

  const columns = useMemo(() => [
    {
      label: "创建时间",
      prop: "createdAt",
      width: 150,
      render: (row) => (
        <span className={style[bem.e("time")]}>
          {fmtTime(row.createdAt || row.metaInfo?.createdAt)}
        </span>
      )
    },
    {
      label: "应用名称",
      prop: "appName",
      width: 180,
      render: (row) => (
        <span className={style[bem.e("app-name-col")]}>
          {row.appName}
          <span className={style[bem.e("version-tag")]}>v{row.version}</span>
          {row.pendingVersion && (
            <span className={style[bem.e("version-tag")]} data-tone="pending">待审 v{row.pendingVersion}</span>
          )}
          {row.forceUpdate && (
            <span className={style[bem.e("version-tag")]} data-tone="forced">强制更新</span>
          )}
        </span>
      )
    },
    {
      label: "所有者 ID",
      prop: "userId",
      width: 90,
      render: (row) => (
        <span className={style[bem.e("operator")]}>{row.userId}</span>
      )
    },
    {
      label: "文件大小",
      prop: "size",
      width: 90,
      render: (row) => (
        <span className={style[bem.e("duration")]}>{fmtBytes(row.size)}</span>
      )
    },
    {
      label: "发布公开",
      prop: "isPrivate",
      width: 90,
      render: (row) => (
        <span className={`${style[bem.e("privacy-tag")]} ${row.isPrivate ? style[bem.em("privacy-tag", "private")] : style[bem.em("privacy-tag", "public")]}`}>
          {row.isPrivate ? "私有" : "公开"}
        </span>
      )
    },
    {
      label: "运行状态",
      prop: "status",
      width: 110,
      render: (row) => (
        <span className={`${style[bem.e("status")]} ${
          row.status === "active" ? style[bem.em("status", "active")] :
          row.status === "under_review" ? style[bem.em("status", "review")] :
          style[bem.em("status", "disabled")]
        }`}>
          {row.status === "active" ? "正常上架" : row.status === "under_review" ? "审核中" : "禁用下架"}
        </span>
      )
    }
  ], []);

  const actions = useMemo(() => {
    const result = [
      {
        label: "管理与审计",
        icon: <VisibilityIcon style={{ color: "#6366f1" }} />,
        onClick: (row) => setDetailId(row.resourceId)
      },
      {
        label: "包检查与预览",
        icon: <CodeIcon style={{ color: "#8b5cf6" }} />,
        onClick: (row) => setInspectorRow(row)
      },
      {
        label: "下载文件",
        icon: <FileDownloadIcon style={{ color: "#0ea5e9" }} />,
        onClick: (row) => setDownloadRow(row)
      },
    ];
    if (isRoot && hasPermission("system:apps_access:edit")) {
      result.push({
        label: "强行销毁",
        icon: <DeleteIcon style={{ color: "#f43f5e" }} />,
        onClick: (row) => {
          confirm.show({
            title: "平台级高危销毁确认",
            content: `您确定要强制销毁应用「${row.appName}」吗？该动作会物理抹除磁盘文件并在云端完成下线，无法复原。`,
            onConfirm: async () => {
              const res = await sukinosAppManageAPI.forceDeleteApp({ resourceId: row.resourceId });
              if (res?.code === 200) {
                alert.success(res.message || "平台级强制销毁成功");
                loadStats();
                loadList();
              } else {
                alert.failure(res?.message || "销毁失败");
              }
            }
          });
        }
      });
    }
    return result;
  }, [loadList, loadStats, hasPermission, isRoot]);

  if (!isRoot) {
    return (
      <div className={style[bem.b()]}>
        <div className={style[bem.e("container")]} style={{ padding: 16, color: "var(--text-secondary)" }}>
          应用管理仅对超级管理员开放
        </div>
      </div>
    );
  }

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("container")]}>

        <div className={style[bem.e("left-pane")]}>
          <div className={style[bem.e("card")]}>
            <div className={style[bem.e("card-head")]}>商城应用指标概览</div>
            <div className={style[bem.e("stat-grid")]}>
              <StatCard
                icon={<AppSettingsAltIcon width="1em" height="1em" />}
                label="商城应用总量"
                value={stats.total}
                tone="indigo"
              />
              <StatCard
                icon={<CheckCircleOutlineIcon width="1em" height="1em" />}
                label="活跃正常上架"
                value={stats.active}
                tone="emerald"
              />
              <StatCard
                icon={<RateReviewIcon width="1em" height="1em" />}
                label="等待审核应用"
                value={stats.underReview}
                tone="amber"
              />
              <StatCard
                icon={<ErrorOutlineIcon width="1em" height="1em" />}
                label="下架禁用应用"
                value={stats.disabled}
                tone="rose"
              />
            </div>
          </div>

          <div className={style[bem.e("chart-grid")]}>
            <div className={style[bem.e("card")]}>
              <div className={style[bem.e("card-head")]}>上架状态分布占比</div>
              <div className={style[bem.e("chart-box")]}>
                <div ref={statusRef} style={{ width: "100%", height: "100%", display: statusOption ? "block" : "none" }} />
                {!statusOption && <div className={style[bem.e("empty")]}>暂无状态数据</div>}
              </div>
            </div>
          </div>
        </div>

        <div className={style[bem.e("right-pane")]}>
          <div className={style[bem.e("toolbar")]}>
            <div className={style[bem.e("toolbar-left")]}>
              <Input
                className={style[bem.e("search-bar")]}
                size="small"
                prefixIcon={<SearchIcon size={16} />}
                placeholder="搜索应用名称、资源标识..."
                value={keywordInput}
                onChange={handleKeywordChange}
              />
              <div className={style[bem.e("filter")]}>
                <label>应用状态</label>
                <Select
                  size="small"
                  value={status}
                  onChange={(val) => { setStatus(val); setPage(1); }}
                  options={STATUS_FILTER_OPTIONS}
                  direction="bottom"
                />
              </div>
              <div className={style[bem.e("filter")]}>
                <label>开发者ID</label>
                <Input
                  className={style[bem.e("input")]}
                  size="small"
                  value={userIdInput}
                  onChange={handleUserIdChange}
                  placeholder="用户 ID"
                />
              </div>
            </div>

            <div className={style[bem.e("toolbar-right")]}>
              {hasPermission("system:apps_access:edit") && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<HardDriveIcon />}
                  onClick={() => setFilesOpen(true)}
                  title="查看磁盘包与引用关系"
                >文件治理</Button>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshIcon />}
                loading={refreshing}
                onClick={throttledRefresh}
                title="同步并刷新数据"
              >同步数据</Button>
            </div>
          </div>

          <div className={style[bem.e("list-card")]}>
            <PageList
              columns={columns}
              data={listRes.items}
              total={listRes.total}
              current={page}
              pageSize={pageSize}
              selectable
              selectedRowKeys={selected}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
              onSelectionChange={setSelected}
              actions={actions}
              actionWidth={240}
            />
          </div>
        </div>

      </div>

      {detailId && (
        <AppDetailAndAuditModal
          resourceId={detailId}
          onClose={() => setDetailId(null)}
          onRefresh={handleRefresh}
        />
      )}

      {downloadRow && (
        <AppDownloadModal
          row={downloadRow}
          onClose={() => setDownloadRow(null)}
        />
      )}

      {inspectorRow && (
        <PackageInspector
          row={inspectorRow}
          onClose={() => setInspectorRow(null)}
          onSubmitted={handleRefresh}
        />
      )}

      {filesOpen && (
        <FileManagerModal onClose={() => setFilesOpen(false)} />
      )}
    </div>
  );
}

export default AppManage;
