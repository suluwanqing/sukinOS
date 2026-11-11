import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import { LayoutGrid as AppsIcon, ArrowLeft as BackIcon, Home as HomeIcon, X as CloseIcon } from 'lucide-react'
import VfsImage from '@/sukinos/middleware/VfsImage/main.jsx'
import { ENV_KEY_META_INFO, ENV_KEY_NAME, ENV_KEY_RESOURCE_ID, SUKIN_EXT, SUKIN_PRE } from '@/sukinos/utils/config'

const bem = createNamespace('floating-ball')

const STORAGE_KEY = 'sukin-floating-ball-pos'
const DEFAULT_BALL_SIZE = 48
const BALL_MARGIN = 10
const ACTION_WIDTH = 108
const ACTION_HEIGHT = 44
const ACTION_GAP = 10
const ACTION_DISTANCE = 12
const ACTION_COUNT = 3
const DRAG_TOLERANCE = 6
const ROUTE_HISTORY_LIMIT = 30

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// 动作胶囊固定是深色玻璃底，用户选了深色文字时需要自动切成浅色底保证对比度
const isDarkTextColor = (value) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value || '')
  if (!match) return false
  const hex = match[1].length === 3
    ? match[1].split('').map(char => char + char).join('')
    : match[1]
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

// env() 只能由布局解析成像素，这里用一次性探针读取四边安全区
const readSafeInsets = () => {
  if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 }
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;'
  probe.style.paddingTop = 'env(safe-area-inset-top, 0px)'
  probe.style.paddingRight = 'env(safe-area-inset-right, 0px)'
  probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)'
  probe.style.paddingLeft = 'env(safe-area-inset-left, 0px)'
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe)
  const insets = {
    top: parseFloat(computed.paddingTop) || 0,
    right: parseFloat(computed.paddingRight) || 0,
    bottom: parseFloat(computed.paddingBottom) || 0,
    left: parseFloat(computed.paddingLeft) || 0,
  }
  probe.remove()
  return insets
}

const readStoredPosition = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (raw && (raw.side === 'left' || raw.side === 'right') && Number.isFinite(raw.ratio)) {
      return { side: raw.side, ratio: clamp(raw.ratio, 0, 1) }
    }
  } catch {
    // 存储被禁用时回退默认位置
  }
  return { side: 'right', ratio: 0.56 }
}

const appLabel = (app) =>
  app?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '')?.replace(SUKIN_PRE, '') || '未命名'

// 拖拽吸附左右边缘，展开后自动避让屏幕边界分散子项
function FloatingBall({
  apps,
  currentFocus,
  isRunningApps,
  showWindowSwitcher,
  kernel,
  ballSize: ballSizeProp,
  ballOpacity: ballOpacityProp,
  ballColor,
  ballTextColor,
  ballIconOnly,
  onStartApp,
  onOpenSwitcher,
  onHome,
}) {
  const [position, setPosition] = useState(readStoredPosition)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  const [safeInsets, setSafeInsets] = useState(readSafeInsets)
  const [expanded, setExpanded] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [dragPos, setDragPos] = useState(null)
  const [focusHistory, setFocusHistory] = useState([])
  const [canBackMap, setCanBackMap] = useState({})

  const ballRef = useRef(null)
  const dragRef = useRef(null)
  const dragPosRef = useRef(null)
  const routeHistoryRef = useRef(new Map())
  const routePendingRef = useRef(null)
  const routeTimerRef = useRef(null)
  const appsRef = useRef(isRunningApps)

  useEffect(() => {
    appsRef.current = isRunningApps
  }, [isRunningApps])

  // 最近焦点顺序，供“返回”回到上一个应用；回桌面后清空，避免把已收起应用当成返回目标
  useEffect(() => {
    setFocusHistory(prev => {
      if (!currentFocus) return prev.length === 0 ? prev : []
      const next = prev.filter(pid => pid !== currentFocus)
      next.push(currentFocus)
      return next.slice(-24)
    })
  }, [currentFocus])

  useEffect(() => () => {
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      setSafeInsets(readSafeInsets())
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  const closeMenus = useCallback(() => {
    setExpanded(false)
    setLauncherOpen(false)
  }, [])

  // 调度中心打开时悬浮球让位，避免与全屏切换器叠加
  useEffect(() => {
    if (showWindowSwitcher) closeMenus()
  }, [showWindowSwitcher, closeMenus])

  useEffect(() => {
    if (!expanded && !launcherOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expanded, launcherOpen, closeMenus])

  const markCanBack = useCallback((pid, value) => {
    setCanBackMap(prev => (prev[pid] === value ? prev : { ...prev, [pid]: value }))
  }, [])

  const runningPidKey = useMemo(
    () => (isRunningApps || []).map(app => app.pid).join('|'),
    [isRunningApps]
  )

  // 跟踪 bundle 应用的 router.path 历史；非 bundle 应用没有可回放的路由，不参与应用内返回
  useEffect(() => {
    if (!kernel || !runningPidKey) return undefined
    const appsList = appsRef.current || []
    const activePids = new Set(appsList.map(app => app.pid))

    for (const pid of routeHistoryRef.current.keys()) {
      if (activePids.has(pid)) continue
      routeHistoryRef.current.delete(pid)
      setCanBackMap(prev => {
        if (!(pid in prev)) return prev
        const next = { ...prev }
        delete next[pid]
        return next
      })
    }

    const unsubscribes = []
    appsList.forEach(app => {
      const resourceId = app?.[ENV_KEY_RESOURCE_ID]
      const resource = resourceId ? kernel.getResource?.(resourceId) : null
      if (!resource?.isBundle) return
      const pid = app.pid
      const unsubscribe = kernel.subscribeApp(pid, ({ type, payload }) => {
        if (type !== 'STATE') return
        const path = payload?.router?.path
        if (typeof path !== 'string') return

        const pending = routePendingRef.current
        if (pending && pending.pid === pid) {
          // 等待自己下发的回退落地，期间广播的中间路径不写入历史
          if (path !== pending.target) return
          routePendingRef.current = null
          return
        }

        const record = routeHistoryRef.current.get(pid)
        if (!record) {
          routeHistoryRef.current.set(pid, { entries: [path], index: 0 })
          markCanBack(pid, false)
          return
        }
        if (record.entries[record.index] === path) return
        record.entries = record.entries.slice(0, record.index + 1)
        record.entries.push(path)
        if (record.entries.length > ROUTE_HISTORY_LIMIT) record.entries.shift()
        record.index = record.entries.length - 1
        markCanBack(pid, record.index > 0)
      })
      if (typeof unsubscribe === 'function') unsubscribes.push(unsubscribe)
    })

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [kernel, runningPidKey, markCanBack])

  const goBackInApp = useCallback((pid) => {
    if (!kernel) return false
    if (routePendingRef.current) return true
    const record = routeHistoryRef.current.get(pid)
    if (!record || record.index <= 0) return false
    record.index -= 1
    const target = record.entries[record.index]
    routePendingRef.current = { pid, target }
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current)
    routeTimerRef.current = setTimeout(() => {
      routePendingRef.current = null
      routeTimerRef.current = null
    }, 600)
    markCanBack(pid, record.index > 0)
    kernel.dispatch(pid, { type: 'NAVIGATE', payload: target })
    return true
  }, [kernel, markCanBack])

  const activePidSet = useMemo(
    () => new Set((isRunningApps || []).map(app => app.pid)),
    [isRunningApps]
  )

  const shortcutApps = useMemo(
    () => (apps || []).filter(app => app?.[ENV_KEY_META_INFO]?.custom?.hasShortcut),
    [apps]
  )

  const ballSize = clamp(Number(ballSizeProp) || DEFAULT_BALL_SIZE, 36, 72)
  const ballOpacity = clamp(Number(ballOpacityProp) || 100, 30, 100) / 100
  const resolvedBallColor = !ballColor || ballColor === 'auto'
    ? 'var(--su-os-accent-color, #0067c0)'
    : ballColor
  const resolvedTextColor = ballTextColor || '#fafafa'
  const ballIconSize = clamp(Math.round(ballSize * 0.44), 16, 30)
  const actionWidth = ballIconOnly ? ACTION_HEIGHT : ACTION_WIDTH

  // 球体始终停在原生安全区之外，边缘保留一半球距
  const edgeInset = BALL_MARGIN / 2
  const leftLimit = Math.max(BALL_MARGIN, safeInsets.left + edgeInset)
  const rightLimit = Math.max(BALL_MARGIN, safeInsets.right + edgeInset)
  const topLimit = Math.max(BALL_MARGIN, safeInsets.top + edgeInset)
  const bottomLimit = Math.max(BALL_MARGIN, safeInsets.bottom + edgeInset)
  const travel = Math.max(1, viewport.height - topLimit - bottomLimit - ballSize)
  const restingX = position.side === 'right'
    ? viewport.width - rightLimit - ballSize
    : leftLimit
  const restingY = topLimit + position.ratio * travel
  const ballX = dragPos ? dragPos.x : restingX
  const ballY = dragPos ? dragPos.y : restingY

  const openOnLeft = ballX + ballSize / 2 < viewport.width / 2
  const stackHeight = ACTION_HEIGHT * ACTION_COUNT + ACTION_GAP * (ACTION_COUNT - 1)
  const stackMin = Math.max(8, safeInsets.top + 4)
  const stackMax = Math.max(
    stackMin,
    viewport.height - stackHeight - Math.max(8, safeInsets.bottom + 4)
  )
  const stackTop = clamp(
    ballY + ballSize / 2 - stackHeight / 2,
    stackMin,
    stackMax
  )
  const actionX = openOnLeft
    ? ballX + ballSize + ACTION_DISTANCE
    : ballX - ACTION_DISTANCE - actionWidth
  // 子项从球体一侧展开，靠近屏幕顶部/底部时整体平移兜底
  const actionOrigin = openOnLeft ? 'left center' : 'right center'

  const handleBack = useCallback(() => {
    closeMenus()
    if (routePendingRef.current) return
    if (currentFocus && canBackMap[currentFocus] && goBackInApp(currentFocus)) return
    const previous = [...focusHistory]
      .reverse()
      .find(pid => pid !== currentFocus && activePidSet.has(pid))
    if (previous) {
      onStartApp(previous)
      return
    }
    onOpenSwitcher()
  }, [closeMenus, currentFocus, canBackMap, goBackInApp, focusHistory, activePidSet, onStartApp, onOpenSwitcher])

  const backTarget = useMemo(() => {
    if (currentFocus && canBackMap[currentFocus]) return 'route'
    if (focusHistory.some(pid => pid !== currentFocus && activePidSet.has(pid))) return 'app'
    if (activePidSet.size > 0) return 'switcher'
    return 'none'
  }, [currentFocus, canBackMap, focusHistory, activePidSet])

  const backLabel = backTarget === 'route'
    ? '上一页'
    : backTarget === 'app'
      ? '上一应用'
      : backTarget === 'switcher'
        ? '多任务'
        : '返回'

  const handleOpenLauncher = () => {
    setExpanded(false)
    setLauncherOpen(true)
  }

  const handleHome = () => {
    closeMenus()
    onHome()
  }

  const handleSelectApp = (pid) => {
    closeMenus()
    onStartApp(pid)
  }

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const rect = ballRef.current?.getBoundingClientRect()
    if (!rect) return
    event.stopPropagation()
    try {
      ballRef.current.setPointerCapture?.(event.pointerId)
    } catch {
      // 部分浏览器在指针已释放时会抛错，不影响后续点击判定
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    }
    dragPosRef.current = { x: rect.left, y: rect.top }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_TOLERANCE) return
    if (!drag.moved) {
      drag.moved = true
      closeMenus()
    }
    const next = {
      x: clamp(drag.originX + dx, leftLimit, viewport.width - rightLimit - ballSize),
      y: clamp(drag.originY + dy, topLimit, viewport.height - bottomLimit - ballSize),
    }
    dragPosRef.current = next
    setDragPos(next)
  }

  const handlePointerEnd = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.stopPropagation()
    dragRef.current = null
    try {
      ballRef.current?.releasePointerCapture?.(event.pointerId)
    } catch {
      // 指针已结束时无需再次释放
    }

    if (event.type === 'pointercancel') {
      dragPosRef.current = null
      setDragPos(null)
      return
    }

    if (!drag.moved) {
      // 点击：展开/收起动作菜单
      setLauncherOpen(false)
      setExpanded(prev => !prev)
      return
    }

    const released = dragPosRef.current || { x: restingX, y: restingY }
    const nextPosition = {
      side: released.x + ballSize / 2 < viewport.width / 2 ? 'left' : 'right',
      ratio: clamp((released.y - topLimit) / travel, 0, 1),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPosition))
    } catch {
      // 存储不可用时仅当前会话生效
    }
    setPosition(nextPosition)
    dragPosRef.current = null
    setDragPos(null)
  }

  const handleBallKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setLauncherOpen(false)
      setExpanded(prev => !prev)
    }
  }

  const rootClassName = [
    style[bem.b()],
    expanded ? style[bem.is('open', true)] : '',
    launcherOpen ? style[bem.is('launcher-open', true)] : '',
    dragPos ? style[bem.is('dragging', true)] : '',
    ballIconOnly ? style[bem.is('icon-only', true)] : '',
    isDarkTextColor(resolvedTextColor) ? style[bem.is('light-actions', true)] : '',
  ].filter(Boolean).join(' ')

  const actions = [
    {
      id: 'launcher',
      label: '打开应用',
      icon: <AppsIcon size={18} strokeWidth={2.2} />,
      onClick: handleOpenLauncher,
    },
    {
      id: 'back',
      label: backLabel,
      icon: <BackIcon size={18} strokeWidth={2.2} />,
      onClick: handleBack,
      disabled: backTarget === 'none',
    },
    {
      id: 'home',
      label: '返回桌面',
      icon: <HomeIcon size={18} strokeWidth={2.2} />,
      onClick: handleHome,
    },
  ]

  return (
    <div
      className={rootClassName}
      style={{
        '--fb-ball-size': `${ballSize}px`,
        '--fb-opacity': ballOpacity,
        '--fb-color': resolvedBallColor,
        '--fb-text-color': resolvedTextColor,
      }}
    >
      {(expanded || launcherOpen) && (
        <div
          className={style[bem.e('backdrop')]}
          aria-hidden="true"
          onPointerDown={closeMenus}
        />
      )}

      <button
        ref={ballRef}
        type="button"
        className={style[bem.e('ball')]}
        style={{ transform: `translate3d(${ballX}px, ${ballY}px, 0)` }}
        aria-label={expanded ? '收起悬浮球菜单' : '展开悬浮球菜单'}
        aria-expanded={expanded}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleBallKeyDown}
      >
        <AppsIcon className={style[bem.e('ball-icon')]} size={ballIconSize} strokeWidth={2.2} />
      </button>

      <div className={style[bem.e('actions')]} aria-hidden={!expanded}>
        {actions.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className={style[bem.e('action')]}
            style={{
              '--fb-x': `${actionX}px`,
              '--fb-y': `${stackTop + index * (ACTION_HEIGHT + ACTION_GAP)}px`,
              '--fb-i': index,
              '--fb-origin': actionOrigin,
            }}
            aria-label={action.label}
            tabIndex={expanded ? 0 : -1}
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation()
              action.onClick()
            }}
          >
            <span className={style[bem.e('action-icon')]}>{action.icon}</span>
            <span className={style[bem.e('action-label')]}>{action.label}</span>
          </button>
        ))}
      </div>

      {launcherOpen && (
        <div className={style[bem.e('launcher')]} role="dialog" aria-label="打开新的 APP">
          <div className={style[bem.e('launcher-header')]}>
            <span className={style[bem.e('launcher-title')]}>打开新的 APP</span>
            <button
              type="button"
              className={style[bem.e('launcher-close')]}
              aria-label="关闭应用面板"
              onClick={closeMenus}
            >
              <CloseIcon size={16} strokeWidth={2.4} />
            </button>
          </div>
          <div className={style[bem.e('launcher-grid')]}>
            {shortcutApps.length === 0 ? (
              <span className={style[bem.e('launcher-empty')]}>暂无桌面应用</span>
            ) : (
              shortcutApps.map(app => (
                <button
                  key={app.pid}
                  type="button"
                  className={style[bem.e('app-item')]}
                  onClick={() => handleSelectApp(app.pid)}
                >
                  <VfsImage app={app} className={style[bem.e('app-icon')]} />
                  <span className={style[bem.e('app-label')]}>{appLabel(app)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(FloatingBall)
