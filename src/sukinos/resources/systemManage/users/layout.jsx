import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as echarts from "echarts";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import systemAPI from "@/apis/system/main.jsx";
import Check from '@/component/check/layout';
import Button from '@/component/button/layout';
import PageList from '@/component/list/pagelist/layout';
import { alert } from '@/component/alert/layout';
import { confirm } from '@/component/confirm/layout';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmailIcon from '@mui/icons-material/Email';
import TimelineIcon from '@mui/icons-material/Timeline';

const bem = createNamespace("users");

const DAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const DAY_KEYS = ["dMon", "dTue", "dWed", "dThu", "dFri", "dSat", "dSun"];

const TIME_PART_MAP = {
  partDawn: "凌晨 0–6",
  partMorning: "上午 6–12",
  partAfternoon: "下午 12–18",
  partEvening: "晚上 18–22",
  partNight: "深夜 22–24"
};

const fmtTime = (ts) => {
  if (!ts) return "从未登录";
  return new Date(ts * 1000).toLocaleString("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });
};

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return "0分钟";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`;
  }
  return `${minutes}分钟`;
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

function Avatar({ user, size = 32 }) {
  const initials = (user?.username || user?.account || "U")[0].toUpperCase();
  return (
    <div
      className={style[bem.e("avatar")]}
      style={{ width: size, height: size, minWidth: size, fontSize: size * 0.4 }}
    >
      {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
    </div>
  );
}

function UserDetailModal({ userId, onClose, onRefresh }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pieRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    systemAPI.getUserDetail(userId)
      .then(res => {
        if (res?.code === 200) {
          setUser(res.data);
        } else {
          alert.failure(res?.message || "获取详情失败");
          onClose();
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const pieOption = useMemo(() => {
    if (!user?.behavior?.timeParts) return null;
    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          return `${params.name}: ${params.value}次`;
        }
      },
      series: [{
        type: "pie",
        radius: ["45%", "72%"],
        color: ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"],
        data: Object.entries(user.behavior.timeParts).map(([k, v]) => ({ name: TIME_PART_MAP[k] || k, value: v })),
        label: {
          show: true,
          formatter: (params) => {
            return `${params.name}: ${params.value}次`;
          },
          fontSize: 10,
          position: 'outside'
        },
        itemStyle: { borderRadius: 5, borderWidth: 2, borderColor: "#ffffff" }
      }]
    };
  }, [user]);

  const lineOption = useMemo(() => {
    if (!user?.weeklyLogs?.length) return null;
    const lastWeek = user.weeklyLogs[user.weeklyLogs.length - 1];
    return {
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          return `${params[0].axisValue}<br/>活跃时长: ${formatDuration(params[0].value)}`;
        }
      },
      grid: { top: 10, bottom: 25, left: 42, right: 10 },
      xAxis: {
        type: "category",
        data: DAY_LABELS,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 11 }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#9ca3af",
          fontSize: 11,
          formatter: (v) => formatDuration(v)
        }
      },
      series: [{
        type: "line", smooth: true,
        data: DAY_KEYS.map(k => lastWeek[k] || 0),
        areaStyle: { color: "rgba(99,102,241,0.09)" },
        lineStyle: { width: 3, color: "#6366f1" },
        itemStyle: { color: "#6366f1" },
        showSymbol: false
      }]
    };
  }, [user]);

  useChart(pieRef, pieOption, [pieOption]);
  useChart(lineRef, lineOption, [lineOption]);

  const handleToggleStatus = (v) => {
    systemAPI.toggleUserStatus(user.id, v).then(res => {
      if (res?.code === 200) {
        setUser({ ...user, isActive: v });
        onRefresh();
        alert.success("状态更新成功");
      } else {
        alert.failure(res?.message || "状态更新失败");
      }
    });
  };

  return (
    <div className={style[bem.e("overlay")]} onClick={onClose}>
      <div className={style[bem.e("modal")]} onClick={e => e.stopPropagation()}>
        <div className={style[bem.e("modal-head")]}>
          <div className={style[bem.e("modal-title")]}>成员详细档案</div>
          <button className={style[bem.e("modal-close")]} onClick={onClose}>
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <div className={style[bem.e("modal-body")]}>
          {loading ? (
            <div className={style[bem.e("center")]}>
              <span className={style[bem.e("spinner")]} />
            </div>
          ) : user && (
            <>
              <div className={style[bem.e("detail-hero")]}>
                <Avatar user={user} size={80} />
                <div className={style[bem.e("hero-main")]}>
                  <h3>
                    {user.username}
                    <small>@{user.account}</small>
                  </h3>
                  <div className={style[bem.e("hero-badges")]}>
                    <span className={`${style[bem.e("badge")]} ${style[user.isOnline ? bem.em("badge", "online") : bem.em("badge", "offline")]}`}>
                      {user.isOnline ? "在线" : "离线"}
                    </span>
                    <span className={`${style[bem.e("badge")]} ${style[bem.em("badge", "role")]}`}>
                      {user.root ? "ROOT" : (user.permission?.role || "USER")}
                    </span>
                  </div>
                </div>
                <div className={style[bem.e("hero-action")]}>
                  <label>账号状态</label>
                  <Check
                    checked={user.isActive}
                    onChange={handleToggleStatus}
                    round
                    type="primary"
                  />
                </div>
              </div>

              <div className={style[bem.e("detail-grid")]}>
                <div className={style[bem.e("info-group")]}>
                  <label>基础信息</label>
                  <p><EmailIcon fontSize="inherit" /> {user.email || "未绑定邮箱"}</p>
                  <p><TimelineIcon fontSize="inherit" /> 最终登录: {fmtTime(user.lastLogin)}</p>
                  <p>
                    性别: {user.sex === "M" ? "男" : user.sex === "F" ? "女" : "保密"}
                    &nbsp;|&nbsp;年龄: {user.age || "24"}
                  </p>
                  <p>总活跃时长: {formatDuration(user.totalActiveTime || 0)}</p>
                </div>
                <div className={style[bem.e("info-group")]}>
                  <label>活跃习惯分布</label>
                  <div ref={pieRef} style={{ height: 200 }} />
                </div>
              </div>

              <div className={style[bem.e("info-group")]} style={{ marginTop: 28 }}>
                <label>本周活跃周期趋势</label>
                <div ref={lineRef} style={{ height: 200 }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Users() {
  const [userRes, setUserRes] = useState({ items: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [detailId, setDetailId] = useState(null);

  const loadData = useCallback(() => {
    systemAPI.getUserList({ page, pageSize, keyword: search || undefined })
      .then(res => {
        if (res?.code === 200) {
          setUserRes(res.data);
        } else {
          alert.failure(res?.message || "加载用户列表失败");
        }
      });
  }, [page, pageSize, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const onBatch = (action) => {
    if (!selected.length) return;
    confirm.show({
      title: "批量处理确认",
      content: `确定对选中的 ${selected.length} 个账户执行 [${action}] 操作吗？`,
      onConfirm: async () => {
        const res = await systemAPI.batchAction(selected, action);
        if (res?.code === 200) {
          alert.success("批量操作成功");
          loadData();
          setSelected([]);
        } else {
          alert.failure(res?.message || "操作未成功完成");
        }
      }
    });
  };

  const userColumns = [
    {
      label: '核心档案',
      prop: 'username',
      width: 220,
      render: (u) => (
        <div className={style[bem.e("u-cell")]}>
          <Avatar user={u} />
          <div className={style[bem.e("u-text")]}>
            <strong>{u.username}</strong>
            <span>@{u.account}</span>
          </div>
        </div>
      )
    },
    {
      label: '角色',
      prop: 'root',
      width: 100,
      render: (u) => (
        <span className={style[bem.e("u-tag")]}>
          {u.root ? 'ROOT' : (u.permission?.role || 'USER')}
        </span>
      )
    },
    {
      label: '总活跃时长',
      prop: 'totalActiveTime',
      width: 120,
      render: (u) => (
        <span className={style[bem.e("u-time")]}>{formatDuration(u.totalActiveTime)}</span>
      )
    },
    {
      label: '状态控制',
      prop: 'isActive',
      width: 100,
      render: (u) => (
        <Check
          checked={u.isActive}
          size="small"
          round
          onChange={v => systemAPI.toggleUserStatus(u.id, v).then(res => {
            if (res?.code === 200) {
              loadData();
              alert.success("状态已变更");
            } else {
              alert.failure(res?.message || "更新失败");
            }
          })}
        />
      )
    },
    {
      label: '实时网络',
      prop: 'isOnline',
      width: 100,
      render: (u) => (
        <span className={`${style[bem.e("u-status")]} ${u.isOnline ? style[bem.em("u-status", "online")] : ""}`}>
          {u.isOnline ? '在线' : '离线'}
        </span>
      )
    },
    {
      label: '最后活跃',
      prop: 'lastLogin',
      width: 160,
      render: (u) => (
        <span className={style[bem.e("u-time")]}>{fmtTime(u.lastLogin)}</span>
      )
    }
  ];

  const userActions = [
    {
      label: '查看',
      icon: <VisibilityIcon style={{ color: '#6366f1' }} />,
      onClick: (u) => setDetailId(u.id)
    },
    {
      label: '移除',
      icon: <DeleteIcon style={{ color: '#f43f5e' }} />,
      onClick: (u) => {
        confirm.show({
          title: "删除确认",
          content: `确认要彻底移除成员 ${u.username} 吗？`,
          onConfirm: async () => {
            const res = await systemAPI.batchAction([u.id], 'delete');
            if (res?.code === 200) {
              alert.success("用户已移除");
              loadData();
            } else {
              alert.failure(res?.message || "移除失败");
            }
          }
        });
      }
    }
  ];

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("toolbar")]}>
        <div className={style[bem.e("search-bar")]}>
          <SearchIcon fontSize="small" style={{ color: '#9ca3af' }} />
          <input
            placeholder="搜索账号、名称、邮箱..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div style={{ flex: 1 }} />
        {selected.length > 0 && (
          <div className={style[bem.e("batch-bar")]}>
            <span>已选 {selected.length} 人</span>
            <Button type="primary" plain size="small" onClick={() => onBatch('enable')}>批量启用</Button>
            <Button type="warning" plain size="small" onClick={() => onBatch('disable')}>批量禁用</Button>
            <Button type="danger" plain size="small" onClick={() => onBatch('delete')}>批量删除</Button>
          </div>
        )}
      </div>

      <div className={style[bem.e("list-card")]}>
        <PageList
          columns={userColumns}
          data={userRes.items}
          total={userRes.total}
          current={page}
          pageSize={pageSize}
          selectable
          onPageChange={setPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
          onSelectionChange={setSelected}
          actions={userActions}
          actionWidth={140}
        />
      </div>

      {detailId && (
        <UserDetailModal
          userId={detailId}
          onClose={() => setDetailId(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

export default Users;
