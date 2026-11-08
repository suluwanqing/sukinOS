import { useCallback, useSyncExternalStore } from 'react'

const getFullscreenElement = () => {
  if (typeof document === 'undefined') return null
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

const subscribe = (onStoreChange) => {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('fullscreenchange', onStoreChange)
  document.addEventListener('webkitfullscreenchange', onStoreChange)
  return () => {
    document.removeEventListener('fullscreenchange', onStoreChange)
    document.removeEventListener('webkitfullscreenchange', onStoreChange)
  }
}

const getSnapshot = () => getFullscreenElement()
const getServerSnapshot = () => null

export function useFullscreen() {
  const fullscreenElement = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isFullscreenSupported = typeof document !== 'undefined' &&
    !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) &&
    document.fullscreenEnabled !== false

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    if (getFullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen
      const result = exit?.call(document)
      result?.catch?.(() => {})
      return
    }
    const request = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen
    const result = request?.call(document.documentElement)
    result?.catch?.(() => {})
  }, [])

  return {
    isFullscreen: !!fullscreenElement,
    isFullscreenSupported,
    toggleFullscreen,
  }
}
