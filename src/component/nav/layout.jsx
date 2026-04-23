import React, { useState, useCallback, useRef, useEffect } from 'react'
import style from './style.module.css'
import { createNamespace } from '/utils/js/classcreate'

const bem = createNamespace('nav')

const NavItem = ({
  item,
  level,
  activeId,
  expandedKeys,
  onItemClick,
  onToggleExpand,
  collapsed,
  mode
}) => {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0
  const isExpanded = expandedKeys.includes(item.id)
  const isActive = activeId === item.id
  const submenuRef = useRef(null)

  const handleClick = e => {
    e.stopPropagation()
    if (hasChildren) {
      if (mode === 'vertical') onToggleExpand(item.id)
    } else {
      onItemClick(item.id)
    }
  }

  const itemClass = [
    style[bem.e('item')],
    style[bem.is('active', isActive)] ,
    style[bem.is('expanded', isExpanded)] ,
    style[bem.is('parent', hasChildren)] ,
    style[bem.is('child',  level > 0)]
  ].filter(Boolean).join(' ')

  const contentStyle = {
    paddingLeft: mode === 'vertical' && !collapsed ? `${20 + level * 20}px` : '20px'
  }

  return (
    <div className={itemClass} aria-expanded={isExpanded} aria-current={isActive ? 'page' : undefined}>
      <div
        className={style[bem.e('content')]}
        style={contentStyle}
        onClick={handleClick}
        tabIndex={0}
      >
        {item.icon &&
          <span className={style[bem.e('icon')]}>{item.icon}</span>
        }
        <span className={style[bem.e('label')]}>{item.label}</span>
        {hasChildren && (
          <span className={
            style[bem.e('arrow')] + (isExpanded ? ` ${style[bem.is('arrowOpen', true)]}` : '')
          }>
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        )}
      </div>
      {hasChildren && mode === 'vertical' && (
        <div
          ref={submenuRef}
          className={style[bem.e('submenu')]}
          style={{
            height: isExpanded ? (submenuRef.current ? submenuRef.current.scrollHeight : 'auto') : 0,
            opacity: isExpanded ? 1 : 0,
            transition: 'height 0.3s, opacity 0.3s'
          }}
        >
          {item.children.map(child => (
            <NavItem
              key={child.id}
              item={child}
              level={level + 1}
              activeId={activeId}
              expandedKeys={expandedKeys}
              onItemClick={onItemClick}
              onToggleExpand={onToggleExpand}
              collapsed={collapsed}
              mode={mode}
            />
          ))}
        </div>
      )}
      {hasChildren && mode === 'horizontal' && (
        <div className={style[bem.e('dropdown')]}>
          {item.children.map(child => (
            <NavItem
              key={child.id}
              item={child}
              level={level + 1}
              activeId={activeId}
              expandedKeys={expandedKeys}
              onItemClick={onItemClick}
              onToggleExpand={onToggleExpand}
              collapsed={false}
              mode="vertical"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const Nav = ({
  items = [],
  activeId,
  onChange,
  mode = 'vertical',
  theme = 'light',
  collapsed = false,
  onCollapse,
  className,
  style: customStyle
}) => {
  const [expandedKeys, setExpandedKeys] = useState([])

  useEffect(() => {
    if (collapsed) setExpandedKeys([])
  }, [collapsed])

  const handleItemClick = useCallback(id => {
    if (onChange) onChange(id)
  }, [onChange])

  const handleToggleExpand = useCallback(id => {
    setExpandedKeys(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : prev.concat(id)
    )
  }, [])

  const rootClass = [
    style[bem.b()],
    style[bem.m(mode)],
    style[bem.m(`theme-${theme}`)],
    collapsed ? style[bem.is('collapsed', true)] : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={rootClass} style={customStyle}>
      <div className={style[bem.e('list')]}>
        {items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            level={0}
            activeId={activeId}
            expandedKeys={expandedKeys}
            onItemClick={handleItemClick}
            onToggleExpand={handleToggleExpand}
            collapsed={collapsed}
            mode={mode}
          />
        ))}
      </div>
      {mode === 'vertical' && typeof onCollapse === 'function' && (
        <div
          className={style[bem.e('footer')]}
          onClick={() => onCollapse(!collapsed)}
        >
          <span className={style[bem.e('collapse-btn')]}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: collapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s'
              }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
        </div>
      )}
    </div>
  )
}

export default Nav
