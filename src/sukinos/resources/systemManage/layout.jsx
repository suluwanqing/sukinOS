import { useState, useCallback } from "react";
import { useSelector } from "react-redux";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import Nav from '@/component/nav/layout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TimelineIcon from '@mui/icons-material/Timeline';
import Overview from './overview/layout';
import Users from './users/layout';
import Behavior from './behavior/layout';

const bem = createNamespace("system");

const NAV_ITEMS = [
  { id: "overview", label: "管理概览", icon: <DashboardIcon fontSize="small" /> },
  { id: "users", label: "成员中心", icon: <PeopleIcon fontSize="small" /> },
  { id: "behavior", label: "审计分析", icon: <TimelineIcon fontSize="small" /> }
];

export function Avatar({ user, size = 32 }) {
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

function SystemDashboard() {
  const [tab, setTab] = useState("overview");
  const currentUser = useSelector(s => s.user?.userInfo);

  return (
    <div className={style[bem.b()]}>
      <aside className={style[bem.e("sidebar")]}>
        <div className={style[bem.e("brand")]}>
          <div className={style[bem.e("logo")]} />
          <div className={style[bem.e("brand-name")]}>
            <strong>Admin Center</strong>
          </div>
        </div>
        <Nav items={NAV_ITEMS} activeId={tab} onChange={setTab} theme="dark" />
      </aside>

      <main className={style[bem.e("main")]}>
        <header className={style[bem.e("header")]}>
          <div className={style[bem.e("header-left")]}>
            <h2>{NAV_ITEMS.find(i => i.id === tab)?.label}</h2>
            <div className={style[bem.e("breadcrumb")]}>
              主控制台 / {NAV_ITEMS.find(i => i.id === tab)?.label}
            </div>
          </div>
          <div className={style[bem.e("header-right")]}>
            <div className={style[bem.e("profile")]}>
              <div className={style[bem.e("profile-info")]}>
                <strong>{currentUser?.username || "管理员"}</strong>
                <span>System Root</span>
              </div>
              <Avatar user={currentUser} size={42} />
            </div>
          </div>
        </header>

        <section className={style[bem.e("content")]}>
          {tab === "overview" && <Overview />}
          {tab === "users" && <Users />}
          {tab === "behavior" && <Behavior />}
        </section>
      </main>
    </div>
  );
}

export default SystemDashboard;
