import axios from 'axios'
// 引入全局刷新中心和锁
import { authLock, executeTokenRefresh, authChannel } from '/utils/js/authLock';

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) { prom.reject(error) } else { prom.resolve(token) }
  })
  failedQueue = []
}

// 监听跨窗口频道的刷新结果，如果其他窗口刷新成功，本窗口释放队列
authChannel.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_REFRESH_SUCCESS' && isRefreshing) {
    processQueue(null);
    isRefreshing = false;
  } else if (event.data.type === 'AUTH_REFRESH_FAIL' && isRefreshing) {
    processQueue(new Error('Cross-tab Refresh Fail'));
    isRefreshing = false;
  }
});

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

      if (!response) {
        return Promise.reject({ code: 408, message: '网络连接失败', error: true })
      }

      const status = response.status
      const backendData = response.data || {}
      const errorMessage = backendData.message || backendData.msg || error.message || '系统响应异常';

      // 处理 401
      if (status === 401 && !originalRequest._retry) {

        // 如果当前正在执行登出操作，拦截所有 401 的自动刷新逻辑
        // 防止后端刚删掉会话，前端又通过 refresh 接口把它“救”回来
        if (authLock.isLoggingOut) {
          console.warn("[AuthInterceptor] 正在退出登录，拦截静默刷新请求");
          return Promise.reject({
            message: "正在退出...",
            code: 401,
            error: true
          });
        }

        // 刷新接口也报 401，说明彻底过期
        if (originalRequest.url.includes('/user/status/refresh/token')) {
          isRefreshing = false
          processQueue(new Error('Refresh Fail'))
          return Promise.reject({
            message: errorMessage,
            msg: errorMessage,
            code: 401,
            error: true
          })
        }

        // 拦截器内部防抖队列
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then(() => instance(originalRequest)).catch(err => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        return new Promise((resolve, reject) => {
          //调用全局统一的刷新方法，取代直接发请求
          executeTokenRefresh()
            .then(res => {
              processQueue(null)
              resolve(instance(originalRequest))
            })
            .catch(err => {
              processQueue(err)
              reject(err)
            })
            .finally(() => {
              isRefreshing = false
            })
        })
      }

      return Promise.reject({
        ...backendData,
        message: errorMessage,
        msg: errorMessage,
        code: backendData?.code || status,
        error: true
      })
    }
  )

  return instance
}

const instance = createInstance({
  baseURL: 'https://sukin.top/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
setupResponseInterceptor(instance)

const instanceWithoutBaseURL = createInstance({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
setupResponseInterceptor(instanceWithoutBaseURL)

export { instance, instanceWithoutBaseURL }
export default instance
