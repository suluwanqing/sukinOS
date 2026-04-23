import instance from "@/url/main";

export const bountyUploadImage = async (data) => {
  const { file } = data;
  const fd = new FormData();
  fd.append('file', file);
  return instance({
    method: 'POST',
    url: '/sukinos/bounty/upload-image',
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const bountyCreate = async (data) => {
  return instance({
    method: 'POST',
    url: '/sukinos/bounty/create',
    data,
  });
};

export const bountyList = async (data) => {
  const { params } = data || {};
  return instance({
    method: 'GET',
    url: '/sukinos/bounty/list',
    params,
  });
};

export const bountyMine = async (data = {}) => {
  return instance({
    method: 'GET',
    url: '/sukinos/bounty/mine',
  });
};

export const bountyMyDeliveries = async (data = {}) => {
  return instance({
    method: 'GET',
    url: '/sukinos/bounty/my-deliveries',
  });
};

export const bountyTransfersReceived = async (data = {}) => {
  return instance({
    method: 'GET',
    url: '/sukinos/bounty/transfers/received',
  });
};

export const bountyTransfersSent = async (data = {}) => {
  return instance({
    method: 'GET',
    url: '/sukinos/bounty/transfers/sent',
  });
};

export const bountyDetail = async (data) => {
  const { id } = data;
  return instance({
    method: 'GET',
    url: `/sukinos/bounty/${id}`,
  });
};

export const bountyUpdate = async (data) => {
  const { id, payload } = data;
  return instance({
    method: 'PUT',
    url: `/sukinos/bounty/${id}`,
    data: payload,
  });
};

export const bountyCancel = async (data) => {
  const { id } = data;
  return instance({
    method: 'PUT',
    url: `/sukinos/bounty/${id}/cancel`,
  });
};

export const bountyDeliverySubmit = async (data) => {
  const { id, payload } = data;
  return instance({
    method: 'POST',
    url: `/sukinos/bounty/${id}/delivery`,
    data: payload,
  });
};

export const bountyDeliveries = async (data) => {
  const { id } = data;
  return instance({
    method: 'GET',
    url: `/sukinos/bounty/${id}/deliveries`,
  });
};

export const bountyDeliveryAccept = async (data) => {
  const { id, did } = data;
  return instance({
    method: 'PUT',
    url: `/sukinos/bounty/${id}/delivery/${did}/accept`,
  });
};

export const bountyDeliveryReject = async (data) => {
  const { id, did, payload } = data;
  return instance({
    method: 'PUT',
    url: `/sukinos/bounty/${id}/delivery/${did}/reject`,
    data: payload,
  });
};

export const bountyTransfer = async (data) => {
  const { id, payload } = data;
  return instance({
    method: 'POST',
    url: `/sukinos/bounty/${id}/transfer`,
    data: payload,
  });
};

export const bountyTransferRespond = async (data) => {
  const { tid, payload } = data;
  return instance({
    method: 'PUT',
    url: `/sukinos/bounty/transfer/${tid}/respond`,
    data: payload,
  });
};

export const bountyTransferCancel = async (data) => {
  const { tid } = data;
  return instance({
    method: 'PUT',
    url: `/sukinos/bounty/transfer/${tid}/cancel`,
  });
};

const Bounty = {
  bountyUploadImage,
  bountyCreate,
  bountyList,
  bountyMine,
  bountyMyDeliveries,
  bountyTransfersReceived,
  bountyTransfersSent,
  bountyDetail,
  bountyUpdate,
  bountyCancel,
  bountyDeliverySubmit,
  bountyDeliveries,
  bountyDeliveryAccept,
  bountyDeliveryReject,
  bountyTransfer,
  bountyTransferRespond,
  bountyTransferCancel,
};

export default Bounty;
