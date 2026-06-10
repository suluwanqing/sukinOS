import React, {useEffect, useState, useRef, useCallback} from 'react'
import style from './style.module.css'
import {createNamespace} from '/utils/js/classcreate'
import {getBoard, putBoard, uid} from '../db'

const bem = createNamespace('draw-board-canvas')

function seededRandom(s) {
  const x = Math.sin(s) * 10000
  return x - Math.floor(x)
}

function srnd(seedObj, amp) {
  return (seededRandom(seedObj.s++) - 0.5) * 2 * amp
}

function roughLine(ctx, x1, y1, x2, y2, r, dasharray, seedObj) {
  const setDash = () => {
    if (dasharray === 'dashed') ctx.setLineDash([10, 6])
    else if (dasharray === 'dotted') ctx.setLineDash([2, 5])
    else ctx.setLineDash([])
  }
  for (let i = 0; i < 2; i++) {
    setDash()
    ctx.beginPath()
    const segs = 6
    const dx = (x2 - x1) / segs
    const dy = (y2 - y1) / segs
    ctx.moveTo(x1 + srnd(seedObj, r), y1 + srnd(seedObj, r))
    for (let s = 1; s <= segs; s++) {
      ctx.lineTo(x1 + dx * s + srnd(seedObj, r * 0.8), y1 + dy * s + srnd(seedObj, r * 0.8))
    }
    ctx.stroke()
  }
  ctx.setLineDash([])
}

function hachureFill(ctx, x, y, w, h, color, gap, seedObj) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 1
  for (let i = -h; i < w + h; i += gap) {
    ctx.beginPath()
    ctx.moveTo(x + i + srnd(seedObj, 1), y + srnd(seedObj, 1))
    ctx.lineTo(x + i + h + srnd(seedObj, 1), y + h + srnd(seedObj, 1))
    ctx.stroke()
  }
  ctx.restore()
}

function hachureFillEllipse(ctx, cx, cy, rx, ry, color, gap, seedObj) {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  hachureFill(ctx, cx - rx, cy - ry, rx * 2, ry * 2, color, gap, seedObj)
  ctx.restore()
}

function drawSmoothPen(ctx, points, r, seedObj) {
  if (!points || points.length === 0) return
  ctx.beginPath()
  const getPt = p => (r > 0 ? [p[0] + srnd(seedObj, r), p[1] + srnd(seedObj, r)] : p)
  const p0 = getPt(points[0])
  ctx.moveTo(p0[0], p0[1])
  if (points.length < 3) {
    for (let i = 1; i < points.length; i++) {
      const pt = getPt(points[i])
      ctx.lineTo(pt[0], pt[1])
    }
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const pI = getPt(points[i])
      const pI1 = getPt(points[i + 1])
      const xc = (pI[0] + pI1[0]) / 2
      const yc = (pI[1] + pI1[1]) / 2
      ctx.quadraticCurveTo(pI[0], pI[1], xc, yc)
    }
    const pL = getPt(points[points.length - 1])
    ctx.lineTo(pL[0], pL[1])
  }
  ctx.stroke()
}

function getBounds(el) {
  if (el.type === 'pen') {
    const xs = el.points.map(p => p[0])
    const ys = el.points.map(p => p[1])
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    }
  }
  if (el.type === 'line' || el.type === 'arrow') {
    const x = Math.min(el.x1, el.x2),
      y = Math.min(el.y1, el.y2)
    return {x, y, w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1)}
  }
  return {x: el.x, y: el.y, w: el.w, h: el.h}
}

function getSelectionBounds(elements, ids) {
  const set = new Set(ids)
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  elements.forEach(el => {
    if (!set.has(el.id)) return
    const b = getBounds(el)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.w)
    maxY = Math.max(maxY, b.y + b.h)
  })
  if (minX === Infinity) return null
  return {x: minX, y: minY, w: maxX - minX, h: maxY - minY}
}

function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h
}

function hitTest(el, px, py) {
  const b = getBounds(el)
  const pad = Math.max(8, (el.strokeWidth || 2) * 2)
  return pointInRect(px, py, b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2)
}

const IMAGES_POOL = new Map()
const LOADING_IMAGES = new Set() // 强引用挂载区，防止 GC 垃圾回收在异步 Base64 加载时提前销毁图片

function drawElement(ctx, el, opts = {}) {
  ctx.save()
  ctx.globalAlpha = (el.opacity ?? 1) * (opts.alpha ?? 1)
  ctx.strokeStyle = el.stroke
  ctx.lineWidth = el.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const r = el.roughness ?? 1

  let seedVal = 0
  for (let i = 0; i < el.id.length; i++) seedVal += el.id.charCodeAt(i)
  const seedObj = {s: seedVal}

  if (el.type === 'image') {
    const img = IMAGES_POOL.get(el.src)
    if (img) ctx.drawImage(img, el.x, el.y, el.w, el.h)
  } else if (el.type === 'rect') {
    if (el.fill && el.fill !== 'transparent') {
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.fill
        ctx.fillRect(el.x, el.y, el.w, el.h)
      } else {
        hachureFill(ctx, el.x, el.y, el.w, el.h, el.fill, 8, seedObj)
      }
    }
    roughLine(ctx, el.x, el.y, el.x + el.w, el.y, r, el.dasharray, seedObj)
    roughLine(ctx, el.x + el.w, el.y, el.x + el.w, el.y + el.h, r, el.dasharray, seedObj)
    roughLine(ctx, el.x + el.w, el.y + el.h, el.x, el.y + el.h, r, el.dasharray, seedObj)
    roughLine(ctx, el.x, el.y + el.h, el.x, el.y, r, el.dasharray, seedObj)
  } else if (el.type === 'ellipse') {
    const cx = el.x + el.w / 2,
      cy = el.y + el.h / 2
    const rx = Math.abs(el.w / 2),
      ry = Math.abs(el.h / 2)
    if (el.fill && el.fill !== 'transparent') {
      if (el.fillStyle === 'solid') {
        ctx.fillStyle = el.fill
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        hachureFillEllipse(ctx, cx, cy, rx, ry, el.fill, 8, seedObj)
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath()
      const steps = 36
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2
        const x = cx + Math.cos(a) * (rx + srnd(seedObj, r * 0.6))
        const y = cy + Math.sin(a) * (ry + srnd(seedObj, r * 0.6))
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  } else if (el.type === 'diamond') {
    const cx = el.x + el.w / 2,
      cy = el.y + el.h / 2
    const pts = [
      [cx, el.y],
      [el.x + el.w, cy],
      [cx, el.y + el.h],
      [el.x, cy],
    ]
    if (el.fill && el.fill !== 'transparent' && el.fillStyle === 'solid') {
      ctx.fillStyle = el.fill
      ctx.beginPath()
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
      ctx.closePath()
      ctx.fill()
    }
    for (let i = 0; i < 4; i++) {
      const a = pts[i],
        b = pts[(i + 1) % 4]
      roughLine(ctx, a[0], a[1], b[0], b[1], r, el.dasharray, seedObj)
    }
  } else if (el.type === 'line' || el.type === 'arrow') {
    roughLine(ctx, el.x1, el.y1, el.x2, el.y2, r, el.dasharray, seedObj)
    if (el.type === 'arrow') {
      const ang = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
      const len = 14 + el.strokeWidth * 2
      const a1 = ang + Math.PI - 0.4,
        a2 = ang + Math.PI + 0.4
      roughLine(
        ctx,
        el.x2,
        el.y2,
        el.x2 + Math.cos(a1) * len,
        el.y2 + Math.sin(a1) * len,
        r,
        'solid',
        seedObj
      )
      roughLine(
        ctx,
        el.x2,
        el.y2,
        el.x2 + Math.cos(a2) * len,
        el.y2 + Math.sin(a2) * len,
        r,
        'solid',
        seedObj
      )
    }
  } else if (el.type === 'pen') {
    if (el.dasharray === 'dashed') ctx.setLineDash([10, 6])
    else if (el.dasharray === 'dotted') ctx.setLineDash([2, 5])
    else ctx.setLineDash([])

    if (el.penType === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = (el.opacity ?? 1) * 0.4
      ctx.lineWidth = el.strokeWidth * 4
      ctx.lineCap = 'round'
    } else if (el.penType === 'marker') {
      ctx.globalAlpha = (el.opacity ?? 1) * 0.8
      ctx.lineWidth = el.strokeWidth * 2
      ctx.lineCap = 'square'
    } else {
      ctx.lineCap = 'round'
    }

    drawSmoothPen(ctx, el.points, r, seedObj)
    ctx.setLineDash([])
  } else if (el.type === 'text') {
    ctx.fillStyle = el.stroke
    ctx.font = `${el.fontSize}px ${el.fontFamily || 'Caveat'}, cursive, sans-serif`
    ctx.textBaseline = 'top'
    const lines = (el.text || '').split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, el.x, el.y + i * el.fontSize * 1.2)
    })
  }
  ctx.restore()
}

function drawSelection(ctx, el) {
  const b = getBounds(el)
  const pad = 8
  ctx.save()
  ctx.strokeStyle = '#6965db'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2)
  ctx.setLineDash([])
  const handles = handlePositions(b, pad)
  Object.values(handles).forEach(([hx, hy]) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(hx - 4, hy - 4, 8, 8)
    ctx.strokeStyle = '#6965db'
    ctx.strokeRect(hx - 4, hy - 4, 8, 8)
  })
  ctx.restore()
}

function handlePositions(b, pad = 8) {
  const x = b.x - pad,
    y = b.y - pad,
    w = b.w + pad * 2,
    h = b.h + pad * 2
  return {
    nw: [x, y],
    ne: [x + w, y],
    sw: [x, y + h],
    se: [x + w, y + h],
    n: [x + w / 2, y],
    s: [x + w / 2, y + h],
    w: [x, y + h / 2],
    e: [x + w, y + h / 2],
  }
}

function hitHandle(b, px, py) {
  const hs = handlePositions(b)
  for (const k in hs) {
    const [hx, hy] = hs[k]
    if (Math.abs(px - hx) <= 6 && Math.abs(py - hy) <= 6) return k
  }
  return null
}

function preloadImage(src, callback) {
  if (IMAGES_POOL.has(src)) {
    if (callback) callback(IMAGES_POOL.get(src))
    return
  }
  const img = new Image()
  LOADING_IMAGES.add(img)

  if (src.startsWith('http') || src.startsWith('//')) {
    img.crossOrigin = 'anonymous'
  }
  img.onload = () => {
    IMAGES_POOL.set(src, img)
    LOADING_IMAGES.delete(img)
    if (callback) callback(img)
  }
  img.onerror = () => {
    LOADING_IMAGES.delete(img)
    if (callback) callback(null)
  }
  img.src = src
}

function makeElement(type, st, x, y) {
  const base = {
    id: uid(),
    type,
    stroke: st.stroke,
    fill: st.fill,
    fillStyle: st.fillStyle,
    strokeWidth: st.strokeWidth,
    roughness: st.roughness,
    opacity: st.opacity,
    dasharray: st.dasharray,
    penType: st.penType || 'normal',
  }
  if (type === 'line' || type === 'arrow') return {...base, x1: x, y1: y, x2: x, y2: y}
  if (type === 'pen') return {...base, points: [[x, y]]}
  if (type === 'text')
    return {
      ...base,
      x,
      y,
      w: 100,
      h: st.fontSize * 1.4,
      text: '点击输入内容',
      fontSize: st.fontSize,
      fontFamily: st.fontFamily,
    }
  return {...base, x, y, w: 0, h: 0}
}

const STROKE_COLORS = ['#212529', '#fa5252', '#40c057', '#228be6', '#fd7e14', '#be4bdb']
const FILL_COLORS = ['transparent', '#ffe3e3', '#b2f2bb', '#d0ebff', '#ffec99', '#eebefa']
const STROKE_WIDTHS = [1, 2, 4, 8]
const FONT_SIZES = [16, 20, 28, 40]
const PEN_TYPES = [
  {id: 'normal', label: '普通'},
  {id: 'marker', label: '马克笔'},
  {id: 'highlighter', label: '荧光笔'},
]

const TOOLS = [
  {id: 'pan', label: '拖拽视图 (空格键)'},
  {id: 'select', label: '选择'},
  {id: 'pen', label: '画笔'},
  {id: 'rect', label: '矩形'},
  {id: 'ellipse', label: '椭圆'},
  {id: 'diamond', label: '菱形'},
  {id: 'line', label: '直线'},
  {id: 'arrow', label: '箭头'},
  {id: 'text', label: '文本'},
  {id: 'image', label: '插入图片'},
  {id: 'eraser', label: '橡皮擦'},
]

const ICON_MAP = {
  pan: (
    <svg viewBox="0 0 24 24">
      <path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z" />
    </svg>
  ),
  select: (
    <svg viewBox="0 0 24 24">
      <path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.25 1-3.2-7.4-4.4 4.7z" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  ),
  rect: (
    <svg viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  ),
  ellipse: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2L2 12l10 10 10-10L12 2z" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24">
      <path d="M21.71 3.29a.995.995 0 00-1.41 0L2 21.59l1.41 1.41L21.71 4.7c.39-.39.39-1.02 0-1.41z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24">
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24">
      <path d="M5 4v3h5.5v12h3V7H19V4H5z" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
  ),
  eraser: (
    <svg viewBox="0 0 24 24">
      <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.04 0 2.83L5.03 20h7.11l9.27-9.27c.78-.77.78-2.04 0-2.83l-4.86-4.86c-.39-.39-.9-.59-1.41-.59zm-7.66 15H5.41l-1.4-1.4 7.6-7.6 2.07 2.07-6.2 6.93z" />
    </svg>
  ),
}

const Canvas = ({state, dispatch, navigate}) => {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const clipRef = useRef(null)
  const [size, setSize] = useState({w: 800, h: 600})
  const interaction = useRef(null)
  const [cursor, setCursor] = useState('default')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const [, setTick] = useState(0)

  const forceRedraw = () => setTick(t => t + 1)

  const CustomSlider = ({min, max, step, value, onChange}) => {
    const trackRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const updateVal = useCallback(
      clientX => {
        if (!trackRef.current) return
        const rect = trackRef.current.getBoundingClientRect()
        let pct = (clientX - rect.left) / rect.width
        pct = Math.max(0, Math.min(1, pct))
        let val = min + pct * (max - min)
        if (step) val = Math.round(val / step) * step
        onChange(val)
      },
      [min, max, step, onChange]
    )
    const onPointerDown = e => {
      e.preventDefault()
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      updateVal(e.clientX)
    }
    const onPointerMove = e => {
      if (!isDragging) return
      updateVal(e.clientX)
    }
    const onPointerUp = e => {
      setIsDragging(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
    const pct = ((value - min) / (max - min)) * 100
    return (
      <div
        className={style[bem.e('slider')]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={style[bem.e('slider-track')]} ref={trackRef}>
          <div className={style[bem.e('slider-fill')]} style={{width: `${pct}%`}} />
          <div className={style[bem.e('slider-thumb')]} style={{left: `${pct}%`}} />
        </div>
      </div>
    )
  }

  useEffect(() => {
    const kd = e => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const ku = e => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  const onWheelRef = useRef(null)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = e => {
      if (typeof onWheelRef.current === 'function') onWheelRef.current(e)
    }
    el.addEventListener('wheel', handler, {passive: false})
    return () => el.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(() => {
      if (!wrapRef.current) return
      const r = wrapRef.current.getBoundingClientRect()
      setSize({w: Math.max(300, r.width), h: Math.max(300, r.height)})
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    state.scene.elements.forEach(el => {
      if (el.type === 'image' && el.src) preloadImage(el.src, forceRedraw)
    })
  }, [state.scene.elements])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr
    c.height = size.h * dpr
    c.style.width = `${size.w}px`
    c.style.height = `${size.h}px`

    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.w, size.h)

    if (canvasRef.current) {
      canvasRef.current.style.backgroundPosition = `${state.view.offsetX}px ${state.view.offsetY}px`
      canvasRef.current.style.backgroundSize = `${24 * state.view.zoom}px ${24 * state.view.zoom}px`
    }

    ctx.save()
    ctx.translate(state.view.offsetX, state.view.offsetY)
    ctx.scale(state.view.zoom, state.view.zoom)

    state.scene.elements.forEach(el => {
      if (state.ui.editingTextId && el.id === state.ui.editingTextId) return
      drawElement(ctx, el)
    })

    state.scene.selectedIds.forEach(id => {
      const el = state.scene.elements.find(e => e.id === id)
      if (el) drawSelection(ctx, el)
    })

    if (interaction.current?.preview) drawElement(ctx, interaction.current.preview)
    if (interaction.current?.marquee) {
      const m = interaction.current.marquee
      ctx.save()
      ctx.strokeStyle = '#6965db'
      ctx.fillStyle = 'rgba(105,101,219,0.08)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.fillRect(m.x, m.y, m.w, m.h)
      ctx.strokeRect(m.x, m.y, m.w, m.h)
      ctx.restore()
    }
    ctx.restore()
  })

  const loadedBoardRef = useRef(null)
  useEffect(() => {
    const id = state.activeBoardId
    if (!id) {
      navigate('gallery')
      return
    }
    if (loadedBoardRef.current === id) return
    ;(async () => {
      const b = await getBoard(id)
      if (b) {
        loadedBoardRef.current = id
        dispatch({type: 'LOAD_SCENE', payload: b.elements || []})
      }
    })()
  }, [state.activeBoardId])

  const saveTimer = useRef(null)
  useEffect(() => {
    if (!state.activeBoardId) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const b = await getBoard(state.activeBoardId)
      if (!b) return
      let thumbnail = b.thumbnail
      try {
        const els = state.scene.elements
        if (els.length > 0) {
          const imageElements = els.filter(el => el.type === 'image' && el.src);
          await Promise.all(imageElements.map(el => new Promise(resolve => preloadImage(el.src, resolve))));

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          els.forEach(el => {
            const bbox = getBounds(el)
            minX = Math.min(minX, bbox.x)
            minY = Math.min(minY, bbox.y)
            maxX = Math.max(maxX, bbox.x + bbox.w)
            maxY = Math.max(maxY, bbox.y + bbox.h)
          })
          const pad = 30
          const w = (maxX - minX) + pad * 2
          const h = (maxY - minY) + pad * 2

          const maxDimension = 4096;
          let targetW = 600;
          let scale = targetW / Math.max(w, 1);
          if (w * scale > maxDimension || h * scale > maxDimension) {
            scale = Math.min(maxDimension / w, maxDimension / h);
            targetW = w * scale;
          }

          const temp = document.createElement('canvas')
          temp.width = targetW
          temp.height = h * scale
          const tx = temp.getContext('2d')
          tx.fillStyle = '#ffffff'
          tx.fillRect(0, 0, temp.width, temp.height)
          tx.scale(scale, scale)
          tx.translate(-minX + pad, -minY + pad)
          els.forEach(el => {
            drawElement(tx, el)
          })
          thumbnail = temp.toDataURL('image/png', 0.85)
        } else {
          thumbnail = null
        }
      } catch {}
      await putBoard({...b, elements: state.scene.elements, thumbnail, updatedAt: Date.now()})
    }, 1000)
    return () => clearTimeout(saveTimer.current)
  }, [state.scene.elements, state.activeBoardId])

  const screenToWorld = useCallback(
    e => {
      const r = canvasRef.current.getBoundingClientRect()
      const sx = e.clientX - r.left,
        sy = e.clientY - r.top
      return {
        x: (sx - state.view.offsetX) / state.view.zoom,
        y: (sy - state.view.offsetY) / state.view.zoom,
        sx,
        sy,
      }
    },
    [state.view]
  )

  const onMouseDown = e => {
    if (e.button === 1 || spaceDown || state.tool === 'pan') {
      const r = canvasRef.current.getBoundingClientRect()
      interaction.current = {
        kind: 'pan',
        startSX: e.clientX - r.left,
        startSY: e.clientY - r.top,
        startOX: state.view.offsetX,
        startOY: state.view.offsetY,
      }
      setCursor('grabbing')
      return
    }
    const {x, y} = screenToWorld(e)
    const tool = state.tool

    if (tool === 'select') {
      if (state.scene.selectedIds.length === 1) {
        const sel = state.scene.elements.find(el => el.id === state.scene.selectedIds[0])
        if (sel) {
          const handle = hitHandle(getBounds(sel), x, y)
          if (handle) {
            dispatch({type: 'BEGIN_HISTORY'})
            interaction.current = {
              kind: 'resize',
              handle,
              id: sel.id,
              orig: {...sel},
              startX: x,
              startY: y,
            }
            return
          }
        }
      }
      const hits = state.scene.elements
        .slice()
        .reverse()
        .filter(el => hitTest(el, x, y))
      const hit = hits[0]
      if (hit) {
        let selectedIds = state.scene.selectedIds
        if (e.shiftKey) {
          selectedIds = selectedIds.includes(hit.id)
            ? selectedIds.filter(i => i !== hit.id)
            : [...selectedIds, hit.id]
        } else if (!selectedIds.includes(hit.id)) {
          selectedIds = [hit.id]
        }

        if (e.altKey) {
          const newEls = state.scene.elements.filter(el => selectedIds.includes(el.id)).map(el => {
             return {
                ...el,
                id: uid(),
                x: el.x !== undefined ? el.x + 20 : undefined,
                y: el.y !== undefined ? el.y + 20 : undefined,
                x1: el.x1 !== undefined ? el.x1 + 20 : undefined,
                y1: el.y1 !== undefined ? el.y1 + 20 : undefined,
                x2: el.x2 !== undefined ? el.x2 + 20 : undefined,
                y2: el.y2 !== undefined ? el.y2 + 20 : undefined,
                points: el.points ? el.points.map(p => [p[0]+20, p[1]+20]) : undefined
             }
          })
          dispatch({type: 'BEGIN_HISTORY'})
          dispatch({type: 'REPLACE_ELEMENTS', payload: [...state.scene.elements, ...newEls]})
          const newIds = newEls.map(e => e.id)
          dispatch({type: 'SET_SELECTED', payload: newIds})
          const origs = {}
          newIds.forEach(id => {
            const el = newEls.find(e => e.id === id)
            if (el) origs[id] = JSON.parse(JSON.stringify(el))
          })
          interaction.current = {kind: 'move', startX: x, startY: y, ids: newIds, origs}
          return
        }

        dispatch({type: 'SET_SELECTED', payload: selectedIds})
        dispatch({type: 'BEGIN_HISTORY'})
        const origs = {}
        selectedIds.forEach(id => {
          const el = state.scene.elements.find(e => e.id === id)
          if (el) origs[id] = JSON.parse(JSON.stringify(el))
        })
        interaction.current = {kind: 'move', startX: x, startY: y, ids: selectedIds, origs}
      } else {
        dispatch({type: 'SET_SELECTED', payload: []})
        interaction.current = {kind: 'marquee', startX: x, startY: y, marquee: {x, y, w: 0, h: 0}}
      }
    } else if (tool === 'eraser') {
      interaction.current = {kind: 'erase', toDelete: new Set()}
      eraseAt(x, y)
    } else if (tool === 'pen') {
      dispatch({type: 'BEGIN_HISTORY'})
      const el = makeElement('pen', state.style, x, y)
      interaction.current = {kind: 'pen', el, preview: el}
    } else if (tool === 'text') {
      const el = makeElement('text', state.style, x, y)
      dispatch({type: 'BEGIN_HISTORY'})
      dispatch({type: 'ADD_ELEMENT', payload: el})
      dispatch({type: 'SET_EDITING_TEXT', payload: el.id})
      dispatch({type: 'SET_TOOL', payload: 'select'})
    } else if (tool === 'image') {
      pickImage(x, y)
    } else {
      const el = makeElement(tool, state.style, x, y)
      interaction.current = {kind: 'create', el, preview: el, startX: x, startY: y}
    }
  }

  const onMouseMove = e => {
    const {x, y} = screenToWorld(e)
    const it = interaction.current

    if (!it) {
      if (state.tool === 'select') {
        let cs = 'default'
        if (state.scene.selectedIds.length === 1) {
          const sel = state.scene.elements.find(el => el.id === state.scene.selectedIds[0])
          if (sel) {
            const h = hitHandle(getBounds(sel), x, y)
            if (h)
              cs =
                h === 'nw' || h === 'se'
                  ? 'nwse-resize'
                  : h === 'ne' || h === 'sw'
                    ? 'nesw-resize'
                    : h === 'n' || h === 's'
                      ? 'ns-resize'
                      : 'ew-resize'
          }
        }
        if (cs === 'default') {
          const over = state.scene.elements.some(el => hitTest(el, x, y))
          cs = over ? 'move' : 'default'
        }
        setCursor(cs)
      } else if (state.tool === 'pan') {
        setCursor('grab')
      } else {
        setCursor('crosshair')
      }
    }

    if (!it) return

    if (it.kind === 'pan') {
      const r = canvasRef.current.getBoundingClientRect()
      const dx = e.clientX - r.left - it.startSX
      const dy = e.clientY - r.top - it.startSY
      dispatch({type: 'SET_VIEW', payload: {offsetX: it.startOX + dx, offsetY: it.startOY + dy}})
    } else if (it.kind === 'create') {
      const el = it.el
      if (el.type === 'line' || el.type === 'arrow') {
        el.x2 = x
        el.y2 = y
      } else {
        el.x = Math.min(it.startX, x)
        el.y = Math.min(it.startY, y)
        el.w = Math.abs(x - it.startX)
        el.h = Math.abs(y - it.startY)
      }
      forceRedraw()
    } else if (it.kind === 'pen') {
      it.el.points.push([x, y])
      forceRedraw()
    } else if (it.kind === 'move') {
      const dx = x - it.startX,
        dy = y - it.startY
      const map = {}
      it.ids.forEach(id => {
        const o = it.origs[id]
        if (!o) return
        if (o.type === 'pen') map[id] = {points: o.points.map(p => [p[0] + dx, p[1] + dy])}
        else if (o.type === 'line' || o.type === 'arrow')
          map[id] = {x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy}
        else map[id] = {x: o.x + dx, y: o.y + dy}
      })
      dispatch({type: 'UPDATE_ELEMENTS', payload: map})
    } else if (it.kind === 'resize') {
      const o = it.orig
      const b = getBounds(o)
      let nx = b.x,
        ny = b.y,
        nw = b.w,
        nh = b.h
      const h = it.handle
      if (h.includes('e')) nw = Math.max(8, x - b.x)
      if (h.includes('s')) nh = Math.max(8, y - b.y)
      if (h.includes('w')) {
        nw = Math.max(8, b.x + b.w - x)
        nx = x
      }
      if (h.includes('n')) {
        nh = Math.max(8, b.y + b.h - y)
        ny = y
      }
      let patch
      if (o.type === 'line' || o.type === 'arrow') {
        const sx = nw / (b.w || 1),
          sy = nh / (b.h || 1)
        patch = {
          x1: nx + (o.x1 - b.x) * sx,
          y1: ny + (o.y1 - b.y) * sy,
          x2: nx + (o.x2 - b.x) * sx,
          y2: ny + (o.y2 - b.y) * sy,
        }
      } else if (o.type === 'pen') {
        const sx = nw / (b.w || 1),
          sy = nh / (b.h || 1)
        patch = {points: o.points.map(p => [nx + (p[0] - b.x) * sx, ny + (p[1] - b.y) * sy])}
      } else patch = {x: nx, y: ny, w: nw, h: nh}
      dispatch({type: 'UPDATE_ELEMENT', payload: {id: it.id, patch}})
    } else if (it.kind === 'marquee') {
      it.marquee = {
        x: Math.min(it.startX, x),
        y: Math.min(it.startY, y),
        w: Math.abs(x - it.startX),
        h: Math.abs(y - it.startY),
      }
      forceRedraw()
    } else if (it.kind === 'erase') {
      eraseAt(x, y)
    }
  }

  const eraseAt = (x, y) => {
    const it = interaction.current
    state.scene.elements.forEach(el => {
      if (hitTest(el, x, y)) it.toDelete.add(el.id)
    })
    if (it.toDelete.size) dispatch({type: 'DELETE_ELEMENTS', payload: Array.from(it.toDelete)})
  }

  const onMouseUp = () => {
    const it = interaction.current
    if (!it) return
    if (it.kind === 'create') {
      const el = it.el
      const b = getBounds(el)
      if (b.w > 2 || b.h > 2 || el.type === 'line' || el.type === 'arrow') {
        dispatch({type: 'BEGIN_HISTORY'})
        dispatch({type: 'ADD_ELEMENT', payload: el})
      }
      dispatch({type: 'SET_TOOL', payload: 'select'})
    } else if (it.kind === 'pen') {
      if (it.el.points.length > 1) dispatch({type: 'ADD_ELEMENT', payload: it.el})
    } else if (it.kind === 'marquee') {
      const m = it.marquee
      const ids = state.scene.elements
        .filter(el => {
          const b = getBounds(el)
          return b.x >= m.x && b.y >= m.y && b.x + b.w <= m.x + m.w && b.y + b.h <= m.y + m.h
        })
        .map(el => el.id)
      dispatch({type: 'SET_SELECTED', payload: ids})
    }
    interaction.current = null
    if (state.tool === 'select') setCursor('default')
    else if (state.tool === 'pan') setCursor('grab')
    else setCursor('crosshair')
    forceRedraw()
  }

  const onWheel = e => {
    e.preventDefault()
    const delta = -e.deltaY * 0.0015
    const factor = 1 + delta
    if (factor <= 0) return

    if (state.scene.selectedIds.length) {
      const b = getSelectionBounds(state.scene.elements, state.scene.selectedIds)
      if (!b) return
      const cx = b.x + b.w / 2
      const cy = b.y + b.h / 2
      const scale = Math.max(0.1, Math.min(5, factor))
      const map = {}
      state.scene.selectedIds.forEach(id => {
        const el = state.scene.elements.find(e => e.id === id)
        if (!el) return
        if (el.type === 'pen') {
          map[id] = {
            points: el.points.map(p => [cx + (p[0] - cx) * scale, cy + (p[1] - cy) * scale]),
          }
        } else if (el.type === 'line' || el.type === 'arrow') {
          map[id] = {
            x1: cx + (el.x1 - cx) * scale,
            y1: cy + (el.y1 - cy) * scale,
            x2: cx + (el.x2 - cx) * scale,
            y2: cy + (el.y2 - cy) * scale,
          }
        } else if (el.type === 'text') {
          const nextFont = Math.max(8, (el.fontSize || state.style.fontSize || 20) * scale)
          map[id] = {
            x: cx + (el.x - cx) * scale,
            y: cy + (el.y - cy) * scale,
            w: (el.w || 0) * scale,
            h: (el.h || 0) * scale,
            fontSize: nextFont,
          }
        } else {
          map[id] = {
            x: cx + (el.x - cx) * scale,
            y: cy + (el.y - cy) * scale,
            w: (el.w || 0) * scale,
            h: (el.h || 0) * scale,
          }
        }
      })
      dispatch({type: 'BEGIN_HISTORY'})
      dispatch({type: 'UPDATE_ELEMENTS', payload: map})
      return
    }

    const r = canvasRef.current.getBoundingClientRect()
    const sx = e.clientX - r.left,
      sy = e.clientY - r.top
    const wx = (sx - state.view.offsetX) / state.view.zoom
    const wy = (sy - state.view.offsetY) / state.view.zoom
    const zoom = Math.min(4, Math.max(0.1, state.view.zoom * factor))
    dispatch({type: 'SET_VIEW', payload: {zoom, offsetX: sx - wx * zoom, offsetY: sy - wy * zoom}})
    if (state.tool !== 'pan') dispatch({type: 'SET_TOOL', payload: 'pan'})
  }
  onWheelRef.current = onWheel

  const bringToFront = useCallback(() => {
    if (!state.scene.selectedIds.length) return
    dispatch({type: 'BEGIN_HISTORY'})
    const els = [...state.scene.elements]
    const selSet = new Set(state.scene.selectedIds)
    const unsel = els.filter(e => !selSet.has(e.id))
    const sel = els.filter(e => selSet.has(e.id))
    dispatch({type: 'REPLACE_ELEMENTS', payload: [...unsel, ...sel]})
  }, [state.scene.selectedIds, state.scene.elements, dispatch])

  const sendToBack = useCallback(() => {
    if (!state.scene.selectedIds.length) return
    dispatch({type: 'BEGIN_HISTORY'})
    const els = [...state.scene.elements]
    const selSet = new Set(state.scene.selectedIds)
    const unsel = els.filter(e => !selSet.has(e.id))
    const sel = els.filter(e => selSet.has(e.id))
    dispatch({type: 'REPLACE_ELEMENTS', payload: [...sel, ...unsel]})
  }, [state.scene.selectedIds, state.scene.elements, dispatch])

  const moveForward = useCallback(() => {
    if (!state.scene.selectedIds.length) return
    dispatch({type: 'BEGIN_HISTORY'})
    const els = [...state.scene.elements]
    const selSet = new Set(state.scene.selectedIds)
    for(let i = els.length - 2; i >= 0; i--) {
        if (selSet.has(els[i].id) && !selSet.has(els[i+1].id)) {
            const temp = els[i];
            els[i] = els[i+1];
            els[i+1] = temp;
        }
    }
    dispatch({type: 'REPLACE_ELEMENTS', payload: els})
  }, [state.scene.selectedIds, state.scene.elements, dispatch])

  const moveBackward = useCallback(() => {
    if (!state.scene.selectedIds.length) return
    dispatch({type: 'BEGIN_HISTORY'})
    const els = [...state.scene.elements]
    const selSet = new Set(state.scene.selectedIds)
    for(let i = 1; i < els.length; i++) {
        if (selSet.has(els[i].id) && !selSet.has(els[i-1].id)) {
            const temp = els[i];
            els[i] = els[i-1];
            els[i-1] = temp;
        }
    }
    dispatch({type: 'REPLACE_ELEMENTS', payload: els})
  }, [state.scene.selectedIds, state.scene.elements, dispatch])

  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({type: 'UNDO'})
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        dispatch({type: 'REDO'})
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        const selected = state.scene.elements.filter(el => state.scene.selectedIds.includes(el.id))
        if (selected.length) clipRef.current = JSON.stringify(selected)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        if (clipRef.current) {
          const parsed = JSON.parse(clipRef.current)
          const newEls = parsed.map(el => {
             return { ...el, id: uid(),
                x: el.x !== undefined ? el.x + 20 : undefined,
                y: el.y !== undefined ? el.y + 20 : undefined,
                x1: el.x1 !== undefined ? el.x1 + 20 : undefined,
                y1: el.y1 !== undefined ? el.y1 + 20 : undefined,
                x2: el.x2 !== undefined ? el.x2 + 20 : undefined,
                y2: el.y2 !== undefined ? el.y2 + 20 : undefined,
                points: el.points ? el.points.map(p => [p[0]+20, p[1]+20]) : undefined
             }
          })
          dispatch({type: 'BEGIN_HISTORY'})
          dispatch({type: 'REPLACE_ELEMENTS', payload: [...state.scene.elements, ...newEls]})
          dispatch({type: 'SET_SELECTED', payload: newEls.map(e => e.id)})
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        dispatch({type: 'SET_SELECTED', payload: state.scene.elements.map(e => e.id)})
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        const selected = state.scene.elements.filter(el => state.scene.selectedIds.includes(el.id))
        if (selected.length) {
          const newEls = selected.map(el => {
             return { ...el, id: uid(),
                x: el.x !== undefined ? el.x + 20 : undefined,
                y: el.y !== undefined ? el.y + 20 : undefined,
                x1: el.x1 !== undefined ? el.x1 + 20 : undefined,
                y1: el.y1 !== undefined ? el.y1 + 20 : undefined,
                x2: el.x2 !== undefined ? el.x2 + 20 : undefined,
                y2: el.y2 !== undefined ? el.y2 + 20 : undefined,
                points: el.points ? el.points.map(p => [p[0]+20, p[1]+20]) : undefined
             }
          })
          dispatch({type: 'BEGIN_HISTORY'})
          dispatch({type: 'REPLACE_ELEMENTS', payload: [...state.scene.elements, ...newEls]})
          dispatch({type: 'SET_SELECTED', payload: newEls.map(e => e.id)})
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.scene.selectedIds.length) {
          dispatch({type: 'BEGIN_HISTORY'})
          dispatch({type: 'DELETE_ELEMENTS', payload: state.scene.selectedIds})
        }
      } else if (e.key === 'Escape') {
        dispatch({type: 'SET_SELECTED', payload: []})
        dispatch({type: 'SET_TOOL', payload: 'select'})
      } else if (e.key === 'h' && state.tool !== 'pan') {
        dispatch({type: 'SET_TOOL', payload: 'pan'})
      } else if (e.key === 'v' && state.tool !== 'select') {
        dispatch({type: 'SET_TOOL', payload: 'select'})
      } else if (e.key === ']') {
        moveForward()
      } else if (e.key === '[') {
        moveBackward()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.scene.selectedIds, state.scene.elements, state.tool, moveForward, moveBackward, dispatch])

  const pickImage = (x, y) => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = e => {
      const f = e.target.files?.[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        preloadImage(reader.result, img => {
          if (!img || !img.width || !img.height) return
          const maxW = 300
          const ratio = img.height / img.width
          if (isNaN(ratio) || !isFinite(ratio)) return
          const w = Math.min(maxW, img.width)
          const h = w * ratio
          const el = {id: uid(), type: 'image', x, y, w, h, src: reader.result, opacity: 1}
          dispatch({type: 'BEGIN_HISTORY'})
          dispatch({type: 'ADD_ELEMENT', payload: el})
          dispatch({type: 'SET_TOOL', payload: 'select'})
        })
      }
      reader.readAsDataURL(f)
    }
    inp.click()
  }

  const exportPNG = () => {
    const els = state.scene.elements;
    if (!els || els.length === 0) return;

    const imageElements = els.filter(el => el.type === 'image' && el.src);
    const loadPromises = imageElements.map(el => {
      return new Promise((resolve) => {
        preloadImage(el.src, () => resolve());
      });
    });

    Promise.all(loadPromises).then(() => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      els.forEach(el => {
        const bbox = getBounds(el);
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.w);
        maxY = Math.max(maxY, bbox.y + bbox.h);
      });
      const pad = 40;
      const w = (maxX - minX) + pad * 2;
      const h = (maxY - minY) + pad * 2;

      const maxDimension = 4096;
      let exportScale = 2;
      if (w * exportScale > maxDimension || h * exportScale > maxDimension) {
        exportScale = Math.min(maxDimension / w, maxDimension / h);
      }

      const exp = document.createElement('canvas');
      exp.width = w * exportScale;
      exp.height = h * exportScale;
      const cx = exp.getContext('2d');
      cx.scale(exportScale, exportScale);
      cx.fillStyle = '#ffffff';
      cx.fillRect(0, 0, w, h);
      cx.save();
      cx.translate(-minX + pad, -minY + pad);
      els.forEach(el => {
        drawElement(cx, el);
      });
      cx.restore();
      const a = document.createElement('a');
      a.href = exp.toDataURL('image/png');
      a.download = 'canvas-export.png';
      a.click();
    });
  }

  const exportJSON = async () => {
    const b = await getBoard(state.activeBoardId)
    const data = {name: b?.name, elements: state.scene.elements}
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (b?.name || 'sukinDraw') + '.json'
    a.click()
  }

  const applyStyle = patch => {
    dispatch({type: 'SET_STYLE', payload: patch})
    if (state.scene.selectedIds.length) {
      const map = {}
      state.scene.selectedIds.forEach(id => (map[id] = patch))
      dispatch({type: 'BEGIN_HISTORY'})
      dispatch({type: 'UPDATE_ELEMENTS', payload: map})
    }
    forceRedraw()
  }

  const patchForMove = (e, dx, dy) => {
    if (e.type === 'pen') return {points: e.points.map(p => [p[0] + dx, p[1] + dy])}
    if (e.type === 'line' || e.type === 'arrow')
      return {x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy}
    return {x: e.x + dx, y: e.y + dy}
  }

  const alignElements = type => {
    if (state.scene.selectedIds.length < 2) return
    dispatch({type: 'BEGIN_HISTORY'})
    const els = state.scene.selectedIds
      .map(id => state.scene.elements.find(e => e.id === id))
      .filter(Boolean)
    const bounds = els.map(e => ({e, b: getBounds(e)}))
    let map = {}
    if (type === 'left') {
      const minX = Math.min(...bounds.map(x => x.b.x))
      bounds.forEach(x => {
        map[x.e.id] = patchForMove(x.e, minX - x.b.x, 0)
      })
    } else if (type === 'right') {
      const maxX = Math.max(...bounds.map(x => x.b.x + x.b.w))
      bounds.forEach(x => {
        map[x.e.id] = patchForMove(x.e, maxX - (x.b.x + x.b.w), 0)
      })
    } else if (type === 'top') {
      const minY = Math.min(...bounds.map(x => x.b.y))
      bounds.forEach(x => {
        map[x.e.id] = patchForMove(x.e, 0, minY - x.b.y)
      })
    } else if (type === 'bottom') {
      const maxY = Math.max(...bounds.map(x => x.b.y + x.b.h))
      bounds.forEach(x => {
        map[x.e.id] = patchForMove(x.e, 0, maxY - (x.b.y + x.b.h))
      })
    } else if (type === 'center') {
      const minX = Math.min(...bounds.map(x => x.b.x))
      const maxX = Math.max(...bounds.map(x => x.b.x + x.b.w))
      const cx = (minX + maxX) / 2
      bounds.forEach(x => {
        map[x.e.id] = patchForMove(x.e, cx - (x.b.x + x.b.w / 2), 0)
      })
    } else if (type === 'middle') {
      const minY = Math.min(...bounds.map(x => x.b.y))
      const maxY = Math.max(...bounds.map(x => x.b.y + x.b.h))
      const cy = (minY + maxY) / 2
      bounds.forEach(x => {
        map[x.e.id] = patchForMove(x.e, 0, cy - (x.b.y + x.b.h / 2))
      })
    }
    dispatch({type: 'UPDATE_ELEMENTS', payload: map})
  }

  const selEl =
    state.scene.selectedIds.length === 1
      ? state.scene.elements.find(e => e.id === state.scene.selectedIds[0])
      : null
  const curStyle = selEl ? {...state.style, ...selEl} : state.style
  const editingEl = state.ui.editingTextId
    ? state.scene.elements.find(e => e.id === state.ui.editingTextId)
    : null
  const showProps =
    state.scene.selectedIds.length > 0 || !['select', 'pan', 'eraser', 'image'].includes(state.tool)

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('main')]} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={style[bem.e('canvas')]}
          style={{cursor}}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onContextMenu={e => e.preventDefault()}
          onDoubleClick={e => {
            const {x, y} = screenToWorld(e)
            const hit = state.scene.elements
              .slice()
              .reverse()
              .find(el => hitTest(el, x, y))
            if (hit && hit.type === 'text') dispatch({type: 'SET_EDITING_TEXT', payload: hit.id})
          }}
        />

        <div className={style[bem.e('tools-float')]}>
          {TOOLS.map(t => (
            <React.Fragment key={t.id}>
              {t.id === 'image' && <div className={style[bem.e('tool-sep')]} />}
              <button
                className={[
                  style[bem.e('tool')],
                  state.tool === t.id ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={t.label}
                onClick={() => dispatch({type: 'SET_TOOL', payload: t.id})}
              >
                {ICON_MAP[t.id]}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className={style[bem.e('topbar')]}>
          <button
            className={style[bem.e('tb-btn')]}
            onClick={() => navigate('gallery')}
            title="返回图库"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <div className={style[bem.e('tb-sep')]} />
          <button
            className={style[bem.e('tb-btn')]}
            onClick={() => dispatch({type: 'UNDO'})}
            title="撤销 (Ctrl+Z)"
          >
            <svg viewBox="0 0 24 24">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
            </svg>
          </button>
          <button
            className={style[bem.e('tb-btn')]}
            onClick={() => dispatch({type: 'REDO'})}
            title="重做 (Ctrl+Y)"
          >
            <svg viewBox="0 0 24 24">
              <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
            </svg>
          </button>
          <div className={style[bem.e('tb-sep')]} />
          <button className={style[bem.e('tb-btn')]} onClick={exportPNG}>
            <svg viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            导出 PNG
          </button>
          <button className={style[bem.e('tb-btn')]} onClick={exportJSON}>
            <svg viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            导出 JSON
          </button>
          <div className={style[bem.e('tb-sep')]} />
          <button className={style[bem.e('tb-btn')]} onClick={() => setClearConfirm(true)}>
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            清空
          </button>
        </div>

        {showProps && (
          <div className={style[bem.e('props')]}>
            {state.scene.selectedIds.length > 0 && (
              <div className={style[bem.e('prop-row')]}>
                <div className={style[bem.e('prop-label')]}>层级与操作</div>
                <div className={style[bem.e('pills')]} style={{flexWrap: 'wrap'}}>
                  <button className={style[bem.e('pill')]} onClick={bringToFront}>置于顶层</button>
                  <button className={style[bem.e('pill')]} onClick={moveForward}>上移一层</button>
                  <button className={style[bem.e('pill')]} onClick={moveBackward}>下移一层</button>
                  <button className={style[bem.e('pill')]} onClick={sendToBack}>置于底层</button>
                  <button className={style[bem.e('pill')]} onClick={() => {
                    if (state.scene.selectedIds.length) {
                      dispatch({type: 'BEGIN_HISTORY'})
                      dispatch({type: 'DELETE_ELEMENTS', payload: state.scene.selectedIds})
                    }
                  }} style={{color: '#e03131', flex: '1 0 100%', marginTop: 2}}>删除选中 (Del)</button>
                </div>
              </div>
            )}
            {state.scene.selectedIds.length > 1 && (
              <div className={style[bem.e('prop-row')]}>
                <div className={style[bem.e('prop-label')]}>对齐</div>
                <div className={style[bem.e('pills')]} style={{flexWrap: 'wrap'}}>
                  <button className={style[bem.e('pill')]} onClick={() => alignElements('left')}>
                    左对齐
                  </button>
                  <button className={style[bem.e('pill')]} onClick={() => alignElements('center')}>
                    水平居中
                  </button>
                  <button className={style[bem.e('pill')]} onClick={() => alignElements('right')}>
                    右对齐
                  </button>
                  <button className={style[bem.e('pill')]} onClick={() => alignElements('top')}>
                    顶对齐
                  </button>
                  <button className={style[bem.e('pill')]} onClick={() => alignElements('middle')}>
                    垂直居中
                  </button>
                  <button className={style[bem.e('pill')]} onClick={() => alignElements('bottom')}>
                    底对齐
                  </button>
                </div>
              </div>
            )}
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>描边颜色</div>
              <div className={style[bem.e('swatches')]}>
                {STROKE_COLORS.map(c => (
                  <div
                    key={c}
                    className={[
                      style[bem.e('swatch')],
                      curStyle.stroke === c ? style[bem.is('active', true)] : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{background: c}}
                    onClick={() => applyStyle({stroke: c})}
                  />
                ))}
                <label className={style[bem.e('swatch')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                  <input type="color" value={curStyle.stroke || '#000000'} onChange={e => applyStyle({stroke: e.target.value})} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
                </label>
              </div>
            </div>
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>填充颜色</div>
              <div className={style[bem.e('swatches')]}>
                {FILL_COLORS.map(c => (
                  <div
                    key={c}
                    className={[
                      style[bem.e('swatch')],
                      c === 'transparent' ? style[bem.em('swatch', 'transparent')] : '',
                      curStyle.fill === c ? style[bem.is('active', true)] : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={c !== 'transparent' ? {background: c} : {}}
                    onClick={() => applyStyle({fill: c})}
                  />
                ))}
                <label className={style[bem.e('swatch')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                  <input type="color" value={curStyle.fill === 'transparent' ? '#000000' : (curStyle.fill || '#000000')} onChange={e => applyStyle({fill: e.target.value})} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
                </label>
              </div>
            </div>
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>填充样式</div>
              <div className={style[bem.e('pills')]}>
                {['hachure', 'solid'].map(s => (
                  <button
                    key={s}
                    className={[
                      style[bem.e('pill')],
                      curStyle.fillStyle === s ? style[bem.is('active', true)] : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => applyStyle({fillStyle: s})}
                  >
                    {s === 'hachure' ? '斜线' : '实心'}
                  </button>
                ))}
              </div>
            </div>
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>线条宽度</div>
              <div className={style[bem.e('pills')]}>
                {STROKE_WIDTHS.map(w => (
                  <button
                    key={w}
                    className={[
                      style[bem.e('pill')],
                      curStyle.strokeWidth === w ? style[bem.is('active', true)] : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => applyStyle({strokeWidth: w})}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            {(state.tool === 'pen' || selEl?.type === 'pen') && (
              <div className={style[bem.e('prop-row')]}>
                <div className={style[bem.e('prop-label')]}>画笔类型</div>
                <div className={style[bem.e('pills')]}>
                  {PEN_TYPES.map(t => (
                    <button
                      key={t.id}
                      className={[
                        style[bem.e('pill')],
                        curStyle.penType === t.id ? style[bem.is('active', true)] : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => applyStyle({penType: t.id})}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>线条类型</div>
              <div className={style[bem.e('pills')]}>
                {['solid', 'dashed', 'dotted'].map(d => (
                  <button
                    key={d}
                    className={[
                      style[bem.e('pill')],
                      curStyle.dasharray === d ? style[bem.is('active', true)] : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => applyStyle({dasharray: d})}
                  >
                    {d === 'solid' ? '实线' : d === 'dashed' ? '虚线' : '点线'}
                  </button>
                ))}
              </div>
            </div>
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>
                手绘风格 (粗糙度: {curStyle.roughness?.toFixed?.(1)})
              </div>
              <CustomSlider
                min={0}
                max={3}
                step={0.1}
                value={curStyle.roughness ?? 1.5}
                onChange={val => applyStyle({roughness: val})}
              />
            </div>
            <div className={style[bem.e('prop-row')]}>
              <div className={style[bem.e('prop-label')]}>
                透明度 ({Math.round((curStyle.opacity ?? 1) * 100)}%)
              </div>
              <CustomSlider
                min={0.1}
                max={1}
                step={0.05}
                value={curStyle.opacity ?? 1}
                onChange={val => applyStyle({opacity: val})}
              />
            </div>
            {(state.tool === 'text' || selEl?.type === 'text') && (
              <div className={style[bem.e('prop-row')]}>
                <div className={style[bem.e('prop-label')]}>文本字号</div>
                <div className={style[bem.e('pills')]}>
                  {FONT_SIZES.map(s => (
                    <button
                      key={s}
                      className={[
                        style[bem.e('pill')],
                        curStyle.fontSize === s ? style[bem.is('active', true)] : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => applyStyle({fontSize: s})}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={style[bem.e('zoom')]}>
          <button
            onClick={() =>
              dispatch({type: 'SET_VIEW', payload: {zoom: Math.max(0.1, state.view.zoom - 0.1)}})
            }
          >
            −
          </button>
          <span>{Math.round(state.view.zoom * 100)}%</span>
          <button
            onClick={() =>
              dispatch({type: 'SET_VIEW', payload: {zoom: Math.min(4, state.view.zoom + 0.1)}})
            }
          >
            +
          </button>
          <div className={style[bem.e('tb-sep')]} style={{margin: '0 2px', height: '14px'}} />
          <button
            onClick={() => dispatch({type: 'SET_VIEW', payload: {zoom: 1, offsetX: 0, offsetY: 0}})}
            title="重置视图"
          >
            <svg viewBox="0 0 24 24" style={{width: 16, height: 16, margin: '6px'}}>
              <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6z" />
            </svg>
          </button>
        </div>

        {editingEl && (
          <textarea
            className={style[bem.e('text-edit')]}
            autoFocus
            defaultValue={editingEl.text}
            style={{
              left: editingEl.x * state.view.zoom + state.view.offsetX,
              top: editingEl.y * state.view.zoom + state.view.offsetY,
              minWidth: 100,
              fontSize: (editingEl.fontSize || 20) * state.view.zoom,
              color: editingEl.stroke,
            }}
            onBlur={e => {
              const text = e.target.value
              const c = canvasRef.current.getContext('2d')
              c.font = `${editingEl.fontSize}px ${editingEl.fontFamily}, cursive`
              const lines = text.split('\n')
              const w = Math.max(...lines.map(l => c.measureText(l).width))
              const h = lines.length * editingEl.fontSize * 1.2
              dispatch({type: 'BEGIN_HISTORY'})
              if (text.trim() === '') dispatch({type: 'DELETE_ELEMENTS', payload: [editingEl.id]})
              else
                dispatch({type: 'UPDATE_ELEMENT', payload: {id: editingEl.id, patch: {text, w, h}}})
              dispatch({type: 'SET_EDITING_TEXT', payload: null})
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') e.target.blur()
            }}
          />
        )}
      </div>

      {clearConfirm && (
        <div className={style[bem.e('modal-mask')]} onClick={() => setClearConfirm(false)}>
          <div className={style[bem.e('modal')]} onClick={e => e.stopPropagation()}>
            <h3>清空画布</h3>
            <p>确定要清空所有内容吗？此操作不可撤销。</p>
            <div className={style[bem.e('modal-btns')]}>
              <button className={style[bem.e('tb-btn')]} onClick={() => setClearConfirm(false)}>
                取消
              </button>
              <button
                className={style[bem.e('tb-btn')]}
                style={{
                  color: '#FFF',
                  background: '#e03131',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '5px',
                }}
                onClick={() => {
                  dispatch({type: 'BEGIN_HISTORY'})
                  dispatch({type: 'REPLACE_ELEMENTS', payload: []})
                  setClearConfirm(false)
                }}
              >
                确定清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Canvas)
