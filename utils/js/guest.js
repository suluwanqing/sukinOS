import store from '@/store/main' // 导入全局 Redux Store 实例
import { DEFAULT_USER_ID, GUEST_INFO } from '@/sukinos/utils/config' // 游客配置统一由 config 管理

// 统一的游客用户信息配置（定义见 config.js 的 GUEST_INFO，此处仅做再导出以兼容既有引用）
export { GUEST_INFO }

/**
 * 判定 sessionStorage 中是否存在游客标记
 * @returns {boolean}
 */
export const checkIsGuest = () => {
  return sessionStorage.getItem('isGuest') === 'true'
}

/**
 * 设置本地会话中的游客登录标记
 */
export const setGuestFlag = () => {
  sessionStorage.setItem('isGuest', 'true')
}

/**
 * 清除本地会话中的游客登录标记
 */
export const clearGuestFlag = () => {
  sessionStorage.removeItem('isGuest')
}

/**
 * 安全校验传入的用户数据对象是否满足游客且 ID 为 default 的双重判定条件
 * @param {Object} userInfo - 用户信息对象
 * @returns {boolean}
 */
export const isGuestWithDefaultId = userInfo => {
  return checkIsGuest() && userInfo?.id === DEFAULT_USER_ID
}

/**
 * 直接从全局 Redux Store 实例中读取状态，并判定当前是否为 default 游客
 * 方便其他非 React 组件（如拦截器、全局工具等）一键调用，统一状态源
 * @returns {boolean}
 */
export const checkIsGuestFromStore = () => {
  const state = store.getState()
  const userInfo = state?.sukinos?.userInfo || state?.sukinos?.user || state?.user || {}
  return isGuestWithDefaultId(userInfo)
}
