import { instance } from "@/url/main";

// 获取所有系统已注册路由
export const getAllRoutes = async () => {
  return instance({
    method: 'GET',
    url: '/system/systemconfig/routes'
  });
};

// 获取日志配置详情
export const getLogConfig = async () => {
  return instance({
    method: 'GET',
    url: '/system/systemconfig/info'
  });
};

// 更新日志配置
export const updateLogConfig = async (data) => {
  return instance({
    method: 'POST',
    url: '/system/systemconfig/update',
    data: data
  });
};

// 获取数据库全部系统静态字典配置项清单
export const getAllConfigs = async () => {
  return instance({
    method: 'GET',
    url: '/system/systemconfig/all'
  });
};

// 新增全局配置项
export const createConfigItem = async (data) => {
  return instance({
    method: 'POST',
    url: '/system/systemconfig/create',
    data: data
  });
};

// 更新指定配置项
export const updateConfigItem = async (data) => {
  return instance({
    method: 'POST',
    url: '/system/systemconfig/item/update',
    data: data
  });
};

// 物理删除全局静态配置项
export const deleteConfigItem = async (data) => {
  const { configKey } = data || {};
  return instance({
    method: 'DELETE',
    url: `/system/systemconfig/delete/${configKey}`
  });
};

// 专门用来从后端动态获取系统预制的模版字典以及保留键标识符数组
export const getSystemStaticConfig = async () => {
  return instance({
    method: 'POST',
    url: '/system/systemconfig/staticlist'
  });
};

// 读取 APP 上传体积上限的内存生效值（用户档/角色档/默认档 + 当前身份解析结果）
export const getUploadQuota = async () => {
  return instance({
    method: 'GET',
    url: '/system/systemconfig/upload-info'
  });
};

// 保存 APP 上传体积上限，后端落库后立即重载内存态
export const updateUploadQuota = async (data) => {
  return instance({
    method: 'POST',
    url: '/system/systemconfig/upload-update',
    data: data
  });
};

const sysConfigAPI = {
  getAllRoutes,
  getLogConfig,
  updateLogConfig,
  getAllConfigs,
  createConfigItem,
  updateConfigItem,
  deleteConfigItem,
  getSystemStaticConfig,
  getUploadQuota,
  updateUploadQuota
};

export default sysConfigAPI;