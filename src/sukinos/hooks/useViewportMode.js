import { useSyncExternalStore } from 'react'

export const MOBILE_QUERY = '(max-width: 767px)'
export const COMPACT_QUERY = '(max-width: 1023px)'
export const COARSE_QUERY = '(hover: none), (pointer: coarse)'

// 同一个查询在多个组件里共用一份 MediaQueryList 与订阅函数；订阅函数身份必须稳定，
// 否则 useSyncExternalStore 每次渲染都会退订重订。
const mqlCache = new Map()
const subscribeCache = new Map()
const snapshotCache = new Map()

const getMql = (query) => {
  if (typeof window === 'undefined') return null
  let mql = mqlCache.get(query)
  if (!mql) {
    mql = window.matchMedia(query)
    mqlCache.set(query, mql)
  }
  return mql
}

const getSubscribe = (query) => {
  let subscribe = subscribeCache.get(query)
  if (!subscribe) {
    subscribe = (onStoreChange) => {
      const mql = getMql(query)
      if (!mql) return () => {}
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    }
    subscribeCache.set(query, subscribe)
  }
  return subscribe
}

const getSnapshot = (query) => {
  let snapshot = snapshotCache.get(query)
  if (!snapshot) {
    snapshot = () => getMql(query)?.matches ?? false
    snapshotCache.set(query, snapshot)
  }
  return snapshot
}

const getServerSnapshot = () => false

export function useMediaQuery(query) {
  return useSyncExternalStore(
    getSubscribe(query),
    getSnapshot(query),
    getServerSnapshot,
  )
}

export function useViewportMode() {
  return {
    isMobile: useMediaQuery(MOBILE_QUERY),
    isCompact: useMediaQuery(COMPACT_QUERY),
    isTouch: useMediaQuery(COARSE_QUERY),
  }
}
