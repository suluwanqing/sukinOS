import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import Nav from '@/component/nav/layout';
import Drawer from '@/component/drawer/layout';
import Button from '@/component/button/layout';
import { LayoutDashboard as DashboardIcon, Users as PeopleIcon, ChartGantt as TimelineIcon, Clock as AccessTimeIcon, ClipboardCheck as FactCheckIcon, Settings as SettingsIcon, LayoutGrid as AppsIcon, Lock as LockIcon, Menu as MenuIcon } from 'lucide-react';
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
import { useViewportMode } from '@/sukinos/hooks/useViewportMode';

const bem = createNamespace("system");

// 审核后台只允许 root 进入，菜单未配置时 usePermission 默认放行，必须再显式过滤一次
const ROOT_ONLY_TABS = new Set(["appManage"]);

// [后端初始化: 导航图标由 icon 字段映射]
const ICON_MAP = {
  Dashboard: <DashboardIcon size={18} />,
  People: <PeopleIcon size={18} />,
  Timeline: <TimelineIcon size={18} />,
  Settings: <SettingsIcon size={18} />,
  AccessTime: <AccessTimeIcon size={18} />,
  FactCheck: <FactCheckIcon size={18} />,
  Apps: <AppsIcon size={18} />,
  Lock: <LockIcon size={18} />,
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
  const [navOpen, setNavOpen] = useState(false);
  const [navItems, setNavItems] = useState([]);
  const currentUser = useSelector(selectorUserInfo);
  const { hasMenuPermission, isRoot } = usePermission();
  const { isMobile } = useViewportMode();

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
    return navItems.filter(item => {
      if (!isRoot && ROOT_ONLY_TABS.has(item.id)) return false;
      return isRoot || hasMenuPermission(item.id);
    });
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
  const activeContent = !isRoot && ROOT_ONLY_TABS.has(activeTabId)
    ? (
      <div style={{ padding: 16, color: "var(--text-secondary)" }}>
        应用管理仅对超级管理员开放
      </div>
    )
    : (tabContentMap[tab] || tabContentMap[activeTabId] || <Overview />);

  const renderSidebar = () => (
    <aside className={style[bem.e("sidebar")]}>
      <div className={style[bem.e("brand")]}>
        <div className={style[bem.e("logo")]}>
          <img src={DEFAULT_LOGO} alt="logo" />
        </div>
        <div className={style[bem.e("brand-name")]}>
          <strong>sukin</strong>
        </div>
      </div>
      <Nav
        items={visibleNavItems}
        activeId={tab}
        onChange={(id) => {
          setTab(id);
          setNavOpen(false);
        }}
        theme="dark"
        className="w-full border-r-0 bg-transparent flex-1"
      />
    </aside>
  );

  return (
    <div className={style[bem.b()]}>
      {!isMobile && renderSidebar()}

      <main className={style[bem.e("main")]}>
        <header className={style[bem.e("header")]}>
          <div className={style[bem.e("header-left")]}>
            {isMobile && (
              <Button
                variant="outline"
                size="icon-lg"
                className={style[bem.e("menu-btn")]}
                onClick={() => setNavOpen(true)}
                aria-label="打开管理导航"
              >
                <MenuIcon size={20} />
              </Button>
            )}
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
              <Avatar user={currentUser} size={36} />
            </div>
          </div>
        </header>

        <section className={style[bem.e("content")]}>
          {activeContent}
        </section>
      </main>

      {isMobile && (
        <Drawer
          open={navOpen}
          onClose={() => setNavOpen(false)}
          label="管理导航"
          style={{ backgroundColor: '#111827' }}
        >
          {renderSidebar()}
        </Drawer>
      )}
    </div>
  );
}

export default SystemDashboard;
