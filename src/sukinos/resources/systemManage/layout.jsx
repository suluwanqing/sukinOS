import { useState, useEffect, useMemo } from "react";
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
import LockIcon from '@mui/icons-material/Lock';
import Overview from './overview/layout';
import Users from './users/layout';
import Behavior from './behavior/layout';
import SystemUpdate from "./systemUpdate/layout";
import SystemLog from "./systemLog/layout";
import SystemConfig from "./systemConfig/layout";
import AppManage from "./appManage/layout";
import PermissionManage from "./permissionManage/layout";
import { DEFAULT_LOGO } from '@/sukinos/utils/config';
import { selectorUserInfo } from "@/sukinos/store";
import { usePermission } from "@/hooks/usePermission/main";
import systemAPI from '@/apis/system/main';

const bem = createNamespace("system");

// [后端初始化: 导航图标由 icon 字段映射]
const ICON_MAP = {
  Dashboard: <DashboardIcon fontSize="small" />,
  People: <PeopleIcon fontSize="small" />,
  Timeline: <TimelineIcon fontSize="small" />,
  Settings: <SettingsIcon fontSize="small" />,
  AccessTime: <AccessTimeIcon fontSize="small" />,
  FactCheck: <FactCheckIcon fontSize="small" />,
  Apps: <AppsIcon fontSize="small" />,
  Lock: <LockIcon fontSize="small" />,
};

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
  const [navItems, setNavItems] = useState([]);
  const currentUser = useSelector(selectorUserInfo);
  const { hasMenuPermission, isRoot } = usePermission();

  useEffect(() => {
    systemAPI.getNavItems().then(res => {
      if (res.code === 200) {
        const groups = ((res.data || {}).systemManage || []);
        // [层级导航：从后台 parent→children 结构扁平化为 Nav 的 flat list]
        const flat = [];
        groups.forEach(group => {
          (group.children || []).forEach(child => {
            flat.push({ ...child, icon: ICON_MAP[child.icon] || null });
          });
        });
        setNavItems(flat);
      }
    });
  }, []);

  const visibleNavItems = useMemo(() => {
    return navItems.filter(item => isRoot || hasMenuPermission(item.id));
  }, [navItems, isRoot, hasMenuPermission]);

  const activeNavItem = visibleNavItems.find(i => i.id === tab) || visibleNavItems[0];
  const activeLabel = activeNavItem?.label || "管理概览";
  const activeTabId = activeNavItem?.id || "overview";
  useEffect(() => {
    if (tab !== activeTabId) setTab(activeTabId);
  }, [activeTabId, tab]);

  const tabContentMap = {
    overview: <Overview />,
    users: <Users />,
    behavior: <Behavior />,
    systemUpdate: <SystemUpdate user={currentUser} />,
    systemLog: <SystemLog />,
    systemConfig: <SystemConfig />,
    appManage: <AppManage />,
    permissionManage: <PermissionManage />
  };
  const activeContent = tabContentMap[tab] || tabContentMap[activeTabId] || <Overview />;

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
        <Nav items={visibleNavItems} activeId={tab} onChange={setTab} theme="dark" />
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
