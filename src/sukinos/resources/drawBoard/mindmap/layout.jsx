import React, {useEffect, useState, useRef, useCallback} from 'react'
import style from './style.module.css'
import {createNamespace} from '/utils/js/classcreate'
import {listMindmaps, putMindmap, getMindmap, deleteMindmap, uid} from '../db'

const bem = createNamespace('draw-board-mindmap')

const NH = 36,
  NPAD = 14,
  NMINW = 80,
  LGAP = 56,
  SGAP = 10,
  RH = 6

const PAL = {
  purple: {bg: '#f3f0ff', bd: '#b197fc', ln: '#9775fa', tx: '#5f3dc4'},
  blue: {bg: '#e7f5ff', bd: '#74c0fc', ln: '#4dabf7', tx: '#1864ab'},
  green: {bg: '#ebfbee', bd: '#69db7c', ln: '#51cf66', tx: '#2b8a3e'},
  orange: {bg: '#fff4e6', bd: '#ffa94d', ln: '#ff922b', tx: '#d9480f'},
  red: {bg: '#fff5f5', bd: '#ff8787', ln: '#ff6b6b', tx: '#c92a2a'},
  pink: {bg: '#fff0f6', bd: '#f783ac', ln: '#e64980', tx: '#a61e4d'},
  teal: {bg: '#e6fcf5', bd: '#63e6be', ln: '#38d9a9', tx: '#087f5b'},
  gray: {bg: '#f8f9fa', bd: '#ced4da', ln: '#868e96', tx: '#495057'},
}
const CKEYS = Object.keys(PAL)
const LVCOL = ['purple', 'blue', 'green', 'orange', 'teal', 'pink', 'red']

const SHAPES = [
  {id: 'topic', lb: '主题', ic: '⬭'},
  {id: 'rect', lb: '矩形', ic: '▬'},
  {id: 'diamond', lb: '菱形', ic: '◆'},
  {id: 'pill', lb: '胶囊', ic: '⬬'},
  {id: 'para', lb: '平行', ic: '▱'},
  {id: 'circle', lb: '圆形', ic: '●'},
  {id: 'cyl', lb: '数据库', ic: '⏛'},
  {id: 'triangle', lb: '三角', ic: '▲'},
  {id: 'hexagon', lb: '六边', ic: '⬡'},
  {id: 'frame', lb: '外框', ic: '⚄'},
]
const ARROWS = [
  {id: 'forward', lb: '→'},
  {id: 'backward', lb: '←'},
  {id: 'both', lb: '↔'},
  {id: 'none', lb: '—'},
]
const LTYPES = [
  {id: 'solid', lb: '━'},
  {id: 'dashed', lb: '╌'},
  {id: 'dotted', lb: '┄'},
]
const FONT_SIZES = [12, 13, 14, 16, 18, 20, 24, 32]
const TEXT_COLORS = ['#1b1b1f', '#868e96', '#fa5252', '#40c057', '#228be6', '#be4bdb', '#fd7e14']
const BORDER_STYLES = [
  {id: 'solid', lb: '实线'},
  {id: 'dashed', lb: '虚线'},
  {id: 'none', lb: '无'},
]
const BG_STYLES = [
  {id: 'solid', lb: '填充'},
  {id: 'transparent', lb: '透明'},
]

function gc(k) {
  if (k && k.startsWith('#')) {
    return { bg: k + '22', bd: k, ln: k, tx: k }
  }
  return PAL[k] || PAL.purple
}
function depth(ns, id) {
  let d = 0,
    n = ns.find(v => v.id === id)
  const visited = new Set()
  while (n && n.parentId) {
    if (visited.has(n.id)) break
    visited.add(n.id)
    d++
    n = ns.find(v => v.id === n.parentId)
  }
  return d
}
function children(ns, pid) {
  return ns.filter(n => n.parentId === pid)
}
function descIds(ns, id, visited = new Set()) {
  if (visited.has(id)) return []
  visited.add(id)
  const r = [id]
  ns.filter(n => n.parentId === id).forEach(c => r.push(...descIds(ns, c.id, visited)))
  return r
}

function measNodeSize(text, shape, manualW, manualH, fontSize) {
  if (shape === 'frame') return {w: manualW || 240, h: manualH || 180}
  let maxW = 240
  const fs = fontSize || 13
  const scale = fs / 13
  const paragraphs = (text || '').split('\n')
  let lines = 0
  let actualW = NMINW
  paragraphs.forEach(p => {
    let cW = 0
    for (let i = 0; i < p.length; i++) {
      const cw = (p.charCodeAt(i) > 127 ? 14 : 8.5) * scale
      if (cW + cw > maxW - NPAD * 2 && cW > 0) {
        lines++
        if (cW + NPAD * 2 > actualW) actualW = cW + NPAD * 2
        cW = cw
      } else {
        cW += cw
      }
    }
    lines++
    if (cW + NPAD * 2 > actualW) actualW = cW + NPAD * 2
  })
  return {w: manualW || Math.min(actualW, maxW), h: manualH || Math.max(NH, lines * fs * 1.4 + 16)}
}

function getAnc(p, side) {
  switch (side) {
    case 'top':
      return {x: p.x + p.w / 2, y: p.y}
    case 'right':
      return {x: p.x + p.w, y: p.y + p.h / 2}
    case 'bottom':
      return {x: p.x + p.w / 2, y: p.y + p.h}
    case 'left':
      return {x: p.x, y: p.y + p.h / 2}
  }
}
function bestAnc(p1, p2) {
  const dx = p2.x + p2.w / 2 - (p1.x + p1.w / 2),
    dy = p2.y + p2.h / 2 - (p1.y + p1.h / 2)
  if (Math.abs(dx) > Math.abs(dy)) {
    const s1 = dx > 0 ? 'right' : 'left',
      s2 = dx > 0 ? 'left' : 'right'
    return {from: getAnc(p1, s1), to: getAnc(p2, s2), s1, s2}
  }
  const s1 = dy > 0 ? 'bottom' : 'top',
    s2 = dy > 0 ? 'top' : 'bottom'
  return {from: getAnc(p1, s1), to: getAnc(p2, s2), s1, s2}
}
function cpPt(a, side, d) {
  d = d || 50
  switch (side) {
    case 'top':
      return {x: a.x, y: a.y - d}
    case 'right':
      return {x: a.x + d, y: a.y}
    case 'bottom':
      return {x: a.x, y: a.y + d}
    case 'left':
      return {x: a.x - d, y: a.y}
  }
}
function bzPt(a, b, c, d, t) {
  const m = 1 - t
  return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d
}
function drawAH(ctx, x, y, ang, sz) {
  sz = sz || 10
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - sz * Math.cos(ang - 0.35), y - sz * Math.sin(ang - 0.35))
  ctx.lineTo(x - sz * 0.4 * Math.cos(ang), y - sz * 0.4 * Math.sin(ang))
  ctx.lineTo(x - sz * Math.cos(ang + 0.35), y - sz * Math.sin(ang + 0.35))
  ctx.closePath()
  ctx.fill()
}

function autoLayout(nodes) {
  const cm = new Map(),
    roots = []
  nodes.forEach(n => {
    if (n.shape === 'frame') return
    if (!n.parentId) {
      roots.push(n)
      return
    }
    if (!cm.has(n.parentId)) cm.set(n.parentId, [])
    cm.get(n.parentId).push(n)
  })
  const pos = new Map()
  if (!roots.length) return pos
  function stH(n, visited) {
    if (visited.has(n.id)) return measNodeSize(n.text || '', n.shape, n.w, n.h, n.fontSize).h
    visited.add(n.id)
    const sz = measNodeSize(n.text || '', n.shape, n.w, n.h, n.fontSize)
    const ch = n.collapsed ? [] : cm.get(n.id) || []
    if (!ch.length) return sz.h
    let h = 0
    ch.forEach((c, i) => {
      h += stH(c, new Set(visited))
      if (i < ch.length - 1) h += SGAP
    })
    return Math.max(sz.h, h)
  }
  function lay(n, x, y, visited) {
    if (visited.has(n.id)) return
    visited.add(n.id)
    const sz = measNodeSize(n.text || '', n.shape, n.w, n.h, n.fontSize)
    const ch = n.collapsed ? [] : cm.get(n.id) || [],
      th = stH(n, new Set()),
      cy = y + th / 2 - sz.h / 2
    pos.set(n.id, {x, y: cy, w: sz.w, h: sz.h})
    let yy = y
    ch.forEach(c => {
      lay(c, x + sz.w + LGAP, yy, new Set(visited))
      yy += stH(c, new Set()) + SGAP
    })
  }
  let yOff = 50
  roots.forEach(r => {
    const th = stH(r, new Set())
    lay(r, 60, yOff, new Set())
    yOff += th + 40
  })
  return pos
}

function drawShape(ctx, s, x, y, w, h) {
  switch (s) {
    case 'diamond': {
      const cx = x + w / 2,
        cy = y + h / 2
      ctx.beginPath()
      ctx.moveTo(cx, y)
      ctx.lineTo(x + w, cy)
      ctx.lineTo(cx, y + h)
      ctx.lineTo(x, cy)
      ctx.closePath()
      break
    }
    case 'pill': {
      const r = h / 2
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(x + r, y + h)
      ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2)
      ctx.closePath()
      break
    }
    case 'para': {
      const o = 14
      ctx.beginPath()
      ctx.moveTo(x + o, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w - o, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
      break
    }
    case 'circle': {
      const r = Math.max(w, h) / 2
      ctx.beginPath()
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2)
      ctx.closePath()
      break
    }
    case 'cyl': {
      const ry = 8
      ctx.beginPath()
      ctx.moveTo(x, y + ry)
      ctx.ellipse(x + w / 2, y + ry, w / 2, ry, 0, Math.PI, 0)
      ctx.lineTo(x + w, y + h - ry)
      ctx.ellipse(x + w / 2, y + h - ry, w / 2, ry, 0, 0, Math.PI)
      ctx.closePath()
      break
    }
    case 'triangle': {
      ctx.beginPath()
      ctx.moveTo(x + w / 2, y)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
      break
    }
    case 'hexagon': {
      const q = w / 4
      ctx.beginPath()
      ctx.moveTo(x + q, y)
      ctx.lineTo(x + w - q, y)
      ctx.lineTo(x + w, y + h / 2)
      ctx.lineTo(x + w - q, y + h)
      ctx.lineTo(x + q, y + h)
      ctx.lineTo(x, y + h / 2)
      ctx.closePath()
      break
    }
    default: {
      const r = s === 'topic' ? 10 : 4
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }
  }
}

function render(
  ctx,
  nodes,
  conns,
  selIds,
  selConnId,
  view,
  editId,
  marquee,
  cDrag,
  skipClear,
  hoverNodeId
) {
  const pos = new Map(),
    autoPos = autoLayout(nodes)
  nodes.forEach(n => {
    if (n.shape === 'frame') {
      pos.set(n.id, {x: n.x || 0, y: n.y || 0, w: n.w || 240, h: n.h || 180})
      return
    }
    const ap = autoPos.get(n.id)
    const sz = measNodeSize(n.text || '', n.shape, n.w, n.h, n.fontSize)
    if (n.x != null && n.y != null)
      pos.set(n.id, {x: n.x, y: n.y, w: n.w || ap?.w || sz.w, h: n.h || sz.h})
    else if (ap) pos.set(n.id, ap)
  })

  if (!skipClear) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.save()
  ctx.translate(view.offsetX, view.offsetY)
  ctx.scale(view.zoom, view.zoom)
  const ss = new Set(selIds)
  const hidden = new Set()
  nodes.forEach(n => {
    if (n.parentId) {
      let p = nodes.find(v => v.id === n.parentId)
      const visited = new Set([n.id])
      while (p) {
        if (visited.has(p.id)) break
        visited.add(p.id)
        if (p.collapsed) {
          hidden.add(n.id)
          break
        }
        p = nodes.find(v => v.id === p.parentId)
      }
    }
  })

  nodes.forEach(node => {
    if (node.shape !== 'frame') return
    const p = pos.get(node.id)
    if (!p || hidden.has(node.id)) return
    const c = gc(node.color || 'gray')
    const sel = ss.has(node.id)

    const isSolidLine = node.borderStyle === 'solid' || !node.borderStyle
    const isTransparent = node.bgStyle === 'transparent'
    const showHeader = node.frameHeader !== false

    ctx.save()
    if (!isTransparent) {
      ctx.fillStyle = c.bg
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.roundRect ? ctx.roundRect(p.x, p.y, p.w, p.h, 8) : ctx.rect(p.x, p.y, p.w, p.h)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    if (node.borderStyle !== 'none') {
      ctx.strokeStyle = sel ? '#6965db' : c.bd
      ctx.lineWidth = sel ? 2.5 : 1.5
      if (!isSolidLine) ctx.setLineDash([6, 4])
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(p.x, p.y, p.w, p.h, 8)
        ctx.stroke()
      } else ctx.strokeRect(p.x, p.y, p.w, p.h)
      ctx.setLineDash([])
    }

    if (showHeader && node.borderStyle !== 'none') {
      ctx.fillStyle = sel ? '#6965db' : c.bd
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(p.x, p.y, p.w, 24, [8, 8, 0, 0])
      else ctx.rect(p.x, p.y, p.w, 24)
      ctx.fill()
      if (editId !== node.id) {
        ctx.fillStyle = sel ? '#fff' : c.tx
        ctx.font = 'bold 12px system-ui,sans-serif'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'
        ctx.fillText(node.text || '外框', p.x + 8, p.y + 12)
      }
    } else {
      if (editId !== node.id && node.text) {
        ctx.fillStyle = node.fontColor || c.tx
        ctx.font = 'bold 12px system-ui,sans-serif'
        ctx.textBaseline = 'top'
        ctx.textAlign = 'left'
        ctx.globalAlpha = 0.5
        ctx.fillText(node.text, p.x + 8, p.y + 8)
      }
    }
    ctx.restore()
  })

  conns.forEach(conn => {
    if (hidden.has(conn.from) || hidden.has(conn.to)) return
    const fp = pos.get(conn.from),
      tp = pos.get(conn.to)
    if (!fp || !tp) return
    const {from, to, s1, s2} = bestAnc(fp, tp),
      c1 = cpPt(from, s1),
      c2 = cpPt(to, s2)
    const c = gc(conn.color || 'gray'),
      sel = selConnId === conn.id
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y)
    if (conn.line === 'dashed') ctx.setLineDash([8, 4])
    else if (conn.line === 'dotted') ctx.setLineDash([2, 4])
    ctx.strokeStyle = sel ? '#6965db' : c.ln
    ctx.lineWidth = sel ? 2.5 : 2
    ctx.stroke()
    ctx.setLineDash([])
    const ea = Math.atan2(to.y - c2.y, to.x - c2.x)
    const sa = Math.atan2(from.y - c1.y, from.x - c1.x)
    ctx.fillStyle = sel ? '#6965db' : c.ln
    if (conn.arrow === 'forward' || conn.arrow === 'both') drawAH(ctx, to.x, to.y, ea)
    if (conn.arrow === 'backward' || conn.arrow === 'both') drawAH(ctx, from.x, from.y, sa)
    if (sel) {
      ctx.beginPath()
      ctx.arc(from.x, from.y, 4, 0, Math.PI * 2)
      ctx.arc(to.x, to.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#6965db'
      ctx.fill()
    }
    ctx.restore()
  })

  if (cDrag) {
    const fp = pos.get(cDrag.fromId)
    if (fp) {
      const fakeP = {x: cDrag.wx - 40, y: cDrag.wy - NH / 2, w: 80, h: NH}
      const {from, s1} = bestAnc(fp, fakeP),
        c1 = cpPt(from, s1)
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.bezierCurveTo(c1.x, c1.y, cDrag.wx, cDrag.wy, cDrag.wx, cDrag.wy)
      ctx.strokeStyle = '#6965db'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  nodes.forEach(node => {
    if (node.shape === 'frame') return
    const p = pos.get(node.id)
    if (!p || editId === node.id || hidden.has(node.id)) return
    const c = gc(node.color || LVCOL[Math.min(depth(nodes, node.id), LVCOL.length - 1)])
    const sel = ss.has(node.id),
      lk = node.locked
    ctx.save()

    if (hoverNodeId === node.id && !sel) {
      ctx.save()
      ctx.strokeStyle = '#40c057'
      ctx.lineWidth = 3
      if (ctx.roundRect) {
         ctx.beginPath()
         ctx.roundRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8, 8)
         ctx.stroke()
      } else {
         ctx.strokeRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8)
      }
      ctx.restore()
    }

    if (node.bgStyle !== 'transparent') {
      drawShape(ctx, node.shape || 'topic', p.x, p.y, p.w, p.h)
      ctx.fillStyle = c.bg
      ctx.fill()
    }

    if (node.borderStyle !== 'none') {
      if (node.bgStyle === 'transparent') drawShape(ctx, node.shape || 'topic', p.x, p.y, p.w, p.h)
      ctx.strokeStyle = sel ? '#6965db' : lk ? '#adb5bd' : c.bd
      ctx.lineWidth = node.borderWidth || (sel ? 2.5 : 1.5)
      if (sel) {
        ctx.shadowColor = 'rgba(105,101,219,0.3)'
        ctx.shadowBlur = 8
      }
      if (node.borderStyle === 'dashed') ctx.setLineDash([6, 4])
      else if (lk) ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.setLineDash([])
    }

    ctx.fillStyle = lk ? '#adb5bd' : node.fontColor || c.tx

    const fs = node.fontSize || (node.shape === 'topic' ? 14 : 13)
    const fw = node.fontWeight || (node.shape === 'topic' ? 'bold' : 'normal')
    const fst = node.fontStyle || 'normal'
    ctx.font = `${fst} ${fw} ${fs}px system-ui,-apple-system,sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = node.textAlign || 'left'

    const lh = fs * 1.4
    const paragraphs = (node.text || '').split('\n')
    const lines = []
    paragraphs.forEach(para => {
      let cl = ''
      for (let i = 0; i < para.length; i++) {
        const ch = para[i]
        if (ctx.measureText(cl + ch).width > p.w - NPAD * 2 && cl.length > 0) {
          lines.push(cl)
          cl = ch
        } else cl += ch
      }
      lines.push(cl)
    })
    const th = lines.length * lh
    let sy = p.y + p.h / 2 - th / 2 + lh / 2

    let txX = p.x + NPAD
    if (ctx.textAlign === 'center') txX = p.x + p.w / 2
    if (ctx.textAlign === 'right') txX = p.x + p.w - NPAD

    lines.forEach(l => {
      ctx.fillText(l, txX, sy)
      sy += lh
    })

    if (lk) {
      ctx.fillStyle = '#868e96'
      ctx.font = '10px system-ui,sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('🔒', p.x + p.w - 18, p.y + 6)
    }
    const ch = children(nodes, node.id)
    const isHovered = hoverNodeId === node.id || sel
    if (ch.length && isHovered) {
      const ix = p.x + p.w + 8,
        iy = p.y + p.h / 2
      ctx.beginPath()
      ctx.arc(ix, iy, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.strokeStyle = '#ced4da'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#868e96'
      ctx.font = 'bold 13px system-ui,sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.collapsed ? '+' : '−', ix, iy)
      ctx.textAlign = 'left'
    }
    ctx.restore()
  })

  if (selIds.length === 1) {
    const p = pos.get(selIds[0])
    if (p) {
      ctx.save()
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#6965db'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(p.x + p.w - RH, p.y + p.h - RH, RH * 2, RH * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  if (marquee) {
    ctx.save()
    ctx.strokeStyle = '#6965db'
    ctx.fillStyle = 'rgba(105,101,219,0.06)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.fillRect(marquee.x, marquee.y, marquee.w, marquee.h)
    ctx.strokeRect(marquee.x, marquee.y, marquee.w, marquee.h)
    ctx.restore()
  }
  ctx.restore()
  return pos
}

function hitNode(pos, nodes, wx, wy) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (n.shape === 'frame') continue
    const p = pos.get(n.id)
    if (p && wx >= p.x - 4 && wx <= p.x + p.w + 4 && wy >= p.y - 4 && wy <= p.y + p.h + 4)
      return n.id
  }
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (n.shape !== 'frame') continue
    const p = pos.get(n.id)
    if (!p) continue
    const showHeader = n.frameHeader !== false
    const inHeader = showHeader && wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + 24
    const onBorder =
      wx >= p.x - 5 &&
      wx <= p.x + p.w + 5 &&
      wy >= p.y - 5 &&
      wy <= p.y + p.h + 5 &&
      !(
        wx > p.x + 5 &&
        wx < p.x + p.w - 5 &&
        wy > p.y + (showHeader ? 24 : 5) &&
        wy < p.y + p.h - 5
      )
    if (inHeader || onBorder) return n.id
  }
  return null
}

function hitCollapse(pos, nodes, wx, wy) {
  for (const n of nodes) {
    const p = pos.get(n.id)
    if (!p) continue
    if (!children(nodes, n.id).length) continue
    const ix = p.x + p.w + 8,
      iy = p.y + p.h / 2
    if (Math.abs(wx - ix) < 10 && Math.abs(wy - iy) < 10) return n.id
  }
  return null
}
function hitResize(pos, selIds, wx, wy) {
  if (selIds.length !== 1) return false
  const p = pos.get(selIds[0])
  if (!p) return false
  return Math.abs(wx - (p.x + p.w)) < RH + 4 && Math.abs(wy - (p.y + p.h)) < RH + 4
}
function hitConn(conns, pos, wx, wy) {
  for (const conn of conns) {
    const fp = pos.get(conn.from),
      tp = pos.get(conn.to)
    if (!fp || !tp) continue
    const {from, to, s1, s2} = bestAnc(fp, tp),
      c1 = cpPt(from, s1),
      c2 = cpPt(to, s2)
    for (let t = 0; t <= 1; t += 0.04) {
      const x = bzPt(from.x, c1.x, c2.x, to.x, t),
        y = bzPt(from.y, c1.y, c2.y, to.y, t)
      if (Math.abs(wx - x) < 7 && Math.abs(wy - y) < 7) return conn.id
    }
  }
  return null
}

function MMList({state, dispatch, navigate}) {
  const [del, setDel] = useState(null)
  const [renameId, setRenameId] = useState(null)
  const [renameVal, setRenameVal] = useState('')
  const reload = useCallback(async () => {
    const ms = await listMindmaps()
    ms.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    dispatch({type: 'LOAD_MINDMAPS', payload: ms})
  }, [dispatch])
  useEffect(() => {
    reload()
  }, [reload])

  const create = async () => {
    const id = uid(),
      rid = uid()
    const mm = {
      id,
      name: '未命名导图',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [
        {
          id: rid,
          text: '中心主题',
          color: 'purple',
          shape: 'topic',
          collapsed: false,
          parentId: null,
        },
      ],
    }
    await putMindmap(mm)
    dispatch({type: 'SET_ACTIVE_MINDMAP', payload: id})
    dispatch({type: 'LOAD_MM_NODES', payload: mm.nodes})
  }
  const open = async m => {
    const f = await getMindmap(m.id)
    dispatch({type: 'SET_ACTIVE_MINDMAP', payload: m.id})
    dispatch({type: 'LOAD_MM_NODES', payload: f?.nodes || []})
    dispatch({type: 'LOAD_MM_CONNS', payload: f?.conns || []})
  }

  const exportMD = async (e, mId, mName) => {
    e.stopPropagation()
    const mm = await getMindmap(mId)
    if (!mm) return
    const nodes = mm.nodes || []
    const roots = nodes.filter(n => !n.parentId)
    let md = ''
    const traverse = (n, depth, visited) => {
      if (visited.has(n.id)) return
      visited.add(n.id)
      md += `${'  '.repeat(depth)}- ${n.text || ''}\n`
      const ch = nodes.filter(c => c.parentId === n.id)
      ch.forEach(c => traverse(c, depth + 1, new Set(visited)))
    }
    roots.forEach(r => traverse(r, 0, new Set()))
    const blob = new Blob([md], {type: 'text/markdown'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${mName || 'mindmap'}.md`
    a.click()
  }

  const handleImportMD = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown'
    input.onchange = async e => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      const lines = text.split('\n')
      const nodes = []
      const conns = []
      const stack = []
      lines.forEach(line => {
        if (!line.trim()) return
        const match = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/)
        if (!match) return
        const indent = match[1].replace(/\t/g, '  ').length
        const d = Math.floor(indent / 2)
        const textContent = match[2].trim()
        const id = uid()
        const node = {
          id,
          text: textContent,
          color: LVCOL[Math.min(d, LVCOL.length - 1)],
          shape: d === 0 ? 'topic' : d === 1 ? 'pill' : 'rect',
          collapsed: false,
          parentId: null,
        }
        while (stack.length > 0 && stack[stack.length - 1].d >= d) stack.pop()
        if (stack.length > 0) {
          node.parentId = stack[stack.length - 1].id
          conns.push({
            id: uid(),
            from: node.parentId,
            to: id,
            arrow: 'forward',
            line: 'solid',
            color: 'gray',
          })
        }
        nodes.push(node)
        stack.push({d, id})
      })
      if (nodes.length > 0) {
        const id = uid()
        await putMindmap({
          id,
          name: file.name.replace(/\.md$/, ''),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          nodes,
          conns,
        })
        reload()
      }
    }
    input.click()
  }

  return (
    <div className={style[bem.e('ls')]}>
      <div className={style[bem.e('lh')]}>
        <div>
          <div className={style[bem.e('lt')]}>思维导图</div>
          <div className={style[bem.e('ls2')]}>已存 {state.mindmaps.length} 个 · 自动保存</div>
        </div>
        <div className={style[bem.e('la')]}>
          <button className={[style[bem.e('bt')]].join(' ')} onClick={handleImportMD}>
            导入 MD
          </button>
          <button
            className={[style[bem.e('bt')], style[bem.em('bt', 'primary')]].join(' ')}
            onClick={create}
          >
            新建导图
          </button>
        </div>
      </div>
      {state.mindmaps.length === 0 ? (
        <div className={style[bem.e('emp')]}>点击「新建导图」开始创建</div>
      ) : (
        <div className={style[bem.e('gd')]}>
          {state.mindmaps.map(m => (
            <div key={m.id} className={style[bem.e('cd2')]} onClick={() => open(m)}>
              <div className={style[bem.e('ct')]}>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <path d="M12 9v3M12 12l-5 4M12 12l5 4" />
                </svg>
              </div>
              <div className={style[bem.e('cb')]}>
                <div className={style[bem.e('cn')]}>{m.name}</div>
                <div className={style[bem.e('cm')]}>
                  {(m.nodes || []).length} 节点 · {new Date(m.updatedAt).toLocaleDateString()}{' '}
                  {new Date(m.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className={style[bem.e('cbs')]}>
                  <button
                    className={style[bem.e('cbt')]}
                    onClick={e => {
                      e.stopPropagation()
                      setRenameId(m.id)
                      setRenameVal(m.name)
                    }}
                  >
                    编辑
                  </button>
                  <button className={style[bem.e('cbt')]} onClick={e => exportMD(e, m.id, m.name)}>
                    MD
                  </button>
                  <button
                    className={style[bem.e('cbt')]}
                    onClick={async e => {
                      e.stopPropagation()
                      const f = await getMindmap(m.id)
                      if (!f) return
                      const ns = f.nodes || [],
                        cs = f.conns || []

                      const actualPos = new Map()
                      const autoPos = autoLayout(ns)
                      ns.forEach(n => {
                        if (n.shape === 'frame') {
                          actualPos.set(n.id, {x: n.x || 0, y: n.y || 0, w: n.w || 240, h: n.h || 180})
                          return
                        }
                        const ap = autoPos.get(n.id)
                        const sz = measNodeSize(n.text || '', n.shape, n.w, n.h, n.fontSize)
                        if (n.x != null && n.y != null)
                          actualPos.set(n.id, {x: n.x, y: n.y, w: n.w || ap?.w || sz.w, h: n.h || sz.h})
                        else if (ap)
                          actualPos.set(n.id, ap)
                      })

                      if (actualPos.size === 0) {
                        const ec = document.createElement('canvas')
                        ec.width = 800
                        ec.height = 500
                        const cx = ec.getContext('2d')
                        cx.fillStyle = '#fff'
                        cx.fillRect(0, 0, 800, 500)
                        const a = document.createElement('a')
                        a.href = ec.toDataURL('image/png')
                        a.download = (m.name || 'mindmap') + '.png'
                        a.click()
                        return
                      }

                      let mnx = Infinity,
                        mny = Infinity,
                        mxx = -Infinity,
                        mxy = -Infinity
                      actualPos.forEach(p => {
                        if (p.x < mnx) mnx = p.x
                        if (p.y < mny) mny = p.y
                        if (p.x + p.w > mxx) mxx = p.x + p.w
                        if (p.y + p.h > mxy) mxy = p.y + p.h
                      })

                      const pad = 50
                      const bw = mxx - mnx,
                        bh = mxy - mny
                      const exportScale = 2
                      const ec = document.createElement('canvas')
                      ec.width = (bw + pad * 2) * exportScale
                      ec.height = (bh + pad * 2) * exportScale
                      const cx = ec.getContext('2d')
                      cx.scale(exportScale, exportScale)
                      cx.fillStyle = '#ffffff'
                      cx.fillRect(0, 0, bw + pad * 2, bh + pad * 2)
                      cx.save()
                      cx.translate(-mnx + pad, -mny + pad)
                      render(
                        cx,
                        ns,
                        cs,
                        [],
                        null,
                        {offsetX: 0, offsetY: 0, zoom: 1},
                        null,
                        null,
                        null,
                        true,
                        null
                      )
                      cx.restore()
                      const a = document.createElement('a')
                      a.href = ec.toDataURL('image/png')
                      a.download = (m.name || 'mindmap') + '.png'
                      a.click()
                    }}
                  >
                    PNG
                  </button>
                  <button
                    className={[style[bem.e('cbt')], style[bem.em('cbt', 'danger')]].join(' ')}
                    onClick={e => {
                      e.stopPropagation()
                      setDel(m)
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {del && (
        <div className={style[bem.e('mk')]} onClick={() => setDel(null)}>
          <div className={style[bem.e('md')]} onClick={e => e.stopPropagation()}>
            <h3>删除</h3>
            <p>确定删除「{del.name}」？</p>
            <div className={style[bem.e('mbs')]}>
              <button className={style[bem.e('bt')]} onClick={() => setDel(null)}>
                取消
              </button>
              <button
                className={[style[bem.e('bt')], style[bem.em('bt', 'danger')]].join(' ')}
                onClick={async () => {
                  await deleteMindmap(del.id)
                  setDel(null)
                  reload()
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      {renameId && (
        <div className={style[bem.e('mk')]} onClick={() => setRenameId(null)}>
          <div className={style[bem.e('md')]} onClick={e => e.stopPropagation()}>
            <h3>重命名</h3>
            <input
              className={style[bem.e('rn-input')]}
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  ;(async () => {
                    const mm = await getMindmap(renameId)
                    if (mm) await putMindmap({...mm, name: renameVal, updatedAt: Date.now()})
                    setRenameId(null)
                    reload()
                  })()
                }
                if (e.key === 'Escape') setRenameId(null)
              }}
            />
            <div className={style[bem.e('mbs')]}>
              <button className={style[bem.e('bt')]} onClick={() => setRenameId(null)}>
                取消
              </button>
              <button
                className={[style[bem.e('bt')], style[bem.em('bt', 'primary')]].join(' ')}
                onClick={async () => {
                  const mm = await getMindmap(renameId)
                  if (mm) await putMindmap({...mm, name: renameVal, updatedAt: Date.now()})
                  setRenameId(null)
                  reload()
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MMEdit({state, dispatch, navigate}) {
  const cRef = useRef(null),
    wRef = useRef(null),
    tooltipRef = useRef(null),
    hoverNodeRef = useRef(null)
  const [sz, setSize] = useState({w: 800, h: 600})
  const [editId, setEditId] = useState(null),
    [editTx, setEditTx] = useState('')
  const [addSh, setAddSh] = useState(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [marqueeMode, setMarqueeMode] = useState(false)
  const iact = useRef(null),
    posRef = useRef(new Map()),
    marqRef = useRef(null),
    connDragRef = useRef(null)
  const nodesRef = useRef(state.mmNodes)
  const [, setTk] = useState(0)
  const fr = () => setTk(t => t + 1)
  nodesRef.current = state.mmNodes
  const clipRef = useRef(null)

  const ANCHOR_ZONE = 10

  const pushH = useCallback(() => dispatch({type: 'MM_PUSH_HIST'}), [dispatch])

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

  useEffect(() => {
    if (!wRef.current) return
    const ro = new ResizeObserver(() => {
      if (!wRef.current) return
      const r = wRef.current.getBoundingClientRect()
      setSize({w: Math.max(300, r.width), h: Math.max(300, r.height)})
    })
    ro.observe(wRef.current)
    return () => ro.disconnect()
  }, [])

  const onWheelRef = useRef(null)
  useEffect(() => {
    const el = cRef.current
    if (!el) return
    const handler = e => {
      if (typeof onWheelRef.current === 'function') onWheelRef.current(e)
    }
    el.addEventListener('wheel', handler, {passive: false})
    return () => el.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    const c = cRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = sz.w * dpr
    c.height = sz.h * dpr
    c.style.width = `${sz.w}px`
    c.style.height = `${sz.h}px`

    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    posRef.current = render(
      ctx,
      state.mmNodes,
      state.mmConns,
      state.mmSelectedIds,
      state.mmSelConnId,
      state.mmView,
      editId,
      marqRef.current,
      connDragRef.current,
      false,
      iact.current?.kind === 'drag' ? hoverNodeRef.current : null
    )
  })

  const saveT = useRef(null)
  useEffect(() => {
    if (!state.activeMindmapId || !state.mmNodes.length) return
    const existing = new Set(state.mmConns.map(c => c.from + '>' + c.to))
    const missing = []
    state.mmNodes.forEach(n => {
      if (n.parentId && !existing.has(n.parentId + '>' + n.id))
        missing.push({
          id: uid(),
          from: n.parentId,
          to: n.id,
          arrow: 'forward',
          line: 'solid',
          color: 'gray',
        })
    })
    if (missing.length) dispatch({type: 'LOAD_MM_CONNS', payload: [...state.mmConns, ...missing]})
  }, [state.activeMindmapId])

  useEffect(() => {
    if (!state.activeMindmapId) return
    clearTimeout(saveT.current)
    saveT.current = setTimeout(async () => {
      const mm = await getMindmap(state.activeMindmapId)
      if (mm)
        await putMindmap({...mm, nodes: state.mmNodes, conns: state.mmConns, updatedAt: Date.now()})
    }, 800)
    return () => clearTimeout(saveT.current)
  }, [state.mmNodes, state.mmConns, state.activeMindmapId])

  const hitAnchor = (pos, nodes, wx, wy) => {
    for (const n of nodes) {
      if (n.shape === 'frame') continue
      const p = pos.get(n.id)
      if (!p) continue
      const sides = [
        {side: 'top', x: p.x + p.w / 2, y: p.y - 2},
        {side: 'right', x: p.x + p.w + 2, y: p.y + p.h / 2},
        {side: 'bottom', x: p.x + p.w / 2, y: p.y + p.h + 2},
        {side: 'left', x: p.x - 2, y: p.y + p.h / 2},
      ]
      for (const s of sides) {
        if (Math.abs(wx - s.x) < ANCHOR_ZONE && Math.abs(wy - s.y) < ANCHOR_ZONE)
          return {id: n.id, side: s.side}
      }
    }
    return null
  }

  const onDown = e => {
    const r = cRef.current.getBoundingClientRect()
    const sx = e.clientX - r.left,
      sy = e.clientY - r.top
    const vw = state.mmView,
      wx = (sx - vw.offsetX) / vw.zoom,
      wy = (sy - vw.offsetY) / vw.zoom
    if (e.button === 1 || (spaceDown && !marqueeMode)) {
      iact.current = {kind: 'pan', cx: e.clientX, cy: e.clientY, oox: vw.offsetX, ooy: vw.offsetY}
      return
    }
    if (e.button !== 0) return
    if (addSh) {
      pushH()
      const nid = uid()
      let w = 120,
        h = NH
      if (addSh === 'frame') {
        w = 240
        h = 180
      } else {
        const sz = measNodeSize('新节点', addSh, null, null, 13)
        w = sz.w
        h = sz.h
      }
      dispatch({
        type: 'ADD_MM_NODE',
        payload: {
          id: nid,
          text: addSh === 'frame' ? '外框' : '新节点',
          color: LVCOL[state.mmNodes.length % LVCOL.length],
          shape: addSh,
          collapsed: false,
          parentId: null,
          x: wx - w / 2,
          y: wy - h / 2,
          w,
          h,
        },
      })
      dispatch({type: 'SET_MM_SELECTED', payload: [nid]})
      setAddSh(null)
      setMarqueeMode(false)
      setTimeout(() => startEdit(nid), 60)
      return
    }
    const cid2 = hitCollapse(posRef.current, state.mmNodes, wx, wy)
    if (cid2) {
      pushH()
      const nd = state.mmNodes.find(n => n.id === cid2)
      if (nd)
        dispatch({type: 'UPDATE_MM_NODE', payload: {id: cid2, patch: {collapsed: !nd.collapsed}}})
      return
    }
    if (hitResize(posRef.current, state.mmSelectedIds, wx, wy)) {
      pushH()
      const p = posRef.current.get(state.mmSelectedIds[0])
      iact.current = {
        kind: 'resize',
        id: state.mmSelectedIds[0],
        sx,
        sy,
        ow: p.w,
        oh: p.h,
        zoom: vw.zoom,
      }
      return
    }
    const nid = hitNode(posRef.current, state.mmNodes, wx, wy)
    if (nid) {
      const anc = hitAnchor(posRef.current, state.mmNodes, wx, wy)
      if (anc && anc.id === nid) {
        connDragRef.current = {fromId: nid, wx, wy}
        fr()
        return
      }
      const nd = state.mmNodes.find(n => n.id === nid)
      if (nd?.locked && !e.shiftKey) {
        dispatch({type: 'SET_MM_SELECTED', payload: [nid]})
        dispatch({type: 'SET_MM_SEL_CONN', payload: null})
        return
      }
      let newSel
      if (e.shiftKey) {
        const cs = new Set(state.mmSelectedIds)
        cs.has(nid) ? cs.delete(nid) : cs.add(nid)
        newSel = [...cs]
      } else if (state.mmSelectedIds.includes(nid)) {
        newSel = [...state.mmSelectedIds]
      } else {
        newSel = [nid]
      }
      dispatch({type: 'SET_MM_SELECTED', payload: newSel})
      dispatch({type: 'SET_MM_SEL_CONN', payload: null})

      const draggables = newSel.filter(id => {
        const n2 = state.mmNodes.find(n => n.id === id)
        return n2 && !n2.locked
      })

      pushH()

      const origs = {}
      const frames = []
      draggables.forEach(id => {
        const p = posRef.current.get(id)
        const n2 = state.mmNodes.find(n => n.id === id)
        if (p) origs[id] = {px: p.x, py: p.y, nx: n2?.x, ny: n2?.y}
        if (n2 && n2.shape === 'frame') frames.push(n2)
      })

      if (frames.length > 0) {
        state.mmNodes.forEach(child => {
          if (draggables.includes(child.id) || child.locked) return
          const cp = posRef.current.get(child.id)
          if (!cp) return
          for (const f of frames) {
            const fp = posRef.current.get(f.id)
            if (
              fp &&
              cp.x >= fp.x &&
              cp.y >= fp.y &&
              cp.x + cp.w <= fp.x + fp.w &&
              cp.y + cp.h <= fp.y + fp.h
            ) {
              draggables.push(child.id)
              origs[child.id] = {px: cp.x, py: cp.y, nx: child.x, ny: child.y}
              break
            }
          }
        })
      }
      iact.current = {kind: 'drag', sx, sy, ids: draggables, origs, zoom: vw.zoom}
    } else {
      const cId = hitConn(state.mmConns, posRef.current, wx, wy)
      if (cId) {
        dispatch({type: 'SET_MM_SEL_CONN', payload: cId})
        dispatch({type: 'SET_MM_SELECTED', payload: []})
        return
      }
      dispatch({type: 'SET_MM_SELECTED', payload: []})
      dispatch({type: 'SET_MM_SEL_CONN', payload: null})
      if (marqueeMode) {
        iact.current = {
          kind: 'marquee',
          sx,
          sy,
          wx,
          wy,
          vz: vw.zoom,
          vox: vw.offsetX,
          voy: vw.offsetY,
        }
      } else {
        iact.current = {kind: 'pan', cx: e.clientX, cy: e.clientY, oox: vw.offsetX, ooy: vw.offsetY}
      }
    }
  }

  const onMove = e => {
    const it = iact.current,
      r = cRef.current.getBoundingClientRect()
    const sx = e.clientX - r.left,
      sy = e.clientY - r.top
    const vw = state.mmView
    const wx_ = (sx - vw.offsetX) / vw.zoom,
      wy_ = (sy - vw.offsetY) / vw.zoom

    if (!it) {
      const hId = hitNode(posRef.current, state.mmNodes, wx_, wy_)
      if (hoverNodeRef.current !== hId) {
        hoverNodeRef.current = hId
        fr()
      }
      if (tooltipRef.current) {
        if (hId) {
          const hn = state.mmNodes.find(n => n.id === hId)
          if (hn && hn.shape !== 'frame' && hn.text) {
            tooltipRef.current.style.display = 'block'
            tooltipRef.current.innerText = hn.text
            tooltipRef.current.style.left = e.clientX + 15 + 'px'
            tooltipRef.current.style.top = e.clientY + 15 + 'px'
          } else tooltipRef.current.style.display = 'none'
        } else tooltipRef.current.style.display = 'none'
      }
    } else {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none'
      if (it.kind === 'drag') {
        const hId = hitNode(posRef.current, state.mmNodes, wx_, wy_)
        if (hId && !it.ids.includes(hId)) {
          hoverNodeRef.current = hId
        } else {
          hoverNodeRef.current = null
        }
        fr()
      }
    }

    if (connDragRef.current) {
      connDragRef.current.wx = wx_
      connDragRef.current.wy = wy_
      fr()
      return
    }
    if (!it) return
    if (it.kind === 'pan') {
      const dx = e.clientX - it.cx,
        dy = e.clientY - it.cy
      dispatch({type: 'SET_MM_VIEW', payload: {offsetX: it.oox + dx, offsetY: it.ooy + dy}})
    } else if (it.kind === 'drag') {
      const dx = (sx - it.sx) / it.zoom,
        dy = (sy - it.sy) / it.zoom,
        map = {}
      it.ids.forEach(id => {
        const o = it.origs[id]
        if (!o) return
        if (o.nx != null) map[id] = {x: o.nx + dx, y: o.ny + dy}
        else map[id] = {x: o.px + dx, y: o.py + dy}
      })
      dispatch({type: 'UPDATE_MM_NODES', payload: map})
    } else if (it.kind === 'marquee') {
      const wx2 = (sx - it.vox) / it.vz,
        wy2 = (sy - it.voy) / it.vz
      marqRef.current = {
        x: Math.min(it.wx, wx2),
        y: Math.min(it.wy, wy2),
        w: Math.abs(wx2 - it.wx),
        h: Math.abs(wy2 - it.wy),
      }
      const inR = nodesRef.current
        .filter(n => {
          const p = posRef.current.get(n.id)
          if (!p) return false
          const m = marqRef.current
          return p.x >= m.x && p.y >= m.y && p.x + p.w <= m.x + m.w && p.y + p.h <= m.y + m.h
        })
        .map(n => n.id)
      dispatch({type: 'SET_MM_SELECTED', payload: inR})
      fr()
    } else if (it.kind === 'resize') {
      const dx = (sx - it.sx) / it.zoom,
        dy = (sy - it.sy) / it.zoom
      dispatch({
        type: 'UPDATE_MM_NODE',
        payload: {id: it.id, patch: {w: Math.max(NMINW, it.ow + dx), h: Math.max(NH, it.oh + dy)}},
      })
    }
  }

  const onUp = e => {
    if (connDragRef.current) {
      const r = cRef.current.getBoundingClientRect(),
        sx = e.clientX - r.left,
        sy = e.clientY - r.top
      const wx = (sx - state.mmView.offsetX) / state.mmView.zoom,
        wy = (sy - state.mmView.offsetY) / state.mmView.zoom
      const toId = hitNode(posRef.current, state.mmNodes, wx, wy)
      if (toId && toId !== connDragRef.current.fromId) {
        const hn = state.mmNodes.find(n => n.id === toId)
        if (hn && hn.shape !== 'frame') {
          const existingConn = state.mmConns.find(
            c =>
              (c.from === connDragRef.current.fromId && c.to === toId) ||
              (c.from === toId && c.to === connDragRef.current.fromId)
          )
          pushH()
          if (!existingConn) {
            dispatch({
              type: 'ADD_MM_CONN',
              payload: {
                id: uid(),
                from: connDragRef.current.fromId,
                to: toId,
                arrow: 'forward',
                line: 'solid',
                color: 'gray',
              },
            })
          } else {
            dispatch({
              type: 'UPDATE_MM_CONN',
              payload: {id: existingConn.id, patch: {arrow: 'both'}},
            })
          }
        }
      }
      connDragRef.current = null
      fr()
    }
    if (iact.current?.kind === 'marquee') {
      marqRef.current = null
      fr()
    }
    if (iact.current?.kind === 'drag' && hoverNodeRef.current) {
      const newParentId = hoverNodeRef.current
      const draggingIds = iact.current.ids
      const isDescendant = (pid, dragged) => {
        let p = state.mmNodes.find(n => n.id === pid)
        while(p) {
          if (dragged.includes(p.id)) return true
          p = state.mmNodes.find(n => n.id === p.parentId)
        }
        return false
      }
      if (!isDescendant(newParentId, draggingIds)) {
        const map = {}
        draggingIds.forEach(id => {
          map[id] = { parentId: newParentId, x: null, y: null }
        })
        const newConns = state.mmConns.map(c => {
          if (draggingIds.includes(c.to)) return { ...c, from: newParentId }
          return c
        })
        const updatedNodes = state.mmNodes.map(n => map[n.id] ? {...n, parentId: newParentId, x: undefined, y: undefined} : n)
        const pos = autoLayout(updatedNodes)
        dispatch({type: 'UPDATE_MM_NODES', payload: map})
        dispatch({type: 'LOAD_MM_CONNS', payload: newConns})
        dispatch({type: 'AUTO_LAYOUT', payload: pos})
      }
      hoverNodeRef.current = null
      fr()
    }
    iact.current = null
  }

  const onWheel = e => {
    e.preventDefault()
    const f = 1 + -e.deltaY * 0.001
    if (f <= 0) return
    const r = cRef.current.getBoundingClientRect(),
      sx = e.clientX - r.left,
      sy = e.clientY - r.top
    const wx = (sx - state.mmView.offsetX) / state.mmView.zoom,
      wy = (sy - state.mmView.offsetY) / state.mmView.zoom
    const z = Math.min(4, Math.max(0.15, state.mmView.zoom * f))
    dispatch({type: 'SET_MM_VIEW', payload: {zoom: z, offsetX: sx - wx * z, offsetY: sy - wy * z}})
  }
  onWheelRef.current = onWheel

  const s2w = e => {
    const r = cRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - r.left - state.mmView.offsetX) / state.mmView.zoom,
      y: (e.clientY - r.top - state.mmView.offsetY) / state.mmView.zoom,
    }
  }

  const onDbl = e => {
    const {x, y} = s2w(e),
      nid = hitNode(posRef.current, state.mmNodes, x, y)
    if (nid) {
      startEdit(nid)
      return
    }
    pushH()
    const nid2 = uid()
    const sz = measNodeSize('新节点', 'rect', null, null, 13)
    dispatch({
      type: 'ADD_MM_NODE',
      payload: {
        id: nid2,
        text: '新节点',
        color: LVCOL[state.mmNodes.length % LVCOL.length],
        shape: 'rect',
        collapsed: false,
        parentId: null,
        x: x - sz.w / 2,
        y: y - sz.h / 2,
        w: sz.w,
        h: sz.h,
      },
    })
    dispatch({type: 'SET_MM_SELECTED', payload: [nid2]})
    setTimeout(() => startEdit(nid2), 60)
  }

  const startEdit = id => {
    const n = state.mmNodes.find(v => v.id === id)
    if (n) {
      setEditId(id)
      setEditTx(n.text || '')
    }
  }
  const finEdit = () => {
    if (editId) {
      const nd = state.mmNodes.find(v => v.id === editId)
      if (nd && nd.text !== editTx) {
         pushH()
         dispatch({type: 'UPDATE_MM_NODE', payload: {id: editId, patch: {text: editTx}}})
      }
      setEditId(null)
      setEditTx('')
    }
  }

  const addChild = useCallback(() => {
    const pid = state.mmSelectedIds[0]
    if (!pid) return
    const par = state.mmNodes.find(n => n.id === pid)
    if (!par || par.shape === 'frame') return
    pushH()
    if (par.collapsed)
      dispatch({type: 'UPDATE_MM_NODE', payload: {id: pid, patch: {collapsed: false}}})
    const nid = uid(),
      d = depth(state.mmNodes, pid),
      pp = posRef.current.get(pid)
    const nx = pp ? pp.x + pp.w + LGAP : 300,
      ny = pp ? pp.y : 200,
      sh = d === 0 ? 'pill' : 'topic'
    dispatch({
      type: 'ADD_MM_NODE',
      payload: {
        id: nid,
        text: '子主题',
        color: LVCOL[Math.min(d + 1, LVCOL.length - 1)],
        shape: sh,
        collapsed: false,
        parentId: pid,
        x: nx,
        y: ny,
      },
    })
    dispatch({
      type: 'ADD_MM_CONN',
      payload: {id: uid(), from: pid, to: nid, arrow: 'forward', line: 'solid', color: 'gray'},
    })
    dispatch({type: 'SET_MM_SELECTED', payload: [nid]})
    setTimeout(() => startEdit(nid), 60)
  }, [state.mmSelectedIds, state.mmNodes, dispatch, pushH])

  const addSib = useCallback(() => {
    const sid = state.mmSelectedIds[0]
    if (!sid) return
    const n = state.mmNodes.find(v => v.id === sid)
    if (!n || !n.parentId || n.shape === 'frame') return
    pushH()
    const nid = uid(),
      sp = posRef.current.get(sid)
    const nx = sp ? sp.x : 100,
      ny = sp ? sp.y + NH + SGAP + 20 : 200
    dispatch({
      type: 'ADD_MM_NODE',
      payload: {
        id: nid,
        text: '子主题',
        color: n.color,
        shape: n.shape,
        collapsed: false,
        parentId: n.parentId,
        x: nx,
        y: ny,
      },
    })
    dispatch({
      type: 'ADD_MM_CONN',
      payload: {
        id: uid(),
        from: n.parentId,
        to: nid,
        arrow: 'forward',
        line: 'solid',
        color: 'gray',
      },
    })
    dispatch({type: 'SET_MM_SELECTED', payload: [nid]})
    setTimeout(() => startEdit(nid), 60)
  }, [state.mmSelectedIds, state.mmNodes, dispatch, pushH])

  const delSel = useCallback(() => {
    if (state.mmSelConnId) {
      pushH()
      dispatch({type: 'DELETE_MM_CONN', payload: state.mmSelConnId})
      return
    }
    pushH()
    const ids = new Set()
    state.mmSelectedIds.forEach(sid => {
      ids.add(sid)
      const n = state.mmNodes.find(v => v.id === sid)
      if (n && n.parentId) descIds(state.mmNodes, sid).forEach(d => ids.add(d))
    })
    if (ids.size) {
      state.mmConns.forEach(c => {
        if (ids.has(c.from) || ids.has(c.to)) dispatch({type: 'DELETE_MM_CONN', payload: c.id})
      })
      dispatch({type: 'DELETE_MM_NODES', payload: [...ids]})
    }
  }, [state.mmSelectedIds, state.mmSelConnId, state.mmNodes, state.mmConns, dispatch, pushH])

  const chCol = c => {
    pushH()
    const m = {}
    state.mmSelectedIds.forEach(id => (m[id] = {color: c}))
    dispatch({type: 'UPDATE_MM_NODES', payload: m})
  }
  const updShape = sh => {
    pushH()
    const map = {}
    state.mmSelectedIds.forEach(id => (map[id] = {shape: sh}))
    dispatch({type: 'UPDATE_MM_NODES', payload: map})
  }
  const lockSel = locked => {
    if (!state.mmSelectedIds.length) return
    pushH()
    dispatch({type: 'LOCK_MM_NODES', payload: {ids: state.mmSelectedIds, locked}})
  }
  const allLocked =
    state.mmSelectedIds.length > 0 &&
    state.mmSelectedIds.every(id => state.mmNodes.find(n => n.id === id)?.locked)
  const updNodeProp = (k, v) => {
    pushH()
    const map = {}
    state.mmSelectedIds.forEach(id => (map[id] = {[k]: v}))
    dispatch({type: 'UPDATE_MM_NODES', payload: map})
  }

  const autoLayoutAll = () => {
    pushH()
    const pos = autoLayout(state.mmNodes)
    if (!pos.size) return
    const map = {}
    state.mmNodes.forEach(n => {
      if (!n.locked && n.shape !== 'frame') map[n.id] = {x: null, y: null}
    })
    dispatch({type: 'UPDATE_MM_NODES', payload: map})
  }

  const zoomToFit = () => {
    const pos = posRef.current
    if (!pos.size) return
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    pos.forEach(p => {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x + p.w > maxX) maxX = p.x + p.w
      if (p.y + p.h > maxY) maxY = p.y + p.h
    })
    const cw = sz.w,
      ch = sz.h,
      pad = 60
    const bw = maxX - minX,
      bh = maxY - minY
    if (bw <= 0 || bh <= 0) return
    const z = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 2)
    const ox = cw / 2 - (minX + bw / 2) * z,
      oy = ch / 2 - (minY + bh / 2) * z
    dispatch({type: 'SET_MM_VIEW', payload: {zoom: z, offsetX: ox, offsetY: oy}})
  }

  const copySel = useCallback(() => {
    const ids = new Set(state.mmSelectedIds)
    clipRef.current = {
      nodes: state.mmNodes.filter(n => ids.has(n.id)),
      conns: state.mmConns.filter(c => ids.has(c.from) && ids.has(c.to)),
    }
  }, [state.mmSelectedIds, state.mmNodes, state.mmConns])

  const pasteSel = useCallback(() => {
    if (!clipRef.current) return
    pushH()
    const idMap = {}
    clipRef.current.nodes.forEach(n => {
      const newId = uid()
      idMap[n.id] = newId
      dispatch({
        type: 'ADD_MM_NODE',
        payload: {...n, id: newId, x: (n.x || 0) + 40, y: (n.y || 0) + 40},
      })
    })
    clipRef.current.conns.forEach(c => {
      dispatch({
        type: 'ADD_MM_CONN',
        payload: {...c, id: uid(), from: idMap[c.from], to: idMap[c.to]},
      })
    })
    dispatch({type: 'SET_MM_SELECTED', payload: Object.values(idMap)})
  }, [dispatch, pushH])

  const selConn = state.mmSelConnId ? state.mmConns.find(c => c.id === state.mmSelConnId) : null
  const updConn = (k, v) => {
    pushH()
    if (selConn) dispatch({type: 'UPDATE_MM_CONN', payload: {id: selConn.id, patch: {[k]: v}}})
  }

  const importMDToCurrent = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,text/markdown'
    input.onchange = async e => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      const lines = text.split('\n')
      const newNodes = []
      const newConns = []
      const stack = []
      lines.forEach(line => {
        if (!line.trim()) return
        const match = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/)
        if (!match) return
        const indent = match[1].replace(/\t/g, '  ').length
        const d = Math.floor(indent / 2)
        const textContent = match[2].trim()
        const id = uid()
        const node = {
          id,
          text: textContent,
          color: LVCOL[Math.min(d, LVCOL.length - 1)],
          shape: d === 0 ? 'topic' : d === 1 ? 'pill' : 'rect',
          collapsed: false,
          parentId: null,
        }
        while (stack.length > 0 && stack[stack.length - 1].d >= d) stack.pop()
        if (stack.length > 0) {
          node.parentId = stack[stack.length - 1].id
          newConns.push({
            id: uid(),
            from: node.parentId,
            to: id,
            arrow: 'forward',
            line: 'solid',
            color: 'gray',
          })
        }
        newNodes.push(node)
        stack.push({d, id})
      })
      pushH()
      dispatch({type: 'LOAD_MM_NODES', payload: newNodes})
      dispatch({type: 'LOAD_MM_CONNS', payload: newConns})
      setTimeout(() => autoLayoutAll(), 100)
    }
    input.click()
  }

  const exportMDCurrent = async () => {
    const nodes = state.mmNodes || []
    const roots = nodes.filter(n => !n.parentId)
    let md = ''
    const traverse = (n, d, visited) => {
      if (visited.has(n.id)) return
      visited.add(n.id)
      md += `${'  '.repeat(d)}- ${n.text || ''}\n`
      const ch = nodes.filter(c => c.parentId === n.id)
      ch.forEach(c => traverse(c, d + 1, new Set(visited)))
    }
    roots.forEach(r => traverse(r, 0, new Set()))
    const blob = new Blob([md], {type: 'text/markdown'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mindmap.md`
    a.click()
  }

  useEffect(() => {
    const h = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'Tab') {
        e.preventDefault()
        addChild()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        addSib()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        delSel()
      } else if (e.key === 'F2') {
        e.preventDefault()
        if (state.mmSelectedIds[0]) startEdit(state.mmSelectedIds[0])
      } else if (e.key === 'Escape') {
        dispatch({type: 'SET_MM_SELECTED', payload: []})
        dispatch({type: 'SET_MM_SEL_CONN', payload: null})
        finEdit()
        setAddSh(null)
      } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (state.mmSelectedIds.length) lockSel(!allLocked)
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        dispatch({type: 'MM_UNDO'})
      } else if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault()
        dispatch({type: 'MM_REDO'})
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        copySel()
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        pasteSel()
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        dispatch({type: 'MM_SELECT_ALL'})
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        copySel()
        pasteSel()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [state.mmSelectedIds, state.mmNodes, state.mmSelConnId, state.mmConns, addChild, addSib, delSel, copySel, pasteSel, dispatch, allLocked])

  const sel1 =
    state.mmSelectedIds.length === 1
      ? state.mmNodes.find(n => n.id === state.mmSelectedIds[0])
      : null
  const ep = editId ? posRef.current.get(editId) : null
  const cur = addSh ? 'crosshair' : marqueeMode ? 'crosshair' : 'default'
  const isFrameEdit = sel1?.shape === 'frame'

  return (
    <div className={style[bem.b()]}>
      <div ref={tooltipRef} className={style[bem.e('tooltip')]} />
      <div className={style[bem.e('cw')]} ref={wRef}>
        <canvas
          ref={cRef}
          className={style[bem.e('cv')]}
          style={{cursor: cur}}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onDoubleClick={onDbl}
          onContextMenu={e => e.preventDefault()}
        />

        <div className={style[bem.e('tb')]}>
          <button
            className={style[bem.e('ti')]}
            onClick={() => {
              dispatch({type: 'SET_ACTIVE_MINDMAP', payload: null})
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span className={style[bem.e('tip')]}>返回</span>
          </button>
          <div className={style[bem.e('td')]} />
          <button
            className={[style[bem.e('ti')], marqueeMode ? style[bem.is('active', true)] : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMarqueeMode(!marqueeMode)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span className={style[bem.e('tip')]}>框选</span>
          </button>
          {SHAPES.map(s => (
            <button
              key={s.id}
              className={[style[bem.e('ti')], addSh === s.id ? style[bem.is('active', true)] : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                setAddSh(addSh === s.id ? null : s.id)
                setMarqueeMode(false)
              }}
            >
              <span className={style[bem.e('ti-ic')]}>{s.ic}</span>
              <span className={style[bem.e('tip')]}>{s.lb}</span>
            </button>
          ))}
          <div className={style[bem.e('td')]} />
          <button
            className={style[bem.e('ti')]}
            onClick={addChild}
            disabled={!state.mmSelectedIds.length || isFrameEdit}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            <span className={style[bem.e('tip')]}>子节点 (Tab)</span>
          </button>
          <button
            className={style[bem.e('ti')]}
            onClick={addSib}
            disabled={
              state.mmSelectedIds.length !== 1 ||
              !state.mmNodes.find(n => n.id === state.mmSelectedIds[0])?.parentId ||
              isFrameEdit
            }
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span className={style[bem.e('tip')]}>同级 (Enter)</span>
          </button>
          <div className={style[bem.e('td')]} />
          <button
            className={style[bem.e('ti')]}
            onClick={() => state.mmSelectedIds[0] && startEdit(state.mmSelectedIds[0])}
            disabled={!state.mmSelectedIds.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            <span className={style[bem.e('tip')]}>编辑 (F2)</span>
          </button>
          <button
            className={style[bem.e('ti')]}
            onClick={delSel}
            disabled={!state.mmSelectedIds.length && !state.mmSelConnId}
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            <span className={style[bem.e('tip')]}>删除 (Del)</span>
          </button>
        </div>

        <div className={style[bem.e('th')]}>
          <button
            className={style[bem.e('ti')]}
            onClick={() => lockSel(!allLocked)}
            disabled={!state.mmSelectedIds.length}
          >
            {allLocked ? (
              <svg viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
              </svg>
            )}
            <span className={style[bem.e('tip')]}>{allLocked ? '解锁' : '锁定 (Ctrl+L)'}</span>
          </button>
          <button
            className={style[bem.e('ti')]}
            onClick={autoLayoutAll}
            disabled={!state.mmNodes.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z" />
            </svg>
            <span className={style[bem.e('tip')]}>自动排版</span>
          </button>
          <div className={style[bem.e('td')]} />
          <button
            className={style[bem.e('ti')]}
            onClick={() => dispatch({type: 'MM_UNDO'})}
            disabled={!state.mmHistory?.past?.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
            </svg>
            <span className={style[bem.e('tip')]}>撤销 (Ctrl+Z)</span>
          </button>
          <button
            className={style[bem.e('ti')]}
            onClick={() => dispatch({type: 'MM_REDO'})}
            disabled={!state.mmHistory?.future?.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
            </svg>
            <span className={style[bem.e('tip')]}>重做 (Ctrl+Y)</span>
          </button>
          <div className={style[bem.e('td')]} />
          <button
            className={style[bem.e('ti')]}
            onClick={copySel}
            disabled={!state.mmSelectedIds.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
            <span className={style[bem.e('tip')]}>复制 (Ctrl+C)</span>
          </button>
          <button className={style[bem.e('ti')]} onClick={pasteSel} disabled={!clipRef.current}>
            <svg viewBox="0 0 24 24">
              <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z" />
            </svg>
            <span className={style[bem.e('tip')]}>粘贴 (Ctrl+V)</span>
          </button>
          <div className={style[bem.e('td')]} />
          <button
            className={style[bem.e('ti')]}
            onClick={() => dispatch({type: 'MM_SELECT_ALL'})}
            disabled={!state.mmNodes.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span className={style[bem.e('tip')]}>全选 (Ctrl+A)</span>
          </button>
          <button
            className={style[bem.e('ti')]}
            onClick={zoomToFit}
            disabled={!state.mmNodes.length}
          >
            <svg viewBox="0 0 24 24">
              <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6z" />
            </svg>
            <span className={style[bem.e('tip')]}>适应画布</span>
          </button>
          <div className={style[bem.e('td')]} />
          <button className={style[bem.e('ti')]} onClick={importMDToCurrent}>
            <svg viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            <span className={style[bem.e('tip')]}>导入MD</span>
          </button>
          <button className={style[bem.e('ti')]} onClick={exportMDCurrent}>
            <svg viewBox="0 0 24 24">
              <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h4v-2H5V8h14v10h-4v2h4c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-7 6l-4 4h3v6h2v-6h3l-4-4z" />
            </svg>
            <span className={style[bem.e('tip')]}>导出MD</span>
          </button>
          <button
            className={style[bem.e('ti')]}
            onClick={() => {
              if (!state.mmNodes.length) return
              const actualPos = new Map()
              const autoPos = autoLayout(state.mmNodes)
              state.mmNodes.forEach(n => {
                if (n.shape === 'frame') {
                  actualPos.set(n.id, {x: n.x || 0, y: n.y || 0, w: n.w || 240, h: n.h || 180})
                  return
                }
                const ap = autoPos.get(n.id)
                const sz = measNodeSize(n.text || '', n.shape, n.w, n.h, n.fontSize)
                if (n.x != null && n.y != null)
                  actualPos.set(n.id, {x: n.x, y: n.y, w: n.w || ap?.w || sz.w, h: n.h || sz.h})
                else if (ap)
                  actualPos.set(n.id, ap)
              })

              let mnx = Infinity,
                mny = Infinity,
                mxx = -Infinity,
                mxy = -Infinity
              actualPos.forEach(p => {
                if (p.x < mnx) mnx = p.x
                if (p.y < mny) mny = p.y
                if (p.x + p.w > mxx) mxx = p.x + p.w
                if (p.y + p.h > mxy) mxy = p.y + p.h
              })

              const pad = 60
              const bw = mxx - mnx,
                bh = mxy - mny
              const exportScale = 2
              const ec = document.createElement('canvas')
              ec.width = (bw + pad * 2) * exportScale
              ec.height = (bh + pad * 2) * exportScale
              const cx = ec.getContext('2d')
              cx.scale(exportScale, exportScale)
              cx.fillStyle = '#fff'
              cx.fillRect(0, 0, bw + pad * 2, bh + pad * 2)
              cx.save()
              cx.translate(-mnx + pad, -mny + pad)
              render(
                cx,
                state.mmNodes,
                state.mmConns,
                [],
                null,
                {offsetX: 0, offsetY: 0, zoom: 1},
                null,
                null,
                null,
                true,
                null
              )
              cx.restore()
              const a = document.createElement('a')
              a.href = ec.toDataURL('image/png')
              a.download = 'mindmap.png'
              a.click()
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            <span className={style[bem.e('tip')]}>导出PNG</span>
          </button>
        </div>

        {state.mmSelectedIds.length > 0 && !selConn && !isFrameEdit && (
          <div className={style[bem.e('pp')]}>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>主题</span>
              {CKEYS.map(k => (
                <div
                  key={k}
                  className={[
                    style[bem.e('cd')],
                    (sel1?.color || 'purple') === k ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{background: PAL[k].bd}}
                  onClick={() => chCol(k)}
                />
              ))}
              <label className={style[bem.e('cd')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                <input type="color" value={sel1?.color?.startsWith('#') ? sel1.color : '#000000'} onChange={e => chCol(e.target.value)} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
              </label>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>形状</span>
              {SHAPES.filter(s => s.id !== 'frame').map(s => (
                <button
                  key={s.id}
                  className={[
                    style[bem.e('pp-b')],
                    sel1?.shape === s.id ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => updShape(s.id)}
                >
                  {s.lb}
                </button>
              ))}
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>字号</span>
              {FONT_SIZES.map(s => (
                <button
                  key={s}
                  className={[
                    style[bem.e('pp-b')],
                    (sel1?.fontSize || (sel1?.shape === 'topic' ? 14 : 13)) === s
                      ? style[bem.is('active', true)]
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => updNodeProp('fontSize', s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>字色</span>
              {TEXT_COLORS.map(c => (
                <div
                  key={c}
                  className={[
                    style[bem.e('cd')],
                    sel1?.fontColor === c ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{background: c}}
                  onClick={() => updNodeProp('fontColor', c)}
                />
              ))}
              <label className={style[bem.e('cd')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                <input type="color" value={sel1?.fontColor?.startsWith('#') ? sel1.fontColor : '#000000'} onChange={e => updNodeProp('fontColor', e.target.value)} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
              </label>
              <button
                className={[
                  style[bem.e('pp-b')],
                  !sel1?.fontColor ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('fontColor', null)}
              >
                默认
              </button>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>字体</span>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1?.fontWeight === 'bold' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  updNodeProp('fontWeight', sel1?.fontWeight === 'bold' ? 'normal' : 'bold')
                }
              >
                加粗
              </button>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1?.fontStyle === 'italic' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  updNodeProp('fontStyle', sel1?.fontStyle === 'italic' ? 'normal' : 'italic')
                }
              >
                斜体
              </button>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1?.textAlign === 'center' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  updNodeProp('textAlign', sel1?.textAlign === 'center' ? 'left' : 'center')
                }
              >
                居中
              </button>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>边框</span>
              {BORDER_STYLES.map(bs => (
                <button
                  key={bs.id}
                  className={[
                    style[bem.e('pp-b')],
                    (sel1?.borderStyle || 'solid') === bs.id ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => updNodeProp('borderStyle', bs.id)}
                >
                  {bs.lb}
                </button>
              ))}
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>背景</span>
              {BG_STYLES.map(bg => (
                <button
                  key={bg.id}
                  className={[
                    style[bem.e('pp-b')],
                    (sel1?.bgStyle || 'solid') === bg.id ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => updNodeProp('bgStyle', bg.id)}
                >
                  {bg.lb}
                </button>
              ))}
            </div>
          </div>
        )}

        {isFrameEdit && (
          <div className={style[bem.e('pp')]}>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>颜色</span>
              {CKEYS.map(k => (
                <div
                  key={k}
                  className={[
                    style[bem.e('cd')],
                    (sel1?.color || 'purple') === k ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{background: PAL[k].bd}}
                  onClick={() => chCol(k)}
                />
              ))}
              <label className={style[bem.e('cd')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                <input type="color" value={sel1?.color?.startsWith('#') ? sel1.color : '#000000'} onChange={e => chCol(e.target.value)} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
              </label>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>标题</span>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.frameHeader !== false ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('frameHeader', true)}
              >
                显示
              </button>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.frameHeader === false ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('frameHeader', false)}
              >
                隐藏
              </button>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>边框</span>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.borderStyle === 'solid' || !sel1.borderStyle
                    ? style[bem.is('active', true)]
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('borderStyle', 'solid')}
              >
                实线
              </button>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.borderStyle === 'dashed' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('borderStyle', 'dashed')}
              >
                虚线
              </button>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.borderStyle === 'none' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('borderStyle', 'none')}
              >
                无
              </button>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>背景</span>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.bgStyle !== 'transparent' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('bgStyle', 'solid')}
              >
                有
              </button>
              <button
                className={[
                  style[bem.e('pp-b')],
                  sel1.bgStyle === 'transparent' ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('bgStyle', 'transparent')}
              >
                透明
              </button>
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>字色</span>
              {TEXT_COLORS.map(c => (
                <div
                  key={c}
                  className={[
                    style[bem.e('cd')],
                    sel1?.fontColor === c ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{background: c}}
                  onClick={() => updNodeProp('fontColor', c)}
                />
              ))}
              <label className={style[bem.e('cd')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                <input type="color" value={sel1?.fontColor?.startsWith('#') ? sel1.fontColor : '#000000'} onChange={e => updNodeProp('fontColor', e.target.value)} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
              </label>
              <button
                className={[
                  style[bem.e('pp-b')],
                  !sel1?.fontColor ? style[bem.is('active', true)] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => updNodeProp('fontColor', null)}
              >
                默认
              </button>
            </div>
          </div>
        )}

        {selConn && (
          <div className={style[bem.e('pp')]}>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>箭头</span>
              {ARROWS.map(a => (
                <button
                  key={a.id}
                  className={[
                    style[bem.e('pp-b')],
                    selConn.arrow === a.id ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => updConn('arrow', a.id)}
                >
                  {a.lb}
                </button>
              ))}
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>线型</span>
              {LTYPES.map(l => (
                <button
                  key={l.id}
                  className={[
                    style[bem.e('pp-b')],
                    selConn.line === l.id ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => updConn('line', l.id)}
                >
                  {l.lb}
                </button>
              ))}
            </div>
            <div className={style[bem.e('pp-r')]}>
              <span className={style[bem.e('pp-l')]}>颜色</span>
              {CKEYS.map(k => (
                <div
                  key={k}
                  className={[
                    style[bem.e('cd')],
                    selConn.color === k ? style[bem.is('active', true)] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{background: PAL[k].bd}}
                  onClick={() => updConn('color', k)}
                />
              ))}
              <label className={style[bem.e('cd')]} style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', position: 'relative', overflow: 'hidden'}} title="自定义颜色">
                <input type="color" value={selConn?.color?.startsWith('#') ? selConn.color : '#000000'} onChange={e => updConn('color', e.target.value)} style={{position: 'absolute', opacity: 0, width: '200%', height: '200%', top: '-50%', left: '-50%', cursor: 'pointer'}} />
              </label>
            </div>
          </div>
        )}

        <div className={style[bem.e('zm')]}>
          <button
            onClick={() =>
              dispatch({
                type: 'SET_MM_VIEW',
                payload: {zoom: Math.max(0.15, state.mmView.zoom - 0.1)},
              })
            }
          >
            −
          </button>
          <span>{Math.round(state.mmView.zoom * 100)}%</span>
          <button
            onClick={() =>
              dispatch({type: 'SET_MM_VIEW', payload: {zoom: Math.min(4, state.mmView.zoom + 0.1)}})
            }
          >
            +
          </button>
          <div className={style[bem.e('td')]} style={{margin: '0 2px'}} />
          <button
            onClick={() =>
              dispatch({type: 'SET_MM_VIEW', payload: {zoom: 1, offsetX: 0, offsetY: 0}})
            }
          >
            <svg viewBox="0 0 24 24" style={{width: 14, height: 14}}>
              <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6z" />
            </svg>
          </button>
        </div>

        {editId && ep && (
          <textarea
            className={style[bem.e('te')]}
            autoFocus
            value={editTx}
            onChange={e => setEditTx(e.target.value)}
            style={{
              left: ep.x * state.mmView.zoom + state.mmView.offsetX + (isFrameEdit ? 8 : 0),
              top:
                ep.y * state.mmView.zoom +
                state.mmView.offsetY +
                (isFrameEdit ? (sel1?.frameHeader !== false ? 4 : 4) : 0),
              width: isFrameEdit ? (ep.w - 16) * state.mmView.zoom : undefined,
              minWidth: isFrameEdit ? undefined : ep.w * state.mmView.zoom,
              minHeight: isFrameEdit ? 20 * state.mmView.zoom : ep.h * state.mmView.zoom,
              fontSize: (ep.fontSize || (sel1?.shape === 'topic' ? 14 : 13)) * state.mmView.zoom,
              fontWeight: ep.fontWeight || (sel1?.shape === 'topic' ? 'bold' : 'normal'),
              fontStyle: ep.fontStyle || 'normal',
              textAlign: ep.textAlign || 'left',
              color: ep.fontColor || '#1b1b1f',
              background: ep.bgStyle === 'transparent' || isFrameEdit ? 'transparent' : '#fff',
            }}
            onBlur={finEdit}
            onKeyDown={e => {
              if (e.key === 'Escape') finEdit()
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                finEdit()
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

const Mindmap = ({state, dispatch, navigate}) => {
  if (!state.activeMindmapId)
    return <MMList state={state} dispatch={dispatch} navigate={navigate} />
  return <MMEdit state={state} dispatch={dispatch} navigate={navigate} />
}

export default React.memo(Mindmap)
