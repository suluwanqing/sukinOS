import { useState } from "react";
import { useSelector } from "react-redux";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import Nav from '@/component/nav/layout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SettingsIcon from "@mui/icons-material/Settings";
import AppsIcon from '@mui/icons-material/Apps';
import Overview from './overview/layout';
import Users from './users/layout';
import Behavior from './behavior/layout';
import SystemUpdate from "./systemUpdate/layout";
import SystemLog from "./systemLog/layout";
import SystemConfig from "./systemConfig/layout";
import AppManage from "./appManage/layout";
import { DEFAULT_LOGO } from '@/sukinos/utils/config';
import { selectorUserInfo } from "@/sukinos/store";

const bem = createNamespace("system");

const NAV_ITEMS = [
  { id: "overview", label: "管理概览", icon: <DashboardIcon fontSize="small" /> },
  { id: "users", label: "成员中心", icon: <PeopleIcon fontSize="small" /> },
  { id: "behavior", label: "审计分析", icon: <TimelineIcon fontSize="small" /> },
  { id: "systemConfig", label: "系统配置", icon: <SettingsIcon fontSize="small" /> },
  { id: "systemUpdate", label: "更新日志", icon: <AccessTimeIcon fontSize="small" /> },
  { id: "systemLog", label: "系统日志", icon: <FactCheckIcon fontSize="small" /> },
  { id: "appManage", label: "应用管理", icon: <AppsIcon fontSize="small" /> }
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
  const currentUser = useSelector(selectorUserInfo);
  const activeNavItem = NAV_ITEMS.find(i => i.id === tab);
  const activeLabel = activeNavItem?.label || "管理概览";
  const tabContentMap = {
    overview: <Overview />,
    users: <Users />,
    behavior: <Behavior />,
    systemUpdate: <SystemUpdate user={currentUser} />,
    systemLog: <SystemLog />,
    systemConfig: <SystemConfig />,
    appManage: <AppManage />
  };
  const activeContent = tabContentMap[tab] || <Overview />;

  return (
    <div className={style[bem.b()]}>
      <aside className={style[bem.e("sidebar")]}>
        <div className={style[bem.e("brand")]}>
          <div className={style[bem.e("logo")]}>
            <img src={DEFAULT_LOGO} alt="logo" />
          </div>
          <div className={style[bem.e("brand-name")]}>
            <strong>sukin</strong>
          </div>
        </div>
        <Nav items={NAV_ITEMS} activeId={tab} onChange={setTab} theme="dark" />
      </aside>

      <main className={style[bem.e("main")]}>
        <header className={style[bem.e("header")]}>
          <div className={style[bem.e("header-left")]}>
            <h2>{activeLabel}</h2>
            <div className={style[bem.e("breadcrumb")]}>
              主控制台 / {activeLabel}
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
          {activeContent}
        </section>
      </main>
    </div>
  );
}

export default SystemDashboard;
