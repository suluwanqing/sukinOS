import axios from 'axios'
// 导入 store 实例 and actions
import store from '@/store/main'
import {sukinOsActions} from '@/sukinos/store'
import {confirm} from '@/component/confirm/layout'
import loginDateWs from '/utils/js/socket/loginDate/main'
// 基础登出锁
export const authLock = {
  isLoggingOut: false,
}

// 自动刷新 token 相关变量
const REFRESH_INTERVAL = 30 * 60 * 1000 // 30分钟
let refreshTimer = null // 定时器ID
let lastRefreshTime = 0 // 上次刷新时间戳
let pendingRefreshPromise = null // 防止同页面并发刷新

// 跨窗口通信频道
const authChannel = new BroadcastChannel('sukin_auth_channel')

// 创建专门用于刷新 token 的 axios 实例，避免与业务实例产生循环拦截
const refreshInstance = axios.create({
  baseURL: 'https://sukin.top/api',
  timeout: 10000,
  headers: {'Content-Type': 'application/json'},
  withCredentials: true,
})

/**
 * 检查跨窗口锁是否有效 (锁存活时间10秒，防止某标签页崩溃导致死锁)
 */
const isCrossTabLockActive = () => {
  const lockTime = parseInt(localStorage.getItem('sukin_refresh_lock_time') || '0', 10)
  return Date.now() - lockTime < 10000
}

const setCrossTabLock = () => localStorage.setItem('sukin_refresh_lock_time', Date.now().toString())
const clearCrossTabLock = () => localStorage.removeItem('sukin_refresh_lock_time')

/**
 * 核心刷新 token 逻辑[带跨窗口防抖]
 * 无论是 Axios 拦截器 还是 定时器，都必须调用此方法！
 * @returns {Promise} 返回刷新结果的 Promise
 */
export const executeTokenRefresh = async () => {
  //如果当前窗口已经有正在进行的刷新，直接等待该 Promise
  if (pendingRefreshPromise) {
    return pendingRefreshPromise
  }

  //如果其他窗口正在刷新，挂起当前请求，监听广播结果
  if (isCrossTabLockActive()) {
    console.log('[AuthRefresher] 另一个窗口正在刷新 Token，当前窗口等待中...')
    return new Promise((resolve, reject) => {
      const listener = event => {
        if (event.data.type === 'AUTH_REFRESH_SUCCESS') {
          authChannel.removeEventListener('message', listener)
          // 跨窗口同步：其他窗口刷新成功，本窗口同步更新 Redux 用户信息
          if (event.data.user) {
            store.dispatch(sukinOsActions.setUserInfo(event.data.user))
          }
          resolve({code: 200, msg: '由其他窗口刷新成功'})
        } else if (event.data.type === 'AUTH_REFRESH_FAIL') {
          authChannel.removeEventListener('message', listener)
          // 如果其他窗口刷新失败，本窗口也停止定时器
          stopAutoRefresh()

          // 监听到其他窗口认证失败，销毁当前窗口的 WebSocket 实例
          loginDateWs.destroyWSInstance()

          reject(new Error('其他窗口刷新失败'))
        }
      }
      authChannel.addEventListener('message', listener)
    })
  }

  // 当前窗口获得刷新权，上锁并广播开始
  setCrossTabLock()
  authChannel.postMessage({type: 'AUTH_REFRESH_START'})

  pendingRefreshPromise = refreshInstance
    .post('/user/status/refresh/token')
    .then(res => {
      const data = res.data // 注意 axios 返回的是包裹在 data 里的
      if (data && data.code === 200) {
        lastRefreshTime = Date.now()
        clearCrossTabLock() // 释放锁

        // 成功处理：更新 Redux 中的用户信息
        if (data.user) {
          store.dispatch(sukinOsActions.setUserInfo(data.user))
        }

        // 成功处理：广播消息并携带用户信息供其他窗口同步
        authChannel.postMessage({
          type: 'AUTH_REFRESH_SUCCESS',
          user: data.user,
        })

        return data
      } else {
        throw new Error('Refresh Fail Backend Reject')
      }
    })
    .catch(err => {
      console.error('[AuthRefresher] Token 刷新失败:', err)
      clearCrossTabLock() // 释放锁

      // 失败处理：停止自动刷新定时器
      stopAutoRefresh()

      // 当前窗口刷新失败（认证过期/断网），立即销毁 WebSocket 实例
      loginDateWs.destroyWSInstance()

      // 失败处理：清空 Redux 中的用户信息
      store.dispatch(sukinOsActions.setUserInfo({}))

      // 失败处理：广播失败消息给其他窗口
      authChannel.postMessage({type: 'AUTH_REFRESH_FAIL'})

      // 失败处理：强制刷新页面
      setTimeout(() => {
        confirm.show({
          title: '认证信息过期/网络有问题!',
          content: '请检查网络后重新登录!',
          showCancel: false,
          onConfirm: () => {
            window.location.reload()
            // 执行删除逻辑
          },
        })
      }, 3000)

      throw err
    })
    .finally(() => {
      pendingRefreshPromise = null // 清除当前页面的 promise
    })

  return pendingRefreshPromise
}

/**
 * 调度下一次刷新
 */
export const scheduleNextRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }
  const now = Date.now()
  const timeSinceLastRefresh = now - lastRefreshTime
  let waitTime = REFRESH_INTERVAL - timeSinceLastRefresh

  // 如果等待时间为负数[说明已经超时]或首次启动（lastRefreshTime为0）
  if (lastRefreshTime === 0 || waitTime <= 0) {
    waitTime = REFRESH_INTERVAL
  }

  // 使用 setTimeout 设置下一次刷新，waitTime 保证了严格的时间间隔
  refreshTimer = setTimeout(async () => {
    try {
      // 即使定时器触发，也要经过统一的核心刷新逻辑（受跨窗口锁保护）
      await executeTokenRefresh()
      // 刷新成功后，递归调度下一次刷新
      scheduleNextRefresh()
    } catch (error) {
      console.error('[AuthRefresher] 自动刷新 token 失败，30秒后重试:', error)
      // 刷新失败后，30秒后重试一次
      refreshTimer = setTimeout(() => {
        scheduleNextRefresh()
      }, 30000)
    }
  }, waitTime)
}

/**
 * 停止自动刷新
 */
export const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  lastRefreshTime = 0
  // 注意：不要在这里清空 pendingRefreshPromise，可能会阻断正在进行的请求
}

/**
 * 启动自动刷新
 */
export const startAutoRefresh = () => {
  // 先停止之前的刷新
  stopAutoRefresh()
  // 立即执行一次刷新，更新 lastRefreshTime
  executeTokenRefresh()
    .then(() => {
      // 刷新成功后开始调度
      scheduleNextRefresh()
    })
    .catch(() => {
      // 首次刷新失败，延迟30秒后重试
      refreshTimer = setTimeout(() => {
        startAutoRefresh()
      }, 30000)
    })
}

// 暴露频道供其他地方[Axios 队列]监听使用
export {authChannel}
