import { instanceWithoutBaseURL} from "@/url/main";

import {
  SUKINOS_STORE_REMOTE_UPLOAD, SUKINOS_STORE_REMOTE_TOTAL, SUKINOS_STORE_REMOTE_CHECK_UPDATES,
  SUKINOS_STORE_REMOTE_SEARCH, SUKINOS_STORE_REMOTE_MY_UPLOAD, SUKINOS_STORE_REMOTE_DELETE
} from "@/sukinos/utils/config"

export const uploadApp = async (data) => {
  const {url,formData}=data
  return  instanceWithoutBaseURL({
    method: 'POST',
    url: url || SUKINOS_STORE_REMOTE_UPLOAD,
    data:formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
};

export const downLoadApp = async (data) => {
  return  instanceWithoutBaseURL({
    method: 'GET',
    url: data?.url || data
  });
};

export const getApps = async (data) => {
  const { current = 1, pageSize = 1, url } = data || {};
  return  instanceWithoutBaseURL({
    method: 'GET',
    url: url || SUKINOS_STORE_REMOTE_TOTAL,
    params: { current, pageSize }
  });
};

export const checkAppsUpdate = async (data) => {
  const { installedList, url } = data || {};
  return  instanceWithoutBaseURL({
    method: 'POST',
    url: url || SUKINOS_STORE_REMOTE_CHECK_UPDATES,
    data: installedList
  });
};

// 注意这里部分url只是固定字段是预制的
export const searchApps = async (data) => {
  const { keyword, url } = data || {};
  return  instanceWithoutBaseURL({
    method: 'GET',
    url: `${url || SUKINOS_STORE_REMOTE_SEARCH}`,
    params: {
      keyword
    }
  });
};

export const getMyUploadApps = async (data = {}) => {
  // 注意这个接口是通过auth自动获取的
  const { url } = data;
  return  instanceWithoutBaseURL({
    method: 'GET',
    url: url || SUKINOS_STORE_REMOTE_MY_UPLOAD
  });
};

export const deleteMyUploadApp = async (data) => {
  const { resourceId, url } = data || {};
  return  instanceWithoutBaseURL({
    method: 'POST',
    url: `${url || SUKINOS_STORE_REMOTE_DELETE}`,
    params: {
      resourceId
    }
  });
};

const App = {
  uploadApp,
  downLoadApp,
  getApps,
  checkAppsUpdate,
  searchApps,
  getMyUploadApps,
  deleteMyUploadApp
};

export default App;
