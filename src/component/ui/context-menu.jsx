import React, { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { UiIcon } from './icons';
import { confirm } from './confirm-dialog';
import { cn } from '@/lib/utils';

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export const ContextMenuSubTrigger = ({ className, inset, children, ...props }) => (
  <ContextMenuPrimitive.SubTrigger
    data-slot="context-menu-sub-trigger"
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium max-[767px]:py-2 max-[767px]:text-[13px] outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
  </ContextMenuPrimitive.SubTrigger>
);

export const ContextMenuSubContent = ({ className, ...props }) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      className={cn(
        'z-[99999] min-w-[8rem] overflow-hidden rounded-md border border-border/80 bg-popover/90 p-1 text-popover-foreground shadow-xl backdrop-blur-md',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
);

export const ContextMenuContent = ({ className, ...props }) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      data-slot="context-menu-content"
      className={cn(
        'z-[99999] max-h-(--radix-context-menu-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border border-border/80 bg-popover/90 p-1 text-popover-foreground shadow-xl backdrop-blur-md',
        'origin-(--radix-context-menu-content-transform-origin)',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
);

export const ContextMenuItem = ({ className, inset, variant = 'default', ...props }) => (
  <ContextMenuPrimitive.Item
    data-slot="context-menu-item"
    data-variant={variant}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium max-[767px]:py-2 max-[767px]:text-[13px] outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5 [&_svg]:text-muted-foreground',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
);

export const ContextMenuCheckboxItem = ({ className, children, ...props }) => (
  <ContextMenuPrimitive.CheckboxItem
    data-slot="context-menu-checkbox-item"
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-xs font-medium max-[767px]:py-2 max-[767px]:text-[13px] outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5',
      className
    )}
    {...props}
  >
    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <CheckIcon className="size-3.5" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
);

export const ContextMenuRadioItem = ({ className, children, ...props }) => (
  <ContextMenuPrimitive.RadioItem
    data-slot="context-menu-radio-item"
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-xs font-medium max-[767px]:py-2 max-[767px]:text-[13px] outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5',
      className
    )}
    {...props}
  >
    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <CircleIcon className="size-2 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
);

export const ContextMenuLabel = ({ className, inset, ...props }) => (
  <ContextMenuPrimitive.Label
    data-slot="context-menu-label"
    className={cn('px-2.5 py-1.5 text-xs text-muted-foreground', inset && 'pl-8', className)}
    {...props}
  />
);

export const ContextMenuSeparator = ({ className, ...props }) => (
  <ContextMenuPrimitive.Separator
    data-slot="context-menu-separator"
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
);

export const ContextMenuShortcut = ({ className, ...props }) => (
  <span
    className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
    {...props}
  />
);

// 同一时刻只允许一个菜单展开，所有实例共享这一份状态
const globalMenuCoordinator = {
  activeId: null,
  listeners: new Set(),
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  claim(id) {
    this.activeId = id;
    this.notify();
  },
  release(id) {
    if (this.activeId === id) {
      this.activeId = null;
      this.notify();
    }
  },
  notify() {
    this.listeners.forEach((fn) => fn(this.activeId));
  },
};

export const ContextMenuHost = ({
  children,
  metaInfo,
  menuItems = [],
  onShow,
  onHide,
  className = '',
}) => {
  const instanceIdRef = useRef(Symbol());
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const menuElRef = useRef(null);
  const anchorRef = useRef({ x: 0, y: 0 });

  const longPressRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => globalMenuCoordinator.subscribe((activeId) => {
    const shouldOpen = activeId === instanceIdRef.current;
    setIsOpen((prev) => {
      if (prev && !shouldOpen) onHide?.(metaInfo);
      return shouldOpen;
    });
  }), [onHide, metaInfo]);

  const openAt = useCallback((clientX, clientY) => {
    anchorRef.current = { x: clientX, y: clientY };
    setPosition({ x: clientX, y: clientY });
    globalMenuCoordinator.claim(instanceIdRef.current);
    onShow?.(metaInfo);
  }, [onShow, metaInfo]);

  const closeMenu = useCallback(() => {
    globalMenuCoordinator.release(instanceIdRef.current);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current?.timer) clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  }, []);

  const handleContextMenu = (e) => {
    if (e.pointerType === 'touch') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (menuItems.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    openAt(e.clientX, e.clientY);
  };

  const handlePointerDown = (e) => {
    if (e.pointerType !== 'touch' || menuItems.length === 0) return;
    // 嵌套宿主只认一次长按
    if (e.nativeEvent?._contextMenuTouchClaimed) return;
    if (e.nativeEvent) e.nativeEvent._contextMenuTouchClaimed = true;

    cancelLongPress();
    const { clientX, clientY, pointerId } = e;
    longPressRef.current = {
      x: clientX,
      y: clientY,
      pointerId,
      timer: setTimeout(() => {
        longPressRef.current = null;
        // 长按松手会补发一次 click，压住它避免同时触发下层应用
        suppressClickUntilRef.current = Date.now() + 600;
        openAt(clientX, clientY);
      }, 450),
    };
  };

  const handlePointerMove = (e) => {
    const press = longPressRef.current;
    if (!press || e.pointerId !== press.pointerId) return;
    // 超过 8px 视为滚动或拖拽，取消长按
    if (Math.abs(e.clientX - press.x) > 8 || Math.abs(e.clientY - press.y) > 8) {
      cancelLongPress();
    }
  };

  const handleClickCapture = (e) => {
    if (Date.now() >= suppressClickUntilRef.current) return;
    suppressClickUntilRef.current = 0;
    e.preventDefault();
    e.stopPropagation();
  };

  // 菜单打开后由全局 pointerdown 接管外部点击，不铺阻断遮罩
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalDown = (e) => {
      if (menuElRef.current?.contains(e.target)) return;
      closeMenu();
      if (e.pointerType !== 'touch') return;
      const swallowClick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        window.removeEventListener('click', swallowClick, true);
      };
      window.addEventListener('click', swallowClick, true);
      setTimeout(() => window.removeEventListener('click', swallowClick, true), 400);
    };

    window.addEventListener('pointerdown', handleGlobalDown, true);
    return () => window.removeEventListener('pointerdown', handleGlobalDown, true);
  }, [isOpen, closeMenu]);

  // 渲染后按真实尺寸把菜单夹回视口
  useLayoutEffect(() => {
    if (!isOpen || !menuElRef.current) return;
    const rect = menuElRef.current.getBoundingClientRect();
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    const nextX = Math.min(Math.max(anchorRef.current.x, margin), maxX);
    const nextY = Math.min(Math.max(anchorRef.current.y, margin), maxY);
    setPosition(prev => (prev.x === nextX && prev.y === nextY ? prev : { x: nextX, y: nextY }));
  }, [isOpen]);

  // 点击菜单项
  const handleItemClick = useCallback((item, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.disabled) return;

    closeMenu();

    if (item.func && item.func.isNext) {
      try {
        confirm.show({
          title: item.func.confirm?.title || '确认操作',
          content: item.func.confirm?.content || '您确定要执行此操作吗？',
          onConfirm: () => item.func.confirm?.onConfirm?.(metaInfo),
          onCancel: () => item.func.confirm?.onCancel?.(metaInfo),
        });
      } catch {
        // 用户取消
      }
    } else if (item.onClick) {
      item.onClick(metaInfo);
    }
  }, [metaInfo, closeMenu]);

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onClickCapture={handleClickCapture}
        style={{ display: 'contents', WebkitTouchCallout: 'none' }}
      >
        {children}
      </div>

      {isOpen && createPortal(
        <div
          ref={menuElRef}
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          className={cn(
            'fixed z-[100000] min-w-[10rem] overflow-x-hidden rounded-md border border-border/80 bg-popover/90 p-1 text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 select-none',
            'max-h-[70dvh] overflow-y-auto',
            className
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {menuItems.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={`divider-${index}`} className="-mx-1 my-1 h-px bg-border" />;
            }

            const isDestructive = item.danger;

            return (
              <div
                key={item.id || index}
                onClick={(e) => handleItemClick(item, e)}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium max-[767px]:py-2 max-[767px]:text-[13px] outline-none transition-colors',
                  item.disabled && 'pointer-events-none opacity-50',
                  isDestructive
                    ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {item.icon && (
                  <UiIcon
                    name={item.icon}
                    className={cn(
                      'size-3.5 shrink-0',
                      isDestructive ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  />
                )}
                <span className="flex-1 whitespace-nowrap">{item.label}</span>
                {item.func?.isNext && (
                  <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default ContextMenuHost;
