import { useState, useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import systemAPI from "@/apis/system/main.jsx";
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';

const bem = createNamespace("behavior");

const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const DAY_KEYS = ["dMon", "dTue", "dWed", "dThu", "dFri", "dSat", "dSun"];

const TIME_PART_MAP = {
  partDawn: "凌晨 0–6",
  partMorning: "上午 6–12",
  partAfternoon: "下午 12–18",
  partEvening: "晚上 18–22",
  partNight: "深夜 22–24"
};

const fmtSeconds = (s) => {
  if (!s) return "0s";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function useChart(ref, option, deps) {
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) chartRef.current = echarts.init(ref.current);
    if (option) chartRef.current.setOption(option, true);
    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, deps);
  useEffect(() => {
    return () => { chartRef.current?.dispose(); chartRef.current = null; };
  }, []);
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
      grid: { top: 20, left: 54, right: 24, bottom: 44 },
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
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
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

function Behavior() {
  const [behavior, setBehavior] = useState(null);

  useEffect(() => {
    systemAPI.getBehaviorOverview()
      .then(res => { if (res?.code === 200) setBehavior(res.data); })
      .catch(() => {});
  }, []);

  const maxSeconds = Math.max(
    1,
    ...DAY_KEYS.map(k => behavior?.weeklyTotals?.[k] || 0)
  );

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("card")]} style={{ marginBottom: 20 }}>
        <div className={style[bem.e("card-head")]}>全系统活跃演进趋势</div>
        <div style={{ height: 380 }}>
          <TrendChart data={behavior?.weeklyTrend} />
        </div>
      </div>

      <div className={style[bem.e("split")]}>
        <div className={style[bem.e("card")]}>
          <div className={style[bem.e("card-head")]}>本周每日时长累计</div>
          <div className={style[bem.e("week-stats")]}>
            {DAY_LABELS.map((l, i) => {
              const secs = behavior?.weeklyTotals?.[DAY_KEYS[i]] || 0;
              const pct = Math.min(100, (secs / maxSeconds) * 100);
              return (
                <div key={l} className={style[bem.e("week-item")]}>
                  <div className={style[bem.e("week-meta")]}>
                    <strong>{l}</strong>
                    <span>{fmtSeconds(secs)}</span>
                  </div>
                  <div className={style[bem.e("week-progress")]}>
                    <div
                      className={style[bem.e("week-bar")]}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={style[bem.e("card")]}>
          <div className={style[bem.e("card-head")]}>全平台访问时段权重</div>
          <div style={{ height: 320 }}>
            <TimePieChart data={behavior?.timeParts} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Behavior;
