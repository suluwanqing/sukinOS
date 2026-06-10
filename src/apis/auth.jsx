import instance from "@/url/main";

export const asistant = {
  getVerificationCode: async (data) => {
    const { account, message, type = 'login',seed} = data;
    return instance({
      method: 'GET',
      url: '/user/status/VerificationCode/get',
      params: { account, message, type ,seed}
    })
  },

  judgeVerificationCode: async (data) => {
    const { id, code, account, type = 'login',seed } = data;
    return instance({
      method: 'POST',
      url: '/user/status/VerificationCode/judge',
      data: { id, code, account, type ,seed}
    })
  }
}

export const login = async (data) => {
  const { account, password, code, codeId, type = 'account', remember = false ,seed} = data;

  const payload = {
    account,
    type,
    remember: !!remember
  };

  if (type === 'account') {
    payload.password = password;
  } else if (type === 'code') {
    payload.code = code;
    payload.codeId = codeId;
  }

  return instance({
    method: 'POST',
    url: '/user/status/token',
    data: payload,
    params: {seed}
  });
}

export const user = {
  checkToken: async (data = {}) => {
    return instance({
      method: 'GET',
      url: "/user/status/judge/access_token"
    })
  },

  logout: async (data = {}) => {
    return instance({
      method: 'POST',
      url: "/user/status/logout"
    })
  },
  // refreshToken: async () => {
  //   return instance({
  //     method: 'POST',
  //     url: "/user/status/refresh/token"
  //   })
  // },
  updateUserInfo: async (data) => {
    const {submitData,seed}=data
    return instance({
      method: 'POST',
      url: "/user/status/profile/update",
      data:submitData,
      params: {seed},
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
  },

  updatePassword: async (data) => {
    const { seed}=data
    return instance({
      method: 'POST',
      url: "/user/status/password/update",
      data,
      params: {seed}
    })
  }
}

const auth = { asistant, login, user };
export default auth;
