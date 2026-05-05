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
    let scrollTimeout = null // 用于判断滚动停止的定时器

    //在滚动或拖拽时给容器添加类名，禁用内部元素的 hover 效果
    const enableScrollingMode = () => {
      el.classList.add(style[bem.is('scrolling')])
      if (scrollTimeout) clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        el.classList.remove(style[bem.is('scrolling')])
      }, 150) // 150ms 没产生新的滚动，认为滚动结束
    }

    const onMouseDown = (e) => {
      isDown = true
      startX = e.clientX
      scrollLeft = el.scrollLeft
    }

    const onMouseMove = (e) => {
      if (!isDown) return
      const dx = e.clientX - startX
      el.scrollLeft = scrollLeft - dx
      enableScrollingMode() // 拖拽时触发滚动模式
    }

    const onMouseUp = () => {
      isDown = false
    }

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
        enableScrollingMode() // 滚轮时触发滚动模式
      }
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('wheel', onWheel, { passive: false }) //使用了 preventDefault，passive 应该为 false

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('wheel', onWheel)
      if (scrollTimeout) clearTimeout(scrollTimeout)
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
