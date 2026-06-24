import { useState, useEffect, useCallback } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import permissionManageAPI from "@/apis/system/permissionManage";
import sukinosAppManageAPI from "@/apis/system/sukinosAppManage";
import LockIcon from "@mui/icons-material/Lock";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import DnsIcon from "@mui/icons-material/Dns";

import PermissionRegistry from "./registry/layout";
import RolePanel from "./role/layout";
import MenuPermissionPanel from "./menuPermission/layout";
import RoutePermissionPanel from "./routePermission/layout";
import RegistryPowerPanel from "./registryPower/layout";
import MiddlewareWhitelistPanel from "./middlewareWhitelist/layout";
import { usePermission } from "@/hooks/usePermission/main";

const bem = createNamespace("system-permission");

const SECTIONS = [
  { id: "registry", label: "权限注册池", icon: <LockIcon fontSize="small" /> },
  { id: "role", label: "角色管理", icon: <SupervisorAccountIcon fontSize="small" /> },
  { id: "menuPermission", label: "菜单权限管理", icon: <VisibilityIcon fontSize="small" /> },
  { id: "routePermission", label: "路由权限管理", icon: <AltRouteIcon fontSize="small" /> },
  { id: "registryPower", label: "注册权管理", icon: <VpnKeyIcon fontSize="small" /> },
  { id: "middlewareWhitelist", label: "中间件白名单", icon: <DnsIcon fontSize="small" />, rootOnly: true },
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

  const renderContent = () => {
    switch (activeSection) {
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

  // 如果当前切到的 section 被过滤掉了（比如非 root 切到白名单），重置
  const activeVisible = visibleSections.find(s => s.id === activeSection);
  const displaySection = activeVisible?.id || visibleSections[0]?.id || "registry";

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("sidebar")]}>
        <div className={style[bem.e("sidebar-title")]}>权限管理</div>
        <div className={style[bem.e("menu")]}>
          {visibleSections.map(item => (
            <div
              key={item.id}
              className={[
                style[bem.e("menu-item")],
                style[bem.is("active", activeSection === item.id)]
              ].filter(Boolean).join(" ")}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={style[bem.e("content")]}>
        {renderContent()}
      </div>
    </div>
  );
}

export default PermissionManage;