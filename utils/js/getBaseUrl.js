const isDev = import.meta.env.DEV
const urlPrefix = import.meta.env.VITE_ENV_URL_PREFIX
const prodBaseUrl = import.meta.env.VITE_PROD_NET_BASE_URL

// 开发环境走代理(使用urlPrefix)，生产环境走绝对路径拼接
export const BASE_URL = isDev ? urlPrefix : `${prodBaseUrl}${urlPrefix}`
