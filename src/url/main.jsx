import axios from 'axios'
// 引入全局刷新中心和锁
import { authLock, executeTokenRefresh, authChannel } from '/utils/js/authLock'

import { BASE_URL } from '/utils/js/getBaseUrl';
import { checkRoutePermission, isRoutePermissionLoaded } from '@/middleware/routePermission/cache';

import { alert } from '@/component/alert/layout'

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) { prom.resolve(error) } else { prom.resolve(token) }
  })
  failedQueue = []
}

// 监听跨窗口频道的刷新结果
authChannel.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_REFRESH_SUCCESS' && isRefreshing) {
    processQueue(null)
    isRefreshing = false
  } else if (event.data.type === 'AUTH_REFRESH_FAIL' && isRefreshing) {
    processQueue({ code: 401, message: '跨窗口刷新失败', error: true })
    isRefreshing = false
  }
})

// 基础配置
const createInstance = (config = {}) => {
  return axios.create({
    baseURL: config.baseURL || '',
    timeout: config.timeout || 10000,
    headers: { 'Content-Type': 'application/json', ...config.headers },
    withCredentials: config.withCredentials !== false,
    ...config
  })
}

// 通用的响应拦截器配置
const setupResponseInterceptor = (instance) => {
  instance.interceptors.response.use(
    response => response.data,
    async error => {
      const { config, response } = error
      const originalRequest = config
      const skipErrorToast = originalRequest?.skipErrorToast || false

      // 处理无响应情况（如断网、超时、路由拦截）
      if (!response) {
        if (error._routeBlocked) {
          if (!skipErrorToast) {
            alert.failure(error.message || '权限不足')
          }
          return { code: 403, message: error.message || '权限不足', error: true }
        }

        // 转义原生 Axios 错误（断网、超时等）
        let networkErrorMessage = '网络连接失败，请稍后重试'
        if (error.message && error.message.includes('timeout')) {
          networkErrorMessage = '请求连接超时，请检查网络'
        } else if (error.message && error.message.includes('Network Error')) {
          networkErrorMessage = '网络异常，请确保网络连接正常'
        }

        if (!skipErrorToast) {
          alert.failure(networkErrorMessage)
        }
        return { code: 408, message: networkErrorMessage, error: true }
      }

      const status = response.status
      // 检查后端是否返回了结构化的 JSON 数据
      const hasStructuredData = response.data && typeof response.data === 'object'
      const backendData = hasStructuredData ? response.data : {}
      // 状态码中文转义解析
      let errorMessage = '系统响应异常'
      let isSystemError = false

      if (hasStructuredData) {
        // 如果后端返回了标准的结构化 JSON 格式，则直接提取后端提示
        errorMessage = backendData.message || backendData.msg || errorMessage
      } else {
        // 未返回结构化 JSON（例如 Nginx 级拦截、网关异常、空响应），属于系统级异常
        isSystemError = true

        switch (status) {
          case 400:
            errorMessage = '请求参数错误'
            break
          case 401:
            errorMessage = '登录状态已失效，请重新登录'
            break
          case 403:
            errorMessage = '拒绝访问，权限不足'
            break
          case 404:
            errorMessage = '请求的资源不存在'
            break
          case 405:
            errorMessage = '请求方法不允许'
            break
          case 408:
            errorMessage = '请求超时，请稍后重试'
            break
          case 500:
            errorMessage = '服务器异常，请稍后重试'
            break
          case 502:
          case 503:
            errorMessage = '服务器维护中，请稍后重试'
            break
          case 504:
            errorMessage = '网关响应超时'
            break
          default:
            if (error.message && error.message.includes('timeout')) {
              errorMessage = '请求超时，请检查网络'
            } else {
              errorMessage = '系统响应异常，请稍后重试'
            }
        }
      }

      // 处理 401 自动刷新 Token 逻辑 (静默处理，不弹窗)
      if (status === 401 && !originalRequest._retry) {

        if (authLock.isLoggingOut) {
          console.warn("[AuthInterceptor] 正在退出登录，拦截静默刷新请求")
          return {
            message: "正在退出...",
            code: 401,
            error: true
          }
        }

        // 刷新接口自身报 401，代表彻底过期
        if (originalRequest.url.includes('/user/status/refresh/token')) {
          isRefreshing = false
          const errPayload = { message: errorMessage, msg: errorMessage, code: 401, error: true }
          processQueue(errPayload)
          return errPayload
        }

        // 防抖队列
        if (isRefreshing) {
          return new Promise((resolve) => {
            failedQueue.push({ resolve, reject: resolve })
          }).then(() => instance(originalRequest)).catch(err => err)
        }

        originalRequest._retry = true
        isRefreshing = true

        return new Promise((resolve) => {
          executeTokenRefresh()
            .then(res => {
              processQueue(null)
              resolve(instance(originalRequest))
            })
            .catch(err => {
              const errPayload = { message: '登录过期，请重新登录', code: 401, error: true }
              processQueue(errPayload)
              resolve(errPayload)
            })
            .finally(() => {
              isRefreshing = false
            })
        })
      }


      // 仅在属于系统底层异常（非结构化响应）时，才触发全局 Alert。
      // 凡是后端正常处理并返回了 { code, message } 的请求，一律不触发全局弹窗。
      if (isSystemError && !skipErrorToast) {
        alert.failure(errorMessage)
      }

      // 返回标准格式的对象，不抛出 Promise.reject
      return {
        ...backendData,
        message: errorMessage,
        msg: errorMessage,
        code: backendData?.code || status,
        error: true
      }
    }
  )

  return instance
}

// 通用的请求拦截器配置 — 路由权限检查
const setupRequestInterceptor = (instance) => {
  instance.interceptors.request.use(
    config => {
      const path = config.url || '';

      if (path.includes('/system/permission/routes-permission')) {
        return config;
      }

      if (path.includes('/user/status/') || path.includes('/auth/')) {
        return config;
      }

      if (!isRoutePermissionLoaded()) {
        return config;
      }

      const method = (config.method || 'get').toUpperCase();
      if (!checkRoutePermission(method, path)) {
        return Promise.reject({
          code: 403,
          message: '权限不足：无权访问该接口',
          msg: '权限不足：无权访问该接口',
          error: true,
          _routeBlocked: true,
        });
      }

      return config;
    },
    error => Promise.reject(error)
  );
};

const instance = createInstance({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
setupRequestInterceptor(instance)
setupResponseInterceptor(instance)

const instanceWithoutBaseURL = createInstance({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
setupRequestInterceptor(instanceWithoutBaseURL)
setupResponseInterceptor(instanceWithoutBaseURL)

export { instance, instanceWithoutBaseURL }
export default instance
