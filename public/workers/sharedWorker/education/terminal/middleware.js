import {sharedWorkerManager} from '/public/workers/sharedWorker/WorkerManager.js'
import generateShortSeed from '/utils/js/rootSeed'
import {createApiProcessTrigger, killApiProcessTrigger} from '@/apps/Education/store/terminal'
const rootSeed = generateShortSeed()
const createEducationTerminalMiddleware = () => {
  return store => {
    // 延迟初始化逻辑：利用管理器状态锁确保单例，利用 IdleCallback 避免卡死
    const initWorker = () => {
      const sliceId = 'education/terminal'
      // 检查管理器状态，确保单例不被重复触发
      if (sharedWorkerManager.isInitialized(sliceId)) return
      // 使用 requestIdleCallback 在浏览器空闲时初始化，防止首页加载卡顿
      const deferredInit = window.requestIdleCallback || (cb => setTimeout(cb, 200))
      deferredInit(() => {
        // console.log('教育-Terminal模块: 正在延时初始化 Worker...')
        sharedWorkerManager.registerWorker(
          sliceId,
          '/workers/sharedWorker/education/terminal/worker.js'
        )
        // 设置消息监听 - 处理从 Worker 发来的同步请求
        sharedWorkerManager.addListener(sliceId, data => {
          // 常规 Redux 状态同步
          if (data.type === 'EDUCATION_TERMINAL_SYNC') {
            store.dispatch({
              type: 'education-webcontainer/syncState',
              payload: data.payload.terminal,
              meta: {source: 'worker'}, // 标记来源，防止循环
            })
          }
          // API 进程创建监听消息
          if (data.type === 'EDUCATION_TERMINAL_CREATEAPIPROCESS_SYNC') {
            // 只有来源 Seed 不同（非本窗口发起）才处理
            if (data.sourceSeed !== rootSeed) {
              store.dispatch(
                createApiProcessTrigger({
                  projectId: data.payload.projectId,
                  sourceSeed: data.sourceSeed,
                  source: 'worker', // 关键标识：防止二次向 Worker 发送
                })
              )
            }
          }
          // API 进程杀死消息
          if (data.type === 'EDUCATION_TERMINAL_CREATEAPIPROCESSKILL_SYNC') {
            if (data.sourceSeed !== rootSeed) {
              store.dispatch(
                killApiProcessTrigger({
                  projectId: data.payload.projectId,
                  apiProcessId: data.payload.apiProcessId,
                  sourceSeed: data.sourceSeed,
                  source: 'worker',
                })
              )
            }
          }
        })
      })
    }
    return next => action => {
      // 触发延迟初始化
      initWorker()
      const result = next(action)
      //常规状态同步 (带有 sync 标记且非来自 worker)
      if (
        action.type.startsWith('education-webcontainer') &&
        action.meta?.sync &&
        action.meta?.source !== 'worker'
      ) {
        try {
          const state = store.getState()
          sharedWorkerManager.postMessage('education/terminal', {
            type: 'EDUCATION_TERMINAL_SYNC',
            payload: {
              terminal: state.education.terminal,
              action: {
                type: action.type,
                payload: action.payload,
              },
            },
            timestamp: Date.now(),
          })
        } catch (error) {
          console.warn('教育-Terminal模块: 常规同步失败:', error)
        }
      }
      // API 进程创建监听 (Fulfilled 状态同步)
      if (
        action.type.startsWith('education/terminal/createApiprocess/trigger/fulfilled') &&
        action.payload?.source !== 'worker' // 确保不是来自 worker 的反馈，防止死循环
      ) {
        try {
          sharedWorkerManager.postMessage('education/terminal', {
            type: 'EDUCATION_TERMINAL_CREATEAPIPROCESS_SYNC',
            payload: action.payload,
            sourceSeed: rootSeed, // 统一使用导出的 rootSeed
            timestamp: Date.now(),
          })
        } catch (error) {
          // console.warn('教育-Terminal模块: 创建进程同步失败:', error)
        }
      }
      // API 进程杀死监听
      if (
        action.type.startsWith('education/terminal/killApiProcess/trigger/fulfilled') &&
        action.payload?.source !== 'worker'
      ) {
        try {
          sharedWorkerManager.postMessage('education/terminal', {
            type: 'EDUCATION_TERMINAL_CREATEAPIPROCESSKILL_SYNC',
            payload: action.payload,
            sourceSeed: rootSeed,
            timestamp: Date.now(),
          })
        } catch (error) {
          // console.warn('教育-Terminal模块: 杀死进程同步失败:', error)
        }
      }
      return result
    }
  }
}
export default createEducationTerminalMiddleware
export {rootSeed}
