import { instance } from "@/url/main";

/**
 * 获取全量系统 App 列表（支持分页、搜索、状态和用户过滤）
 * @param {Object} data 包含 current, pageSize, keyword, status, userId 等字段
 */
export const getSystemAppList = async (data) => {
  return instance({
    method: "GET",
    url: "/system/sukinos/appList",
    params: {
      current: data?.current,
      pageSize: data?.pageSize,
      keyword: data?.keyword,
      status: data?.status,
      userId: data?.userId
    }
  });
};

/**
 * 获取应用平台各项统计数值（新增）
 */
export const getAppStatistics = async () => {
  return instance({
    method: "GET",
    url: "/system/sukinos/statistics"
  });
};

/**
 * 变更或审核 App 状态
 * @param {Object} data 包含 resourceId, status, auditOpinion 等
 */
export const updateAppStatus = async (data) => {
  return instance({
    method: "POST",
    url: "/system/sukinos/updateStatus",
    data: {
      resourceId: data?.resourceId,
      status: data?.status,
      auditOpinion: data?.auditOpinion,
      metaInfo: data?.metaInfo
    }
  });
};

/**
 * 查询具体应用的深度细节
 * @param {Object} data 包含 resourceId
 */
export const getSystemAppDetail = async (data) => {
  const { resourceId } = data;
  return instance({
    method: "GET",
    url: `/system/sukinos/detail/${resourceId}`
  });
};

/**
 * 删除
 * @param {Object} data 包含 resourceId
 */
export const forceDeleteApp = async (data) => {
  const { resourceId } = data;
  return instance({
    method: "POST",
    url: `/system/sukinos/delete/${resourceId}`
  });
};

const sukinosAppManageAPI = {
  getSystemAppList,
  getAppStatistics,
  updateAppStatus,
  getSystemAppDetail,
  forceDeleteApp
};

export default sukinosAppManageAPI;
