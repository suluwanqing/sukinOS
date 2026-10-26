import { useState, useEffect, useCallback } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import { Lock as LockIcon, KeyRound as VpnKeyIcon, Eye as VisibilityIcon, Route as AltRouteIcon, UserCog as SupervisorAccountIcon, Server as DnsIcon } from 'lucide-react';

import PermissionRegistry from "./registry/layout";
import RolePanel from "./role/layout";
import MenuPermissionPanel from "./menuPermission/layout";
import RoutePermissionPanel from "./routePermission/layout";
import RegistryPowerPanel from "./registryPower/layout";
import MiddlewareWhitelistPanel from "./middlewareWhitelist/layout";
import { usePermission } from "@/hooks/usePermission/main";

const bem = createNamespace("system-permission");

const SECTIONS = [
  { id: "registry", label: "权限注册池", icon: <LockIcon size={17} /> },
  { id: "role", label: "角色管理", icon: <SupervisorAccountIcon size={17} /> },
  { id: "menuPermission", label: "菜单权限管理", icon: <VisibilityIcon size={17} /> },
  { id: "routePermission", label: "路由权限管理", icon: <AltRouteIcon size={17} /> },
  { id: "registryPower", label: "注册权管理", icon: <VpnKeyIcon size={17} /> },
  { id: "middlewareWhitelist", label: "中间件白名单", icon: <DnsIcon size={17} />, rootOnly: true },
];

function PermissionManage() {
  const { isRoot } = usePermission();
  const [activeSection, setActiveSection] = useState("registry");
  const [appList, setAppList] = useState([]);
  const [registryMap, setRegistryMap] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [appRes, regRes] = await Promise.all([
        sukinosAppManageAPI.getSystemAppList({ current: 1, pageSize: 100 }),
        permissionManageAPI.getRegistry()
      ]);
      if (appRes.code === 200) setAppList(appRes.data?.items || []);
      if (regRes.code === 200) {
        const map = {};
        (regRes.data || []).forEach(r => {
          const id = r.resourceId || r.resource_id;
          const enabled = r.permissionEnabled ?? r.permission_enabled;
          if (enabled !== false) map[id] = r;
        });
        setRegistryMap(map);
      }
    } catch (e) { console.error("加载数据失败", e); }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const visibleSections = SECTIONS.filter(s => !s.rootOnly || isRoot);


  const activeVisible = visibleSections.find(s => s.id === activeSection);
  const displaySection = activeVisible?.id || visibleSections[0]?.id || "registry";

  useEffect(() => {
    if (activeSection !== displaySection) {
      setActiveSection(displaySection);
    }
  }, [displaySection, activeSection]);

  const renderContent = (currentSection) => {
    switch (currentSection) {
      case "registry":
        return <PermissionRegistry appList={appList} registryMap={registryMap} onRefresh={fetchData} />;
      case "role":
        return <RolePanel />;
      case "menuPermission":
        return <MenuPermissionPanel />;
      case "routePermission":
        return <RoutePermissionPanel />;
      case "registryPower":
        return <RegistryPowerPanel />;
      case "middlewareWhitelist":
        return <MiddlewareWhitelistPanel />;
      default:
        return null;
    }
  };

  return (
    <div className={style[bem.b()]}>
      <aside className={style[bem.e("sidebar")]}>
        <div className={style[bem.e("sidebar-title")]}>权限管理</div>
        <div className={style[bem.e("menu")]}>
          {visibleSections.map(item => (
            <div
              key={item.id}
              className={[
                style[bem.e("menu-item")],
                style[bem.is("active", displaySection === item.id)]
              ].filter(Boolean).join(" ")}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </aside>
      <main className={style[bem.e("content")]}>
        {renderContent(displaySection)}
      </main>
    </div>
  );
}

export default PermissionManage;
