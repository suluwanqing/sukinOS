import React, { useCallback, useState } from 'react';
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
export const ContextMenuSubTrigger = ContextMenuPrimitive.SubTrigger;
export const ContextMenuSubContent = ContextMenuPrimitive.SubContent;

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
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5 [&_svg]:text-muted-foreground',
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
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-xs font-medium outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5',
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
      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-xs font-medium outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-3.5',
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

export const ContextMenuHost = ({
  children,
  metaInfo,
  menuItems = [],
  onShow,
  onHide,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 打开菜单：精准计算视口位置，做边缘防溢出处理
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const clickX = e.clientX;
    const clickY = e.clientY;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // 预估菜单宽度与高度
    const menuW = 160;
    const menuH = menuItems.length * 36;

    const x = clickX + menuW > screenW ? screenW - menuW - 12 : clickX;
    const y = clickY + menuH > screenH ? screenH - menuH - 12 : clickY;

    setPosition({ x, y });
    setVisible(true);
    onShow?.(metaInfo);
  }, [menuItems.length, onShow, metaInfo]);

  // 关闭菜单：拦截冒泡与事件，杜绝穿透
  const handleClose = useCallback((e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setVisible(false);
    onHide?.(metaInfo);
  }, [onHide, metaInfo]);

  // 点击菜单项
  const handleItemClick = useCallback((item, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.disabled) return;

    setVisible(false);
    onHide?.(metaInfo);

    if (item.func && item.func.isNext) {
      try {
        confirm.show({
          title: item.func.confirm?.title || '确认操作',
          content: item.func.confirm?.content || '您确定要执行此操作吗？',
          onConfirm: () => item.func.confirm?.onConfirm?.(metaInfo),
          onCancel: () => item.func.confirm?.onCancel?.(metaInfo),
        });
      } catch {
        // 用户取消，静默处理
      }
    } else if (item.onClick) {
      item.onClick(metaInfo);
    }
  }, [metaInfo, onHide]);

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        style={{ display: 'contents' }}
      >
        {children}
      </div>

      {visible && createPortal(
        <div className="fixed inset-0 z-[99999] select-none">
          <div
            className="fixed inset-0 bg-transparent"
            onClick={handleClose}
            onContextMenu={handleClose}
          />
          <div
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
            className={cn(
              'fixed z-[100000] min-w-[10rem] overflow-hidden rounded-md border border-border/80 bg-popover/90 p-1 text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150',
              className
            )}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${index}`}
                    className="-mx-1 my-1 h-px bg-border"
                  />
                );
              }

              const isDestructive = item.danger;

              return (
                <div
                  key={item.id || index}
                  onClick={(e) => handleItemClick(item, e)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs font-medium outline-none transition-colors',
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ContextMenuHost;
