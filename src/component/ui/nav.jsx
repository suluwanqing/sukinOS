import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

const tone = {
  shell: 'border-border bg-card',
  idle: 'text-muted-foreground',
  hover: 'hover:bg-accent hover:text-accent-foreground',
  active: 'bg-accent text-accent-foreground',
  expanded: 'bg-accent/60 text-accent-foreground',
  dropdown: 'border-border bg-popover shadow-lg',
};
const toneOf = () => tone;
const scrollbarCls = '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted';
const arrowCls = 'text-muted-foreground';

const modeKeyOf = (mode) => (mode === 'vertical' ? 'vertical' : 'horizontal');
const itemShape = 'mx-1 my-0.5 flex h-8.5 items-center overflow-hidden whitespace-nowrap rounded-md text-[13px] transition-colors duration-150';
const dropdownShape = 'invisible absolute left-0 top-full z-[100] mt-1.5 min-w-45 translate-y-1.5 rounded-lg border px-0 py-1.5 text-xs opacity-0 transition-[opacity,transform,visibility] duration-150 group-hover/item:visible group-hover/item:translate-y-0 group-hover/item:opacity-100';


const parseWidth = (val, defaultTailwindCls) => {
  if (val === undefined || val === null || val === '') {
    return { cls: defaultTailwindCls, styleVal: undefined };
  }
  if (typeof val === 'number') {
    return { cls: '', styleVal: `${val}px` };
  }
  if (typeof val === 'string') {
    if (val.startsWith('w-')) {
      return { cls: val, styleVal: undefined };
    }
    return { cls: '', styleVal: val };
  }
  return { cls: defaultTailwindCls, styleVal: undefined };
};

const NavItem = ({
  item,
  level,
  activeId,
  expandedKeys,
  onItemClick,
  onToggleExpand,
  collapsed,
  mode,
  tone
}) => {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isExpanded = expandedKeys.includes(item.id);
  const isActive = activeId === item.id;
  const submenuRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      if (mode === 'vertical') onToggleExpand(item.id);
    } else {
      onItemClick(item.id);
    }
  };

  const isVertical = mode === 'vertical';

  const contentStyle = {
    paddingLeft: isVertical && !collapsed ? `${12 + level * 12}px` : undefined,
    paddingRight: isVertical && !collapsed ? '10px' : undefined,
  };

  const stateCls = isActive
    ? `${tone.active} font-semibold`
    : `${tone.hover} ${isExpanded ? tone.expanded : ''}`;

  return (
    <div
      className={cn('relative cursor-pointer select-none', mode === 'horizontal' && 'group/item mr-1')}
    >
      <div
        className={cn(
          itemShape,
          tone.idle,
          level > 0 ? 'font-normal' : hasChildren ? 'font-semibold' : '',
          stateCls,
          mode === 'horizontal' && 'mx-0 my-0 px-3',
          collapsed && isVertical && 'mx-0.5 justify-center px-0'
        )}
        style={contentStyle}
        onClick={handleClick}
        tabIndex={0}
        role={hasChildren ? 'button' : 'link'}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        {item.icon && (
          <span
            className={cn(
              'inline-flex size-4 shrink-0 items-center justify-center transition-all',
              collapsed && isVertical ? 'mx-auto' : 'mr-2.5'
            )}
          >
            {item.icon}
          </span>
        )}
        <span
          className={cn(
            'flex-1 overflow-hidden text-ellipsis font-medium transition-[opacity,width] duration-200',
            collapsed && isVertical && 'pointer-events-none hidden w-0 opacity-0'
          )}
        >
          {item.label}
        </span>

        {hasChildren && (!collapsed || !isVertical) && (
          <span
            className={cn(
              'ml-1.5 flex size-3.5 shrink-0 items-center justify-center transition-transform duration-200',
              arrowCls,
              isExpanded && 'rotate-180'
            )}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        )}
      </div>

      {hasChildren && isVertical && !collapsed && (
        <div
          ref={submenuRef}
          className="overflow-hidden transition-[height,opacity] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            height: isExpanded ? (submenuRef.current ? submenuRef.current.scrollHeight : 'auto') : 0,
            opacity: isExpanded ? 1 : 0,
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
              tone={tone}
            />
          ))}
        </div>
      )}

      {hasChildren && mode === 'horizontal' && (
        <div className={cn(dropdownShape, tone.dropdown, tone.idle)}>
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
              tone={tone}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Nav = ({
  items = [],
  activeId,
  onChange,
  mode = 'vertical',
  theme = 'light',
  collapsed = false,
  onCollapse,
  header = null,
  width,
  collapsedWidth,
  className,
  style: customStyle
}) => {
  const [expandedKeys, setExpandedKeys] = useState([]);
  const tone = toneOf(theme);
  const modeKey = modeKeyOf(mode);

  const isDarkTheme = theme === 'dark';

  useEffect(() => {
    if (collapsed) setExpandedKeys([]);
  }, [collapsed]);

  const handleItemClick = useCallback(
    (id) => {
      if (onChange) onChange(id);
    },
    [onChange]
  );

  const handleToggleExpand = useCallback((id) => {
    setExpandedKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : prev.concat(id)
    );
  }, []);

  const defaultExpandCls = 'w-48';
  const defaultCollapsedCls = 'w-12';

  const currentTargetWidth = collapsed ? collapsedWidth : width;
  const fallbackCls = collapsed ? defaultCollapsedCls : defaultExpandCls;

  const { cls: parsedWidthCls, styleVal: parsedWidthStyle } = modeKey === 'vertical'
    ? parseWidth(currentTargetWidth, fallbackCls)
    : { cls: 'w-full', styleVal: undefined };

  const shellSize = modeKey === 'vertical'
    ? cn('h-full flex-col border-r', parsedWidthCls)
    : 'h-14 w-full flex-row items-center border-b px-4';

  return (
    <div
      className={cn(
        'flex box-border text-xs sm:text-[13px]',
        shellSize,
        modeKey === 'vertical' && 'transition-[width] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        tone.shell,
        isDarkTheme && 'dark',
        className
      )}
      style={{
        ...(parsedWidthStyle ? { width: parsedWidthStyle } : {}),
        ...customStyle
      }}
    >
      {modeKey === 'vertical' && header && (
        <div className="flex h-13 shrink-0 items-center overflow-hidden border-b border-border/70 px-3">
          {header}
        </div>
      )}

      <div
        className={cn(
          'flex flex-1 overflow-x-visible overflow-y-auto',
          scrollbarCls,
          modeKey === 'vertical' ? 'flex-col px-1.5 py-2' : 'flex-row items-center'
        )}
      >
        {items.map((item) => (
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
            tone={tone}
          />
        ))}
      </div>

      {modeKey === 'vertical' && typeof onCollapse === 'function' && (
        <div
          className={cn(
            'group/footer flex h-9.5 shrink-0 cursor-pointer items-center border-t border-border/70 px-2.5 transition-colors',
            tone.shell,
            tone.idle,
            tone.hover
          )}
          onClick={() => onCollapse(!collapsed)}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <span
            className={cn(
              'mx-auto flex size-5 items-center justify-center transition-colors',
              arrowCls,
              'group-hover/footer:text-accent-foreground'
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="size-3.5 transition-transform duration-200"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
};

export default Nav;
