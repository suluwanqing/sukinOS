import React from 'react';
import { cva } from 'class-variance-authority';
import Check from './switch';
import { surfaceCard } from './tokens';
import { cn } from '@/lib/utils';

const iconVariants = cva('flex items-center justify-center text-base shrink-0', {
  variants: {
    tone: {
      default: 'text-foreground',
      primary: 'text-primary',
      success: 'text-success',
      danger: 'text-destructive',
      warning: 'text-warning',
      info: 'text-info',
      violet: 'text-primary',
      dark: 'text-foreground',
      muted: 'text-muted-foreground',
    },
  },
  defaultVariants: { tone: 'primary' },
});

const rowVariants = cva(
  'flex cursor-pointer select-none items-center justify-between px-4 py-3 outline-none transition-colors duration-150',
  {
    variants: {
      isSubItem: { true: 'bg-muted/40 py-2.5 pl-10', false: '' },
      disabled: { true: 'cursor-not-allowed opacity-50', false: '' },
    },
    compoundVariants: [
      { disabled: false, class: 'hover:bg-accent/60 focus-visible:bg-accent/60' },
    ],
  }
);

export const CheckCardBar = (props) => {
  const {
    options = [],
    values = {},
    onUpdate,
    className = '',
    style: customStyle = {}
  } = props;

  const handleGroupLogic = (item, optValue) => {
    const rawVal = values[item.key];
    const currentVal = Array.isArray(rawVal) ? rawVal : (rawVal !== undefined && rawVal !== null ? [rawVal] : []);
    const isExists = currentVal.includes(optValue);
    let nextVal = [];

    if (item.mode === 'single') {
      if (isExists && item.min === 1) return;
      nextVal = isExists ? [] : [optValue];
    } else {
      if (isExists) {
        if (item.min !== undefined && currentVal.length <= item.min) return;
        nextVal = currentVal.filter(v => v !== optValue);
      } else {
        if (item.max !== undefined && currentVal.length >= item.max) return;
        nextVal = [...currentVal, optValue];
      }
    }
    onUpdate?.(item.key, nextVal);
  };

  const renderRow = ({
    label, desc, icon, checked, disabled, type, onClick, isSubItem = false
  }) => {
    // 拦截禁用状态下的点击与键盘切换
    const handleTrigger = (e) => {
      if (disabled) return;
      onClick?.(e);
    };

    return (
      <div
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={rowVariants({ isSubItem, disabled })}
        onClick={handleTrigger}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTrigger(e);
          }
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-3">
          <div className="flex items-center gap-2">
            {icon && (
              <span className={iconVariants({ tone: checked ? type : 'muted' })}>
                {icon}
              </span>
            )}
            <span className="text-sm font-semibold text-foreground truncate">{label}</span>
          </div>
          {desc && <p className="m-0 text-xs leading-snug text-muted-foreground">{desc}</p>}
        </div>
        <div className="pointer-events-none shrink-0">
          <Check checked={checked} type={type} disabled={disabled} round={true} size="medium" />
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex w-full flex-col overflow-hidden rounded-lg border border-border', surfaceCard, className)} style={customStyle}>
      {options.map((item, index) => {
        const isLast = index === options.length - 1;
        const itemKey = item.key ?? `bar_item_${index}`;

        if (!item.type || item.type === 'switch') {
          return (
            <React.Fragment key={itemKey}>
              {renderRow({
                label: item.label,
                desc: item.desc,
                icon: item.icon,
                checked: !!values[item.key],
                disabled: Boolean(item.disabled),
                type: item.theme || 'primary',
                onClick: () => onUpdate?.(item.key, !values[item.key])
              })}
              {!isLast && <div className="h-px w-full bg-border/60" />}
            </React.Fragment>
          );
        }

        if (item.type === 'group') {
          const rawSubVal = values[item.key];
          const groupSelectedList = Array.isArray(rawSubVal) ? rawSubVal : [];

          return (
            <React.Fragment key={itemKey}>
              <div className="flex items-center gap-2 px-4 pt-3.5 pb-1 bg-background">
                {item.icon && <span className="text-xs text-muted-foreground">{item.icon}</span>}
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</span>
              </div>
              <div className="flex flex-col">
                {item.subOptions?.map((opt, subIdx) => {
                  const optItem = typeof opt === 'string' ? { value: opt, label: opt } : opt;
                  const optKey = optItem.value ?? optItem.id ?? `sub_${subIdx}`;

                  return (
                    <React.Fragment key={optKey}>
                      {renderRow({
                        label: optItem.label,
                        desc: optItem.desc,
                        icon: optItem.icon,
                        checked: groupSelectedList.includes(optItem.value),
                        disabled: Boolean(item.disabled || optItem.disabled),
                        type: item.theme || 'primary',
                        isSubItem: true,
                        onClick: () => handleGroupLogic(item, optItem.value)
                      })}
                      {subIdx < (item.subOptions.length - 1) && <div className="ml-10 h-px bg-border/40" />}
                    </React.Fragment>
                  );
                })}
              </div>
              {!isLast && <div className="h-px w-full bg-border/60" />}
            </React.Fragment>
          );
        }

        return null;
      })}
    </div>
  );
};

export default CheckCardBar;
