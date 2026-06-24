import { instance } from "@/url/main";

export const getSystemStatus = async (data) => {
  return instance({
    method: 'GET',
    url: '/system/status',
    params: data
  });
};

const status = {
  getSystemStatus
};

export default status;
