import instance from "@/url/main";

const requestLogAPI = {
  getLogList: async (data) => {
    const { page = 1, pageSize = 12, keyword, success, method, operator, startTs, endTs } = data || {};
    return instance({
      method: "GET",
      url: "/system/log/list",
      params: {
        page,
        page_size: pageSize,
        ...(keyword !== undefined && { keyword }),
        ...(success !== undefined && { success }),
        ...(method !== undefined && { method }),
        ...(operator !== undefined && { operator }),
        ...(startTs !== undefined && { start_ts: startTs }),
        ...(endTs !== undefined && { end_ts: endTs })
      }
    });
  },
  getLogStats: async (data) => {
    const { startTs, endTs } = data || {};
    return instance({
      method: "GET",
      url: "/system/log/stats",
      params: {
        ...(startTs !== undefined && { start_ts: startTs }),
        ...(endTs !== undefined && { end_ts: endTs })
      }
    });
  },
  getLogDetail: async (data) => {
    const { logId } = data || {};
    return instance({ method: "GET", url: `/system/log/detail/${logId}` });
  },
  deleteLog: async (data) => {
    const { logId } = data || {};
    return instance({ method: "DELETE", url: `/system/log/delete/${logId}` });
  },
  deleteLogs: async (data) => {
    const { ids } = data || {};
    return instance({
      method: "POST",
      url: "/system/log/batch/delete",
      data: { ids }
    });
  },
  exportLogs: async (data) => {
    const { keyword, success, method, operator, startTs, endTs } = data || {};
    return instance({
      method: "GET",
      url: "/system/log/export",
      params: {
        ...(keyword !== undefined && { keyword }),
        ...(success !== undefined && { success }),
        ...(method !== undefined && { method }),
        ...(operator !== undefined && { operator }),
        ...(startTs !== undefined && { start_ts: startTs }),
        ...(endTs !== undefined && { end_ts: endTs })
      },
      responseType: "blob"
    });
  }
};

export default requestLogAPI;