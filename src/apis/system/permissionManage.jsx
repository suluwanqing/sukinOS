import instance from "@/url/main";

const permissionManageAPI = {
  // ── 权限注册表 ──
  getRegistry: async () => {
    return instance({ method: 'GET', url: '/system/permission/registry' });
  },
  registerApp: async (data) => {
    return instance({ method: 'POST', url: '/system/permission/registry', data });
  },

  // ── 系统APP访问控制 ──
  getSystemApps: async () => {
    return instance({ method: 'GET', url: '/system/permission/system-apps' });
  },
  getAvailableSystemApps: async () => {
    return instance({ method: 'GET', url: '/system/permission/system-apps/available' });
  },
  updateSystemAppAccess: async (data) => {
    const { appId, ...payload } = data || {};
    return instance({ method: 'PUT', url: `/system/permission/system-apps/${appId}`, data: payload });
  },
  createSystemApp: async (data) => {
    return instance({ method: 'POST', url: '/system/permission/system-apps', data });
  },
  deleteSystemApp: async (data) => {
    const { appId } = data || {};
    return instance({ method: 'DELETE', url: `/system/permission/system-apps/${appId}` });
  },

  // ── 注册权管理 ──
  getRegistryPower: async () => {
    return instance({ method: 'GET', url: '/system/permission/registry-power' });
  },
  updateRegistryPower: async (data) => {
    return instance({ method: 'PUT', url: '/system/permission/registry-power', data });
  },

  // ── 注册权检查 ──
  checkCanRegister: async () => {
    return instance({ method: 'GET', url: '/system/permission/can-register' });
  },

  // ── 当前用户有权限的 APP 资源 ID 列表 ──
  getMyAuthorizedIds: async () => {
    return instance({ method: 'GET', url: '/system/permission/my-authorized-ids' });
  },

  // ── APP 权限授权 ──
  assignAppActors: async (data) => {
    const { resourceId, ...payload } = data || {};
    return instance({ method: 'PUT', url: `/system/permission/registry/actors/${resourceId}`, data: payload });
  },

  // ── 菜单权限管理 ──
  getMenuPermissions: async () => {
    return instance({ method: 'GET', url: '/system/permission/menus' });
  },
  updateMenuPermissions: async (data) => {
    return instance({ method: 'PUT', url: '/system/permission/menus', data });
  },

  // ── API 路由权限管理 ──
  getRoutePermissions: async () => {
    return instance({ method: 'GET', url: '/system/permission/routes-permission' });
  },
  updateRoutePermission: async (data) => {
    const { routePath, ...payload } = data || {};
    return instance({ method: 'PUT', url: `/system/permission/routes-permission/${encodeURIComponent(routePath)}`, data: { ...payload, _routePath: routePath } });
  },
  seedRoutePermissions: async () => {
    return instance({ method: 'POST', url: '/system/permission/routes-permission/seed' });
  },

  // ── 角色管理 ──
  getRoleList: async () => {
    return instance({ method: 'GET', url: '/system/permission/role/list' });
  },
  createRole: async (data) => {
    return instance({ method: 'POST', url: '/system/permission/role/create', data });
  },
  updateRole: async (data) => {
    const { roleId, ...payload } = data || {};
    return instance({ method: 'PUT', url: `/system/permission/role/${roleId}`, data: payload });
  },
  deleteRole: async (data) => {
    const { roleId } = data || {};
    return instance({ method: 'DELETE', url: `/system/permission/role/${roleId}` });
  },
  getRoleUsers: async (data) => {
    const { roleId } = data || {};
    return instance({ method: 'GET', url: `/system/permission/role/users/${roleId}` });
  },
  assignUserRole: async (data) => {
    const { userId, ...payload } = data || {};
    return instance({ method: 'PUT', url: `/system/permission/role/user/role/${userId}`, data: payload });
  },

  // ── 中间件白名单配置 ──
  getMiddlewareWhitelist: async () => {
    return instance({ method: 'GET', url: '/system/permission/middleware-whitelist' });
  },
  updateMiddlewareWhitelist: async (data) => {
    return instance({ method: 'PUT', url: '/system/permission/middleware-whitelist', data });
  },
};

export default permissionManageAPI;