import { useState, useEffect, useCallback, useRef } from "react"
import kernel from "@/sukinos/utils/process/kernel"

export const useProcessBridge = (pid, { isVisible = true, backgroundSleep = false } = {}) => {
  // 优先从内核缓存中读取初始状态，防止主线程虚拟 Worker 同步初始化时丢失首帧状态
  const [state, setState] = useState(() => {
    if (pid) {
      return kernel.getCachedState(pid) || null
    }
    return null
  })

  // 渲染帧锁：避免竞态导致 RAF 泄漏
  const renderFrameRef = useRef(null);
  // 本实例建立的主题订阅句柄集合，卸载时统一清理
  const activeSubscriptionsRef = useRef(new Set());
  // 非可见窗口跳帧计数器：每 3 帧才处理一次 state 更新
  const frameSkipRef = useRef(0);

  useEffect(() => {
    if (!pid) return

    // 后台静默 + 不可见 → 完全不订阅 worker 状态，零开销
    if (backgroundSleep && !isVisible) {
      return
    }

    // 挂载时立即拉取一次最新缓存状态，防止挂载间隙漏掉状态更新
    const latestCache = kernel.getCachedState(pid)
    if (latestCache) {
      setState(latestCache)
    }

    // 只订阅本 Worker 的纯净状态，不做全局合并，避免 App 状态变化影响其他窗口
    const unsubscribeApp = kernel.subscribeApp(pid, (msg) => {
      if (msg.type === 'STATE') {
        // 非可见窗口跳帧节流：跳过中间帧，仅处理每第 3 次，降低主线程压力
        if (!isVisible && !backgroundSleep) {
          frameSkipRef.current++;
          if (frameSkipRef.current % 3 !== 0) return;
        }
        if (renderFrameRef.current) {
          cancelAnimationFrame(renderFrameRef.current);
        }
        renderFrameRef.current = requestAnimationFrame(() => {
          setState(msg.payload);
        });
      }
    })

    return () => {
      unsubscribeApp()
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
    }
  }, [pid, isVisible, backgroundSleep])

  const dispatch = useCallback((action) => kernel.dispatch(pid, action), [pid])

  const publish = useCallback((topic, payload) => kernel.publish(topic, payload), [])

  // 订阅接口用「最新值闭包代理」，避免 inline cb 每次变化都重连内核
  const subscribe = useCallback((topic, cb) => {
    const cbRef = { current: cb };

    const stableWrapper = (...args) => {
      if (typeof cbRef.current === 'function') {
        cbRef.current(...args);
      }
    };

    const unsubscribe = kernel.subscribe(topic, stableWrapper)
    activeSubscriptionsRef.current.add(unsubscribe)
    return () => {
      unsubscribe()
      activeSubscriptionsRef.current.delete(unsubscribe)
    }
  }, [])

  useEffect(() => {
    return () => {
      activeSubscriptionsRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      })
      activeSubscriptionsRef.current.clear()
    }
  }, [])

  return { state, dispatch, publish, subscribe }
}

/**
 * 极简动作通信 Hook：只给分发 Action / 发布主题的能力，不订阅状态。
 * 专供不需要感知重渲染的组件，省掉无效渲染与状态监听压力。
 */
export const useProcessDispatch = (pid) => {
  const dispatch = useCallback((action) => kernel.dispatch(pid, action), [pid])
  const publish = useCallback((topic, payload) => kernel.publish(topic, payload), [])

  return { dispatch, publish }
}

export default useProcessBridge;
