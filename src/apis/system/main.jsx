import instance from "@/url/main";

const systemAPI = {
  getCurrentUserProfile: async () => {
    return instance({ method: 'GET', url: '/system/usermanage/profile' });
  },
  getOverview: async () => {
    return instance({ method: 'GET', url: '/system/usermanage/overview' });
  },
  getUserList: async (data) => {
    const { page = 1, pageSize = 10, keyword, isActive, isOnline } = data || {};
    return instance({
      method: 'GET',
      url: '/system/usermanage/users',
      params: {
        page,
        page_size: pageSize,
        ...(keyword !== undefined && { keyword }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(isOnline !== undefined && { is_online: isOnline }),
      },
    });
  },

  getUserDetail: async (data) => {
    const { userId } = data || {};
    return instance({ method: 'GET', url: `/system/usermanage/users/${userId}` });
  },

  toggleUserStatus: async (data) => {
    const { userId, isActive } = data || {};
    return instance({
      method: 'PUT',
      url: `/system/usermanage/users/${userId}/status`,
      data: { is_active: isActive },
    });
  },

  updateUserInfo: async (data) => {
    const { userId, ...infoData } = data || {};
    return instance({
      method: 'PUT',
      url: `/system/usermanage/users/${userId}/info`,
      data: infoData,
    });
  },

  updateUserPermission: async (data) => {
    const { userId, permission } = data || {};
    return instance({
      method: 'PUT',
      url: `/system/usermanage/users/${userId}/permission`,
      data: { permission },
    });
  },

  deleteUser: async (data) => {
    const { userId } = data || {};
    return instance({ method: 'DELETE', url: `/system/usermanage/users/${userId}` });
  },

  batchAction: async (data) => {
    const { userIds, action } = data || {};
    return instance({
      method: 'POST',
      url: '/system/usermanage/users/batch',
      data: { userIds, action },
    });
  },
  getBehaviorOverview: async () => {
    return instance({ method: 'GET', url: '/system/usermanage/behavior/overview' });
  },
  getNavItems: async () => {
    return instance({ method: 'GET', url: '/system/systemconfig/nav-items' });
  },
};

export default systemAPI;