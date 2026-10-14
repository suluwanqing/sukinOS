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

/**
 * 取回应用的原始包字节（root-only）
 * 走 blob：后端成功时直接回文件流（无 code 字段），失败时回 JSON——
 * 两者只能在消费侧按 Blob 的 MIME 区分，所以这里不判 response.ok。
 * @param {Object} data 包含 resourceId
 */
export const downloadAppPackage = async (data) => {
  const { resourceId } = data;
  return instance({
    method: "GET",
    url: `/system/sukinos/download/${encodeURIComponent(resourceId)}`,
    responseType: "blob",
    // 默认 10s 对整包下载太短，这里单独放宽
    timeout: 120000,
    // 失败文案由弹窗自己按状态码给出，不叠全局 toast
    skipErrorToast: true
  });
};

const sukinosAppManageAPI = {
  getSystemAppList,
  getAppStatistics,
  updateAppStatus,
  getSystemAppDetail,
  forceDeleteApp,
  downloadAppPackage
};

export default sukinosAppManageAPI;
