import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { init, use } from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import requestLogAPI from "@/apis/system/requestLog";
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
import TimelineIcon from "@mui/icons-material/Timeline";
import SpeedIcon from "@mui/icons-material/Speed";
import RefreshIcon from "@mui/icons-material/Refresh";

import useDebounce from "@/sukinos/hooks/useDebounce";
import useThrottle from "@/sukinos/hooks/useThrottle";

use([
  LineChart,
  PieChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer
]);

const bem = createNamespace("system-log");

const METHOD_OPTIONS = [
  { label: "全部方法", value: "" },
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "DELETE", value: "DELETE" }
];

const SUCCESS_OPTIONS = [
  { label: "全部状态", value: "" },
  { label: "成功", value: true },
  { label: "失败", value: false }
];

const fmtTime = (val) => {
  if (!val) return "-";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const toDayTs = (val, isEnd) => {
  if (!val) return undefined;
  const time = new Date(`${val}T${isEnd ? "23:59:59" : "00:00:00"}`);
  if (Number.isNaN(time.getTime())) return undefined;
  return Math.floor(time.getTime() / 1000);
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
    <div className={[style[bem.e("stat-card")],style[bem.e("stat-card", tone)]].join(" ")}>
      <div className={style[bem.e("stat-icon")]}>{icon}</div>
      <div className={style[bem.e("stat-body")]}>
        <div className={style[bem.e("stat-label")]}>{label}</div>
        <div className={style[bem.e("stat-value")]}>{value ?? "-"}</div>
      </div>
    </div>
  );
}

function LogDetailModal({ logId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    requestLogAPI.getLogDetail({ logId })
      .then(res => {
        if (res?.code === 200) {
          setDetail(res.data);
        } else {
          alert.failure(res?.message || "获取详情失败");
          onClose();
        }
      })
      .finally(() => setLoading(false));
  }, [logId]);

  return (
    <div className={style[bem.e("overlay")]} onClick={onClose}>
      <div className={style[bem.e("modal")]} onClick={e => e.stopPropagation()}>
        <div className={style[bem.e("modal-head")]}>
          <div className={style[bem.e("modal-title")]}>
            请求日志详情
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
                  <label>请求时间</label>
                  <p>{fmtTime(detail.created_at || detail.createdAt)}</p>
                </div>
                <div>
                  <label>操作者</label>
                  <p>{detail.operator_username || detail.operatorUsername || detail.operator_account || detail.operatorAccount || "匿名"}</p>
                </div>
                <div>
                  <label>方法</label>
                  <p>{detail.method}</p>
                </div>
                <div>
                  <label>状态码</label>
                  <p>{detail.status_code || detail.statusCode}</p>
                </div>
                <div>
                  <label>耗时</label>
                  <p>{detail.duration_ms || detail.durationMs}ms</p>
                </div>
                <div>
                  <label>请求地址</label>
                  <p>{detail.full_url || detail.fullUrl || detail.path}</p>
                </div>
                <div>
                  <label>IP / UA</label>
                  <p>{detail.ip || "-"}</p>
                  <p className={style[bem.e("muted")]}>{detail.user_agent || detail.userAgent || ""}</p>
                </div>
              </div>

              <div className={style[bem.e("detail-block")]}>
                <label>请求参数</label>
                <pre>{(detail.request_query || detail.requestQuery) ? JSON.stringify(detail.request_query || detail.requestQuery, null, 2) : "-"}</pre>
              </div>
              <div className={style[bem.e("detail-block")]}>
                <label>请求体</label>
                <pre>{detail.request_body || detail.requestBody || "-"}</pre>
              </div>
              <div className={style[bem.e("detail-block")]}>
                <label>响应体</label>
                <pre>{detail.response_body || detail.responseBody || "-"}</pre>
              </div>
              {(detail.error_message || detail.errorMessage) && (
                <div className={style[bem.e("detail-block")]}>
                  <label>错误信息</label>
                  <pre className={style[bem.e("error")]}>{detail.error_message || detail.errorMessage}</pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemLog() {
  const [stats, setStats] = useState(null);
  const [listRes, setListRes] = useState({ items: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [operatorInput, setOperatorInput] = useState("");
  const [operator, setOperator] = useState("");

  const [method, setMethod] = useState("");
  const [success, setSuccess] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const debouncedSetKeyword = useDebounce((val) => {
    setKeyword(val);
    setPage(1);
  }, 500);

  const debouncedSetOperator = useDebounce((val) => {
    setOperator(val);
    setPage(1);
  }, 500);

  const handleKeywordChange = (e) => {
    const val = e.target.value;
    setKeywordInput(val);
    debouncedSetKeyword(val);
  };

  const handleOperatorChange = (e) => {
    const val = e.target.value;
    setOperatorInput(val);
    debouncedSetOperator(val);
  };

  const loadStats = useCallback(() => {
    return requestLogAPI.getLogStats({
      start_ts: toDayTs(startDate),
      startTs: toDayTs(startDate),
      end_ts: toDayTs(endDate, true),
      endTs: toDayTs(endDate, true)
    }).then(res => {
      if (res?.code === 200) {
        setStats(res.data);
      }
    });
  }, [startDate, endDate]);

  const loadList = useCallback(() => {
    return requestLogAPI.getLogList({
      page,
      page_size: pageSize,
      pageSize,
      keyword: keyword || undefined,
      method: method || undefined,
      success: success === "" ? undefined : success,
      operator: operator || undefined,
      start_ts: toDayTs(startDate),
      startTs: toDayTs(startDate),
      end_ts: toDayTs(endDate, true),
      endTs: toDayTs(endDate, true)
    }).then(res => {
      if (res?.code === 200) {
        setListRes(res.data);
      } else {
        alert.failure(res?.message || "加载日志失败");
      }
    });
  }, [page, pageSize, keyword, method, success, operator, startDate, endDate]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadStats(), loadList()])
      .then(() => {
        alert.success("数据已更新");
      })
      .catch(() => {
        alert.failure("刷新失败");
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [loadStats, loadList]);

  const throttledRefresh = useThrottle(handleRefresh, 1000, [handleRefresh]);

  const throttledLoadStats = useThrottle(loadStats, 800, [loadStats]);
  const throttledLoadList = useThrottle(loadList, 800, [loadList]);

  useEffect(() => {
    throttledLoadStats();
  }, [throttledLoadStats]);

  useEffect(() => {
    throttledLoadList();
  }, [throttledLoadList]);

  const successOption = useMemo(() => {
    const data = stats?.success_stats || stats?.successStats;
    if (!data) return null;
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
            { name: "成功", value: data.success || 0 },
            { name: "失败", value: data.failed || 0 }
          ],
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "#ffffff" },
          color: ["#10b981", "#f43f5e"]
        }
      ]
    };
  }, [stats]);

  const methodOption = useMemo(() => {
    const methodStats = stats?.method_stats || stats?.methodStats;
    if (!methodStats?.length) return null;
    return {
      tooltip: { trigger: "item" },
      legend: { bottom: 4, icon: "circle", textStyle: { fontSize: 11 } },
      series: [
        {
          type: "pie",
          radius: ["48%", "68%"],
          center: ["50%", "42%"],
          label: { show: false },
          data: methodStats.map(it => ({ name: it.method, value: it.count })),
          itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "#ffffff" },
          color: ["#6366f1", "#f59e0b", "#22c55e", "#0ea5e9"]
        }
      ]
    };
  }, [stats]);

  const trendOption = useMemo(() => {
    if (!stats?.trend?.length) return null;
    return {
      tooltip: { trigger: "axis" },
      grid: { top: 20, left: 50, right: 20, bottom: 40 },
      xAxis: {
        type: "category",
        data: stats.trend.map(i => i.date),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 12 }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 12, formatter: v => `${v}ms` }
      },
      series: [
        {
          name: "P50",
          type: "line",
          smooth: true,
          data: stats.trend.map(i => i.p50),
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: "#6366f1" },
          itemStyle: { color: "#6366f1" }
        },
        {
          name: "P95",
          type: "line",
          smooth: true,
          data: stats.trend.map(i => i.p95),
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 2, color: "#f59e0b" },
          itemStyle: { color: "#f59e0b" }
        }
      ]
    };
  }, [stats]);

  const successRef = useRef(null);
  const methodRef = useRef(null);
  const trendRef = useRef(null);

  useChart(successRef, successOption, [successOption]);
  useChart(methodRef, methodOption, [methodOption]);
  useChart(trendRef, trendOption, [trendOption]);

  const columns = useMemo(() => [
    {
      label: "时间",
      prop: "created_at",
      width: 160,
      render: (row) => <span className={style[bem.e("time")]}>{fmtTime(row.created_at || row.createdAt)}</span>
    },
    {
      label: "操作者",
      prop: "operator_username",
      width: 140,
      render: (row) => (
        <span className={style[bem.e("operator")]}>
          {row.operator_username || row.operatorUsername || row.operator_account || row.operatorAccount || "匿名"}
        </span>
      )
    },
    {
      label: "方法",
      prop: "method",
      width: 90,
      render: (row) => (
        <span className={style[bem.e("tag")]}>{row.method}</span>
      )
    },
    {
      label: "请求地址",
      prop: "path",
      width: 300,
      render: (row) => (
        <span className={style[bem.e("path")]}>{row.path}</span>
      )
    },
    {
      label: "状态",
      prop: "success",
      width: 100,
      render: (row) => (
        <span className={`${style[bem.e("status")]} ${row.success ? style[bem.em("status", "success")] : style[bem.em("status", "failed")]}`}>
          {row.success ? "成功" : "失败"}
        </span>
      )
    },
    {
      label: "耗时",
      prop: "duration_ms",
      width: 90,
      render: (row) => (
        <span className={style[bem.e("duration")]}>{(row.duration_ms ?? row.durationMs)}ms</span>
      )
    }
  ], []);

  const actions = useMemo(() => [
    {
      label: "查看",
      icon: <VisibilityIcon style={{ color: "#6366f1" }} />,
      onClick: (row) => setDetailId(row.id)
    },
    {
      label: "删除",
      icon: <DeleteIcon style={{ color: "#f43f5e" }} />,
      onClick: (row) => {
        confirm.show({
          title: "删除确认",
          content: "确定删除该条日志记录吗？",
          onConfirm: async () => {
            const res = await requestLogAPI.deleteLog({ logId: row.id });
            if (res?.code === 200) {
              alert.success(res.message || "删除成功");
              loadList();
              loadStats();
            } else {
              alert.failure(res?.message || "删除失败");
            }
          }
        });
      }
    }
  ], [loadList, loadStats]);

  const handleBatchDelete = () => {
    if (!selected.length) return;
    confirm.show({
      title: "批量删除确认",
      content: `确定删除选中的 ${selected.length} 条日志吗？`,
      onConfirm: async () => {
        const res = await requestLogAPI.deleteLogs({ ids: selected });
        if (res?.code === 200) {
          alert.success(res.message || "批量删除成功");
          setSelected([]);
          loadList();
          loadStats();
        } else {
          alert.failure(res?.message || "删除失败");
        }
      }
    });
  };

  const handleExport = () => {
    requestLogAPI.exportLogs({
      keyword: keyword || undefined,
      method: method || undefined,
      success: success === "" ? undefined : success,
      operator: operator || undefined,
      start_ts: toDayTs(startDate),
      startTs: toDayTs(startDate),
      end_ts: toDayTs(endDate, true),
      endTs: toDayTs(endDate, true)
    }).then(res => {
      const blob = new Blob([res.data || res], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `请求日志_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }).catch(() => {
      alert.failure("导出失败");
    });
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("container")]}>
        <div className={style[bem.e("left-pane")]}>
          <div className={style[bem.e("card")]}>
            <div className={style[bem.e("card-head")]}>数据指标概览</div>
            <div className={style[bem.e("stat-grid")]}>
              <StatCard
                icon={<TimelineIcon fontSize="inherit" />}
                label="日志总量"
                value={stats?.total}
                tone="indigo"
              />
              <StatCard
                icon={<CheckCircleOutlineIcon fontSize="inherit" />}
                label="成功记录"
                value={stats?.success}
                tone="emerald"
              />
              <StatCard
                icon={<ErrorOutlineIcon fontSize="inherit" />}
                label="失败记录"
                value={stats?.failed}
                tone="rose"
              />
              <StatCard
                icon={<SpeedIcon fontSize="inherit" />}
                label="平均耗时"
                value={stats ? `${stats.avg_duration ?? stats.avgDuration}ms` : "-"}
                tone="amber"
              />
            </div>
          </div>

          <div className={style[bem.e("chart-grid")]}>
            <div className={style[bem.e("card")]}>
              <div className={style[bem.e("card-head")]}>成功 / 失败占比</div>
              <div className={style[bem.e("chart-box")]}>
                <div ref={successRef} style={{ width: "100%", height: "100%", display: successOption ? "block" : "none" }} />
                {!successOption && <div className={style[bem.e("empty")]}>暂无数据</div>}
              </div>
            </div>
            <div className={style[bem.e("card")]}>
              <div className={style[bem.e("card-head")]}>方法分布</div>
              <div className={style[bem.e("chart-box")]}>
                <div ref={methodRef} style={{ width: "100%", height: "100%", display: methodOption ? "block" : "none" }} />
                {!methodOption && <div className={style[bem.e("empty")]}>暂无数据</div>}
              </div>
            </div>
          </div>
        </div>

        <div className={style[bem.e("right-pane")]}>
          <div className={style[bem.e("card")]}>
            <div className={style[bem.e("card-head")]}>耗时趋势 (P50 / P95)</div>
            <div className={style[bem.e("trend-box")]}>
              <div ref={trendRef} style={{ width: "100%", height: "100%", display: trendOption ? "block" : "none" }} />
              {!trendOption && <div className={style[bem.e("empty")]}>暂无趋势数据</div>}
            </div>
          </div>

          <div className={style[bem.e("toolbar")]}>
            <div className={style[bem.e("toolbar-left")]}>
              <div className={style[bem.e("search-bar")]}>
                <SearchIcon fontSize="small" style={{ color: "#9ca3af" }} />
                <input
                  placeholder="搜索接口、操作者..."
                  value={keywordInput}
                  onChange={handleKeywordChange}
                />
              </div>
              <div className={style[bem.e("filter")]}>
                <label>方法</label>
                <Select
                  value={method}
                  onChange={(val) => { setMethod(val); setPage(1); }}
                  options={METHOD_OPTIONS}
                  direction="bottom"
                />
              </div>
              <div className={style[bem.e("filter")]}>
                <label>状态</label>
                <Select
                  value={success}
                  onChange={(val) => { setSuccess(val); setPage(1); }}
                  options={SUCCESS_OPTIONS}
                  direction="bottom"
                />
              </div>
              <div className={style[bem.e("filter")]}>
                <label>操作者</label>
                <input
                  className={style[bem.e("input")]}
                  value={operatorInput}
                  onChange={handleOperatorChange}
                  placeholder="账号/昵称"
                />
              </div>
              <div className={style[bem.e("date-group")]}>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setPage(1); }}
                />
                <span>—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            <div className={style[bem.e("toolbar-right")]}>
              <button
                className={`${style[bem.e("btn-refresh")]} ${refreshing ? style[bem.em("btn-refresh", "loading")] : ""}`}
                onClick={throttledRefresh}
                title="刷新数据"
                disabled={refreshing}
              >
                <RefreshIcon fontSize="small" />
                <span>刷新</span>
              </button>
              <Button type="primary" plain size="small" onClick={handleExport}>导出CSV</Button>
              {selected.length > 0 && (
                <div className={style[bem.e("batch-bar")]}>
                  <span>已选 {selected.length} 条</span>
                  <Button type="danger" plain size="small" onClick={handleBatchDelete}>批量删除</Button>
                </div>
              )}
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
              actionWidth={140}
            />
          </div>
        </div>
      </div>

      {detailId && (
        <LogDetailModal
          logId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

export default SystemLog;
