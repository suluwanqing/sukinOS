import {sharedWorkerManager} from '/public/workers/sharedWorker/WorkerManager.js'
const createEducationApiMiddleware = () => {
  return store => {
    // 延迟初始化逻辑：不在创建中间件时立即执行，而是在第一个 action 到达或主线程空闲时
    const initWorker = () => {
      const sliceId = 'education/api'
      // 检查管理器状态，确保单例
      if (sharedWorkerManager.isInitialized(sliceId)) return
      // 使用 setTimeout(0) 或 requestIdleCallback 进一步推迟执行，防止阻塞 UI
      const deferredInit = window.requestIdleCallback || (cb => setTimeout(cb, 100))
      deferredInit(() => {
        sharedWorkerManager.registerWorker(sliceId, '/workers/sharedWorker/education/api/worker.js')
        // 设置监听器：从 Worker 接收同步信号
        sharedWorkerManager.addListener(sliceId, data => {
          if (data.type === 'EDUCATION_API_SYNC') {
            store.dispatch({
              type: 'education-apislice/syncState',
              payload: data.payload.api,
              meta: {source: 'worker'}, // 标记来源，防止循环触发
            })
          }
        })
      })
    }
    return next => action => {
      // 触发延迟初始化 (仅执行一次检查)
      initWorker()
      // 执行原始 Action
      const result = next(action)
      // 处理需要同步到 Worker 的 Action
      // 过滤掉来源是 worker 的 action，防止死循环
      if (
        action.type.startsWith('education-apislice') &&
        action.meta?.sync &&
        action.meta?.source !== 'worker'
      ) {
        try {
          const state = store.getState()
          sharedWorkerManager.postMessage('education/api', {
            type: 'EDUCATION_API_SYNC',
            payload: {
              api: state.education.api,
              action: {
                type: action.type,
                payload: action.payload,
              },
            },
          })
        } catch (error) {
          console.warn('教育-API模块: 同步至 Worker 失败:', error)
        }
      }
      return result
    }
  }
}
export default createEducationApiMiddleware
