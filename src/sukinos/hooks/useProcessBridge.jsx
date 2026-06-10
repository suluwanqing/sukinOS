import { useState, useEffect, useCallback, useRef } from "react"
import kernel from "@/sukinos/utils/process/kernel"

export const useProcessBridge = (pid) => {
  // 优先从内核缓存中读取初始状态，防止主线程虚拟 Worker 同步初始化时丢失首帧状态
  const [state, setState] = useState(() => {
    if (pid) {
      return kernel.getCachedState(pid) || null
    }
    return null
  })

  // 使用 ref 缓存当前的渲染帧锁，避免竞态导致内存泄漏
  const renderFrameRef = useRef(null);
  // 使用 ref 跟踪当前组件实例创建的全局消息主题订阅，用于卸载时自动清理
  const activeSubscriptionsRef = useRef(new Set());

  useEffect(() => {
    if (!pid) return

    // 挂载时立即拉取一次最新缓存状态，防止挂载间隙漏掉状态更新
    const latestCache = kernel.getCachedState(pid)
    if (latestCache) {
      setState(latestCache)
    }

    // 订阅应用自身 Worker 发出的状态变化
    // 直接使用 Worker 的纯净状态，不做全局合并，避免 App 状态变化影响其他窗口
    const unsubscribeApp = kernel.subscribeApp(pid, (msg) => {
      if (msg.type === 'STATE') {
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
  }, [pid])

  const dispatch = useCallback((action) => kernel.dispatch(pid, action), [pid])

  // 提供并缓存基于内核通用通信枢纽的发布接口
  const publish = useCallback((topic, payload) => kernel.publish(topic, payload), [])

  // 提供并缓存基于内核通用通信枢纽的订阅接口，采用最新值闭包保护代理，避免 inline cb 重复重连
  const subscribe = useCallback((topic, cb) => {
    const cbRef = { current: cb };

    // 代理执行函数，保障订阅闭包内部状态时刻最新且无需变动内核绑定句柄
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

  // 当组件卸载时自动注销此 Hook 实例生命周期内建立的所有主题消息订阅
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
 * 极简动作通信 Hook
 * 专供那些仅需分发 Action 或发布消息主题、无需感知 UI 重新渲染的组件。
 * 该 Hook 不会引入状态变动感知，降低无效渲染，降低事件分发系统的监听压力。
 */
export const useProcessDispatch = (pid) => {
  const dispatch = useCallback((action) => kernel.dispatch(pid, action), [pid])
  const publish = useCallback((topic, payload) => kernel.publish(topic, payload), [])

  return { dispatch, publish }
}

export default useProcessBridge;
