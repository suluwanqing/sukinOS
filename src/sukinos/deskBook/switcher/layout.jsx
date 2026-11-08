import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { createNamespace } from '/utils/js/classcreate'
import VfsImage from '@/sukinos/middleware/VfsImage/main.jsx'
import MobileTaskCard from './MobileTaskCard'
import style from '../style.module.css'

const bem = createNamespace('deskbook')

const CARD_EXIT_MS = 500

function WindowSwitcher({
  showWindowSwitcher,
  isMobile,
  sortedRunningApps,
  selectedWindowIndex,
  onSelect,
  onHoverIndex,
  onSelectApp,
  onDismissAll,
  onForceKill,
  windowSlotsRef,
  onReleaseSlot,
}) {
  const [exitingPids, setExitingPids] = useState(() => new Set())
  const [clearing, setClearing] = useState(false)
  const timersRef = useRef([])
  const pendingRef = useRef(new Set())

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const scheduleForceKill = (pid) => {
    if (pendingRef.current.has(pid)) return
    pendingRef.current.add(pid)
    setExitingPids(prev => new Set(prev).add(pid))
    const timer = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== timer)
      pendingRef.current.delete(pid)
      onForceKill(pid)
      setExitingPids(prev => {
        if (!prev.has(pid)) return prev
        const next = new Set(prev)
        next.delete(pid)
        return next
      })
    }, CARD_EXIT_MS)
    timersRef.current.push(timer)
  }

  const handleClearAll = (e) => {
    e?.stopPropagation()
    if (clearing) return
    const pids = sortedRunningApps.map(app => app.pid)
    if (pids.length === 0) {
      onDismissAll()
      return
    }
    setClearing(true)
    pids.forEach(pid => scheduleForceKill(pid))
    const timer = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== timer)
      setClearing(false)
      onDismissAll()
    }, CARD_EXIT_MS)
    timersRef.current.push(timer)
  }

  if (!showWindowSwitcher) return null;

  if (isMobile) {
    return createPortal(
      <div className={style[bem.e('mobile-switcher')]} onClick={onDismissAll}>
        <div className={style[bem.e('mobile-switcher-header')]}>
          <div className={style[bem.e('mobile-switcher-badge')]}>
            <span className={style[bem.e('mobile-switcher-pulse')]} />
            <span className={style[bem.e('mobile-switcher-title')]}>
              运行中 ({sortedRunningApps.length})
            </span>
          </div>
          {sortedRunningApps.length > 0 && (
            <button
              type="button"
              disabled={clearing}
              className={style[bem.e('mobile-switcher-clear')]}
              onClick={handleClearAll}
            >
              清除全部
            </button>
          )}
        </div>
        <div className={style[bem.e('mobile-switcher-list')]}>
          {sortedRunningApps.length === 0 ? (
            <div className={style[bem.e('mobile-switcher-empty')]}>
              <span className={style[bem.e('mobile-switcher-empty-icon')]}>✦</span>
              暂无运行中的应用
            </div>
          ) : (
            sortedRunningApps.map(app => (
              <MobileTaskCard
                key={app.pid}
                app={app}
                windowSlotsRef={windowSlotsRef}
                onSelect={onSelectApp}
                onClose={scheduleForceKill}
                onReleaseSlot={onReleaseSlot}
                exiting={exitingPids.has(app.pid)}
              />
            ))
          )}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <>
      <div
        onClick={() => onSelect(selectedWindowIndex)}
        className={style[bem.e('fullscreen')]}
      />
      <div
        className={style[bem.e('switcher-container')]}
      >
        {sortedRunningApps.map((app, index) => {
          const isSelected = selectedWindowIndex === index;
          return (
            <div
              key={app.pid}
              onClick={(e) => { e.stopPropagation(); onSelect(index); }}
              onMouseEnter={() => onHoverIndex(index)}
              className={[style[bem.e('switcher-item')], style[bem.is('switchericon-selected', isSelected)]].join(' ')}
            >
              <VfsImage app={app} className={style[bem.e('switch-icon')]} style={{ '--su-switch-index': index }} />
            </div>
          );
        })}
      </div>
    </>,
    document.body
  );
}

export default WindowSwitcher
