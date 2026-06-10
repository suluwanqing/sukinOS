import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { init, use } from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import PageList from "@/component/list/pagelist/layout";
import Button from "@/component/button/layout";
import Select from "@/component/select/drowSelection/layout";
import { alert } from "@/component/alert/layout";
import { confirm } from "@/component/confirm/layout";

import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RateReviewIcon from "@mui/icons-material/RateReview";
import AppSettingsAltIcon from "@mui/icons-material/AppSettingsAlt";
import RefreshIcon from "@mui/icons-material/Refresh";

import useDebounce from "@/sukinos/hooks/useDebounce";
import useThrottle from "@/sukinos/hooks/useThrottle";

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
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // 审核暂存状态
  const [targetStatus, setTargetStatus] = useState("");
  const [auditOpinion, setAuditOpinion] = useState("");

  const loadDetail = () => {
    setLoading(true);
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

  useEffect(() => {
    loadDetail();
  }, [resourceId]);

  const handleAuditSubmit = () => {
    setSubmitLoading(true);
    sukinosAppManageAPI.updateAppStatus({
      resourceId,
      status: targetStatus,
      auditOpinion: auditOpinion
    })
      .then(res => {
        if (res?.code === 200) {
          alert.success("状态审核更新成功");
          onRefresh();
          onClose();
        } else {
          alert.failure(res?.message || "变更状态失败");
        }
      })
      .finally(() => setSubmitLoading(false));
  };

  return (
    <div className={style[bem.e("overlay")]} onClick={onClose}>
      <div className={style[bem.e("modal")]} onClick={e => e.stopPropagation()}>
        <div className={style[bem.e("modal-head")]}>
          <div className={style[bem.e("modal-title")]}>
            应用管理与状态审计中心
          </div>
          <button className={style[bem.e("modal-close")]} onClick={onClose}>×</button>
        </div>
        <div className={style[bem.e("modal-body")]}>
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
                  <label>版本号</label>
                  <p>v{detail.version}</p>
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
                  <label>创建时间</label>
                  <p>{fmtTime(detail.createdAt || detail.metaInfo?.createdAt)}</p>
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
                <label>元数据 (MetaInfo)</label>
                <pre>{detail.metaInfo ? JSON.stringify(detail.metaInfo, null, 2) : "无元数据描述"}</pre>
              </div>

              <div className={style[bem.e("audit-pane")]}>
                <div className={style[bem.e("card-head")]} style={{ padding: "0 0 12px 0" }}>管理审核决策</div>
                <div className={style[bem.e("audit-row")]}>
                  <div className={style[bem.e("filter")]}>
                    <label>调整应用状态</label>
                    <Select
                      value={targetStatus}
                      onChange={setTargetStatus}
                      options={AUDIT_STATUS_OPTIONS}
                      direction="bottom"
                    />
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
                  <Button type="default" size="small" onClick={onClose}>取消</Button>
                  <Button type="primary" size="small" loading={submitLoading} onClick={handleAuditSubmit}>
                    应用并更新变更
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AppManage() {
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
    return sukinosAppManageAPI.getAppStatistics()
      .then(res => {
        if (res?.code === 200) {
          setStats(res.data);
        }
      });
  }, []);

  const loadList = useCallback(() => {
    return sukinosAppManageAPI.getSystemAppList({
      current: page,
      pageSize,
      keyword: keyword || undefined,
      status: status || undefined,
      userId: userId ? parseInt(userId, 10) : undefined
    }).then(res => {
      if (res?.code === 200) {
        // 重要修复：对每项应用数据进行 map 处理，确保将其唯一标识映射至 id 字段，从而消除 PageList 组件报 Key 缺失的警告
        const formattedItems = (res.data?.items || []).map(item => ({
          ...item,
          id: item.resourceId // 映射 resourceId 属性作为主键 id
        }));

        setListRes({
          items: formattedItems,
          // 修复：从后台嵌套的分页信息中正确提取 totalItems 和 totalPages，解决分页条显示为 0 条的问题
          total: res.data?.pagination?.totalItems || 0,
          totalPages: res.data?.pagination?.totalPages || 1
        });
      } else {
        alert.failure(res?.message || "应用资源数据载入失败");
      }
    });
  }, [page, pageSize, keyword, status, userId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // 使用 Promise.all 同时加载列表和高精度的统计信息
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
      width: 140,
      render: (row) => (
        <span className={style[bem.e("app-name-col")]}>
          {row.appName}
          <span className={style[bem.e("version-tag")]}>v{row.version}</span>
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

  const actions = useMemo(() => [
    {
      label: "管理与审计",
      icon: <VisibilityIcon style={{ color: "#6366f1" }} />,
      onClick: (row) => setDetailId(row.resourceId)
    },
    {
      label: "强行销毁",
      icon: <DeleteIcon style={{ color: "#f43f5e" }} />,
      onClick: (row) => {
        confirm.show({
          title: "平台级高危销毁确认",
          content: `您确定要强制销毁应用「${row.appName}」吗？该动作会物理抹除磁盘文件并在云端完成下线，无法复原。`,
          onConfirm: async () => {
            const res = await sukinosAppManageAPI.forceDeleteApp({ resourceId: row.resourceId });
            if (res?.code === 200) {
              alert.success("平台级强制销毁成功");
              // 销毁后同步载入列表和汇总数值指标
              loadStats();
              loadList();
            } else {
              alert.failure(res?.message || "销毁失败");
            }
          }
        });
      }
    }
  ], [loadList, loadStats]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("container")]}>

        <div className={style[bem.e("left-pane")]}>
          <div className={style[bem.e("card")]}>
            <div className={style[bem.e("card-head")]}>商城应用指标概览</div>
            <div className={style[bem.e("stat-grid")]}>
              <StatCard
                icon={<AppSettingsAltIcon fontSize="inherit" />}
                label="商城应用总量"
                value={stats.total}
                tone="indigo"
              />
              <StatCard
                icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                label="活跃正常上架"
                value={stats.active}
                tone="emerald"
              />
              <StatCard
                icon={<RateReviewIcon fontSize="inherit" />}
                label="等待审核应用"
                value={stats.underReview}
                tone="amber"
              />
              <StatCard
                icon={<ErrorOutlineIcon fontSize="inherit" />}
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
              <div className={style[bem.e("search-bar")]}>
                <SearchIcon fontSize="small" style={{ color: "#9ca3af" }} />
                <input
                  placeholder="搜索应用名称、资源标识..."
                  value={keywordInput}
                  onChange={handleKeywordChange}
                />
              </div>
              <div className={style[bem.e("filter")]}>
                <label>应用状态</label>
                <Select
                  value={status}
                  onChange={(val) => { setStatus(val); setPage(1); }}
                  options={STATUS_FILTER_OPTIONS}
                  direction="bottom"
                />
              </div>
              <div className={style[bem.e("filter")]}>
                <label>开发者ID</label>
                <input
                  className={style[bem.e("input")]}
                  value={userIdInput}
                  onChange={handleUserIdChange}
                  placeholder="用户 ID"
                />
              </div>
            </div>

            <div className={style[bem.e("toolbar-right")]}>
              <button
                className={[style[bem.e("btn-refresh")], refreshing ? style[bem.em("btn-refresh", "loading")] : ""].join(" ")}
                onClick={throttledRefresh}
                title="同步并刷新数据"
                disabled={refreshing}
              >
                <RefreshIcon fontSize="small" />
                <span>同步数据</span>
              </button>
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
              actionWidth={160}
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
    </div>
  );
}

export default AppManage;
