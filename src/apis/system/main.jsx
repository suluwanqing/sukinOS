import instance from "@/url/main";

const systemAPI = {
  getOverview: async () => {
    return instance({ method: 'GET', url: '/system/usermanage/overview' });
  },
  getUserList: async (params = {}) => {
    const { page = 1, pageSize = 10, keyword, isActive, isOnline } = params;
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

  getUserDetail: async (userId) => {
    return instance({ method: 'GET', url: `/system/usermanage/users/${userId}` });
  },

  toggleUserStatus: async (userId, isActive) => {
    return instance({
      method: 'PUT',
      url: `/system/usermanage/users/${userId}/status`,
      data: { is_active: isActive },
    });
  },

  updateUserInfo: async (userId, infoData) => {
    return instance({
      method: 'PUT',
      url: `/system/usermanage/users/${userId}/info`,
      data: infoData,
    });
  },

  updateUserPermission: async (userId, permission) => {
    return instance({
      method: 'PUT',
      url: `/system/usermanage/users/${userId}/permission`,
      data: { permission },
    });
  },

  deleteUser: async (userId) => {
    return instance({ method: 'DELETE', url: `/system/usermanage/users/${userId}` });
  },

  batchAction: async (userIds, action) => {
    return instance({
      method: 'POST',
      url: '/system/usermanage/users/batch',
      data: { userIds, action },
    });
  },
  getBehaviorOverview: async () => {
    return instance({ method: 'GET', url: '/system/usermanage/behavior/overview' });
  },
};

export default systemAPI;
