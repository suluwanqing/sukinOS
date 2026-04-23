export const isApiSuccess = res => Number(res?.code) === 200

export const getApiData = (res, fallback = null) => {
  if (res && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'data')) {
    return res.data ?? fallback
  }
  return fallback
}

export const getApiMessage = (res, fallback = '请求失败') => {
  return res?.message || res?.msg || fallback
}

export const getErrorMessage = (error, fallback = '请求失败') => {
  return error?.message || error?.msg || fallback
}
