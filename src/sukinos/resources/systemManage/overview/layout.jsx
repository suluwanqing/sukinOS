import { useState, useEffect, useRef, useMemo } from "react";
// 引入 ECharts 核心模块
import { init, graphic, use } from "echarts/core";
// 引入折线图和饼图
import { LineChart, PieChart } from "echarts/charts";
// 引入提示框、直角坐标系、图例组件
import { TooltipComponent, GridComponent, LegendComponent } from "echarts/components";
// 引入 Canvas 渲染器
import { CanvasRenderer } from "echarts/renderers";

import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import systemAPI from "@/apis/system/main.jsx";
import statusAPI from "@/apis/system/status.jsx";

import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import MemoryIcon from '@mui/icons-material/Memory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// 注册必须的组件
use([
  LineChart,
  PieChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer
]);

const bem = createNamespace("overview");

const TIME_PART_MAP = {
  partDawn: "凌晨 0–6",
  partMorning: "上午 6–12",
  partAfternoon: "下午 12–18",
  partEvening: "晚上 18–22",
  partNight: "深夜 22–24"
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
    return () => { chartRef.current?.dispose(); chartRef.current = null; };
  }, []);
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`${style[bem.e("stat-card")]} ${style[bem.em("stat-card", color)]}`}>
      <div className={style[bem.e("stat-icon")]}>{icon}</div>
      <div className={style[bem.e("stat-body")]}>
        <div className={style[bem.e("stat-label")]}>{label}</div>
        <div className={style[bem.e("stat-value")]}>
          {value !== null && value !== undefined
            ? value
            : <span className={style[bem.e("spinner")]} />}
        </div>
      </div>
    </div>
  );
}

function TimePieChart({ data }) {
  const ref = useRef(null);
  const option = useMemo(() => {
    if (!data || !Object.keys(data).length) return null;
    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        borderRadius: 10,
        shadowBlur: 12,
        shadowColor: "rgba(0,0,0,0.08)",
        textStyle: { color: "#374151", fontSize: 13 },
        formatter: (params) => {
          return `${params.name}: ${params.value}次 (${params.percent}%)`;
        }
      },
      legend: {
        bottom: 4,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#6b7280", fontSize: 12 }
      },
      series: [{
        type: "pie",
        radius: ["52%", "74%"],
        center: ["50%", "44%"],
        data: Object.entries(data).map(([k, v]) => ({ name: TIME_PART_MAP[k] || k, value: v })),
        label: { show: false },
        itemStyle: { borderRadius: 6, borderWidth: 3, borderColor: "#ffffff" },
        color: ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"]
      }]
    };
  }, [data]);
  useChart(ref, option, [option]);
  return data && Object.keys(data).length ? (
    <div ref={ref} style={{ width: "100%", height: "100%" }} />
  ) : (
    <div className={style[bem.e("empty-chart")]}>
      <AssessmentIcon sx={{ fontSize: 44, color: "#e5e7eb", mb: 1 }} />
      <span>暂无统计数据</span>
    </div>
  );
}

function TrendChart({ data }) {
  const ref = useRef(null);
  const option = useMemo(() => {
    if (!data || !data.length) return null;
    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        borderRadius: 10,
        textStyle: { color: "#374151", fontSize: 13 },
        formatter: (params) => {
          const seconds = params[0].value;
          const hours = (seconds / 3600).toFixed(1);
          return `${params[0].axisValue}<br/>使用时长: ${hours}小时`;
        }
      },
      grid: { top: 20, left: 50, right: 20, bottom: 40 },
      xAxis: {
        type: "category",
        data: data.map(i => {
          const d = new Date(i.weekStartTs * 1000);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 12 }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 12,
          formatter: (value) => {
            const hours = value / 3600;
            return hours >= 1 ? `${hours.toFixed(0)}h` : `${(hours * 60).toFixed(0)}m`;
          }
        }
      },
      series: [{
        type: "line",
        smooth: true,
        data: data.map(i => i.totalSeconds),
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: "#6366f1", borderColor: "#ffffff", borderWidth: 2 },
        lineStyle: { width: 3, color: "#6366f1" },
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(99,102,241,0.18)" },
            { offset: 1, color: "rgba(99,102,241,0)" }
          ])
        }
      }]
    };
  }, [data]);
  useChart(ref, option, [option]);
  return data && data.length ? (
    <div ref={ref} style={{ width: "100%", height: "100%" }} />
  ) : (
    <div className={style[bem.e("empty-chart")]}>
      <TimelineIcon sx={{ fontSize: 44, color: "#e5e7eb", mb: 1 }} />
      <span>暂无趋势数据</span>
    </div>
  );
}

function ResourceProgressBar({ label, value, detail, colorClass }) {
  return (
    <div className={style[bem.e("progress-item")]}>
      <div className={style[bem.e("progress-header")]}>
        <span className={style[bem.e("progress-label")]}>{label}</span>
        <span className={style[bem.e("progress-value")]}>{value}% ({detail})</span>
      </div>
      <div className={style[bem.e("progress-track")]}>
        <div
          className={`${style[bem.e("progress-bar")]} ${style[bem.em("progress-bar", colorClass)]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StatusIndicator({ healthy, label, version }) {
  return (
    <div className={style[bem.e("service-status-header")]}>
      <div className={style[bem.e("service-info")]}>
        <span className={style[bem.e("service-label")]}>{label}</span>
        {version && <span className={style[bem.e("service-version")]}>v{version}</span>}
      </div>
      {healthy ? (
        <span className={`${style[bem.e("badge")]} ${style[bem.em("badge", "success")]}`}>
          <CheckCircleOutlineIcon fontSize="inherit" style={{ marginRight: 4 }} /> 正常运行
        </span>
      ) : (
        <span className={`${style[bem.e("badge")]} ${style[bem.em("badge", "error")]}`}>
          <ErrorOutlineIcon fontSize="inherit" style={{ marginRight: 4 }} /> 连通异常
        </span>
      )}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [sysStatus, setSysStatus] = useState(null);
  const [sysLoading, setSysLoading] = useState(true);

  const fetchSystemStatus = () => {
    statusAPI.getSystemStatus()
      .then((res) => {
        if (res?.code === 200) {
          setSysStatus(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setSysLoading(false));
  };

  useEffect(() => {
    Promise.all([systemAPI.getOverview(), systemAPI.getBehaviorOverview()])
      .then(([r1, r2]) => {
        if (r1?.code === 200) setStats(r1.data);
        if (r2?.code === 200) setBehavior(r2.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSystemStatus();
    const timer = setInterval(fetchSystemStatus, 1000*60);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("stat-grid")]}>
        <StatCard
          icon={<PeopleOutlineIcon fontSize="inherit" />}
          label="账户注册总数"
          value={stats?.totalUsers}
          color="indigo"
        />
        <StatCard
          icon={<OnlinePredictionIcon fontSize="inherit" />}
          label="当前实时在线"
          value={stats?.onlineUsers}
          color="emerald"
        />
        <StatCard
          icon={<VerifiedUserIcon fontSize="inherit" />}
          label="本月活跃成员"
          value={stats?.activeUsers}
          color="amber"
        />
        <StatCard
          icon={<AdminPanelSettingsIcon fontSize="inherit" />}
          label="管理权限分配"
          value={stats?.rootUsers}
          color="rose"
        />
      </div>

      <div className={style[bem.e("chart-grid")]}>
        <div className={style[bem.e("card")]}>
          <div className={style[bem.e("card-head")]}>全平台时间段活跃分布</div>
          <div className={style[bem.e("chart-box")]}>
            <TimePieChart data={behavior?.timeParts} />
          </div>
        </div>
        <div className={style[bem.e("card")]}>
          <div className={style[bem.e("card-head")]}>最近 8 周使用时长趋势</div>
          <div className={style[bem.e("chart-box")]}>
            <TrendChart data={behavior?.weeklyTrend} />
          </div>
        </div>
      </div>


      <div className={style[bem.e("panel")]}>
        <div className={style[bem.e("panel-head")]}>
          <DnsIcon className={style[bem.e("panel-icon")]} />
          <span>服务器物理负载状况 (60s 实时更新)</span>
        </div>
        <div className={style[bem.e("panel-body")]}>
          {sysLoading && !sysStatus ? (
            <div className={style[bem.e("loading-wrapper")]}>
              <span className={style[bem.e("spinner")]} />
              <span style={{ marginLeft: 12, color: "var(--su-gray-500)", fontSize: "13px" }}>正在加载负载指标...</span>
            </div>
          ) : (
            sysStatus?.resources && (
              <div className={style[bem.e("resources-grid")]}>
                <ResourceProgressBar
                  label="CPU 使用率"
                  value={sysStatus.resources.cpuPercent}
                  detail="多核计算资源"
                  colorClass="indigo"
                />
                <ResourceProgressBar
                  label="系统物理内存"
                  value={sysStatus.resources.memoryPercent}
                  detail={`已用 ${sysStatus.resources.memoryUsedGb} GB / 共 ${sysStatus.resources.memoryTotalGb} GB`}
                  colorClass="emerald"
                />
                <ResourceProgressBar
                  label="系统主磁盘空间"
                  value={sysStatus.resources.diskPercent}
                  detail={`已用 ${sysStatus.resources.diskUsedGb} GB / 共 ${sysStatus.resources.diskTotalGb} GB`}
                  colorClass="amber"
                />
              </div>
            )
          )}
        </div>
      </div>


      <div className={style[bem.e("services-grid")]}>
        <div className={style[bem.e("panel")]}>
          <div className={style[bem.e("panel-head")]}>
            <StorageIcon className={style[bem.e("panel-icon")]} />
            <span>关系型数据库指标</span>
          </div>
          <div className={style[bem.e("panel-body")]}>
            {sysLoading && !sysStatus ? (
              <div className={style[bem.e("loading-wrapper")]}>
                <span className={style[bem.e("spinner")]} />
              </div>
            ) : (
              sysStatus?.database && (
                <>
                  <StatusIndicator
                    healthy={sysStatus.database.status === "healthy"}
                    label="MySQL"
                    version={sysStatus.database.version}
                  />
                  {sysStatus.database.status === "healthy" ? (
                    <div className={style[bem.e("metric-list")]}>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>MySQL 活动连接数</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.database.mysqlConnections}</span>
                      </div>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>连接池设定的 Size</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.database.poolSize}</span>
                      </div>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>连接池正在借用数</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.database.poolCheckedOut}</span>
                      </div>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>连接池溢出数</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.database.poolOverflow}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={style[bem.e("error-msg")]}>{sysStatus.database.error || "关系型数据库未连通"}</div>
                  )}
                </>
              )
            )}
          </div>
        </div>


        <div className={style[bem.e("panel")]}>
          <div className={style[bem.e("panel-head")]}>
            <MemoryIcon className={style[bem.e("panel-icon")]} />
            <span>内存键值型缓存指标</span>
          </div>
          <div className={style[bem.e("panel-body")]}>
            {sysLoading && !sysStatus ? (
              <div className={style[bem.e("loading-wrapper")]}>
                <span className={style[bem.e("spinner")]} />
              </div>
            ) : (
              sysStatus?.redis && (
                <>
                  <StatusIndicator
                    healthy={sysStatus.redis.status === "healthy"}
                    label="Redis"
                    version={sysStatus.redis.version}
                  />
                  {sysStatus.redis.status === "healthy" ? (
                    <div className={style[bem.e("metric-list")]}>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>在线客户端连接数</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.redis.connectedClients}</span>
                      </div>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>内存使用情况 (实时/峰值)</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.redis.usedMemory} / {sysStatus.redis.usedMemoryPeak}</span>
                      </div>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>缓存命中率</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.redis.hitRatePercent}%</span>
                      </div>
                      <div className={style[bem.e("metric-item")]}>
                        <span className={style[bem.e("metric-label")]}>内存碎片率 (Fragmentation)</span>
                        <span className={style[bem.e("metric-value")]}>{sysStatus.redis.memFragmentationRatio}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={style[bem.e("error-msg")]}>{sysStatus.redis.error || "缓存服务未连通"}</div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Overview;
