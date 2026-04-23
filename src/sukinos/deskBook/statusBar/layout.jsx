import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import SearchIcon from '@mui/icons-material/Search'
import React, { useState, useEffect, useRef, useMemo } from "react"
import VfsImage from '@/sukinos/middleware/VfsImage.jsx'

const LENGTH = 44
const bem = createNamespace('status')

function StatusBar({ blockEdApps, startApp, hibernateApp, currentFocus, onFocus, className, isRunningApps }) {
  const containerRef = useRef(null)

  const displayApps = useMemo(() => {
    const safeBlockApps = blockEdApps || []
    const safeRunningApps = isRunningApps || []
    const runningMap = new Map(safeRunningApps.map(app => [app.pid, app]))

    const result = []
    const addedPids = new Set()

    safeBlockApps.forEach(app => {
      const currentApp = runningMap.get(app.pid) || app
      result.push(currentApp)
      addedPids.add(app.pid)
    })

    safeRunningApps.forEach(app => {
      if (!addedPids.has(app.pid)) {
        result.push(app)
        addedPids.add(app.pid)
      }
    })

    return result
  }, [blockEdApps, isRunningApps])

  const handleAppClick = async (app) => {
    const isRunning = app.status === 'RUNNING'
    const isFocused = currentFocus === app.pid
    if (!isRunning) {
      await startApp(app.pid)
      return
    }
    if (isRunning && !isFocused) {
      onFocus(app.pid)
      return
    }
    await hibernateApp(app.pid)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let isDown = false
    let startX = 0
    let scrollLeft = 0

    const onMouseDown = (e) => {
      isDown = true
      startX = e.clientX
      scrollLeft = el.scrollLeft
    }

    const onMouseMove = (e) => {
      if (!isDown) return
      const dx = e.clientX - startX
      el.scrollLeft = scrollLeft - dx
    }

    const onMouseUp = () => {
      isDown = false
    }

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [displayApps])

  return (
    <div className={[style[bem.b()], className].join(' ')} >
      {displayApps.length > 0 && (
          <div ref={containerRef} className={style[bem.e('container')]}>
            {displayApps.map((app) => (
              <div
                onClick={() => handleAppClick(app)}
                key={app.pid}
                className={[
                  style[bem.e('icon-box')],
                  style[bem.is('active', app.status !== 'INSTALLED')]
                ].join(' ')}
                style={{ width: LENGTH, height: LENGTH }}
              >
                <div className={style[bem.e('app-icon')]}>
                  <VfsImage app={app} className={style[bem.e('icon')]} />
                </div>
                {app.status === 'RUNNING' && <div className={style[bem.e('active-indicator')]}></div>}
                {app.status === 'HIBERNATED' && <div className={style[bem.e('active-hibernated')]}></div>}
              </div>
            ))}
          </div>
      )}
    </div>
  )
}

export default React.memo(StatusBar)
