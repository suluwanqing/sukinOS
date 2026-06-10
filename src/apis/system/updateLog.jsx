import { instance } from "@/url/main";

export const getSystemUpdates = async () => {
  return instance({
    method: 'GET',
    url: '/system/update/log/list'
  });
};

export const createSystemUpdate = async (data) => {
  return instance({
    method: 'POST',
    url: '/system/update/log/create',
    data
  });
};

export const editSystemUpdate = async (data) => {
  const { id, ...payload } = data;
  return instance({
    method: 'PUT',
    url: `/system/update/log/edit/${id}`,
    data: payload
  });
};

export const deleteSystemUpdate = async (data) => {
  const { id } = data;
  return instance({
    method: 'DELETE',
    url: `/system/update/log/delete/${id}`
  });
};
export const getLatestSystemUpdate = async () => {
  return instance({
    method: 'GET',
    url: '/system/update/log/latest'
  });
}
const systemUpdateApi = {
  getSystemUpdates,
  createSystemUpdate,
  editSystemUpdate,
  deleteSystemUpdate,
  getLatestSystemUpdate
};

export default systemUpdateApi;
