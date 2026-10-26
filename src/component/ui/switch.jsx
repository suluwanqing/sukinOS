import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
const sizeMap = {
  small: { root: 'h-[18px] w-8', thumb: 'size-3', travel: 'translate-x-[16px]' },
  medium: { root: 'h-5 w-10', thumb: 'size-4', travel: 'translate-x-5' },
  large: { root: 'h-7 w-[52px]', thumb: 'size-[22px]', travel: 'translate-x-[26px]' },
};

const dotSizeMap = {
  small: { root: 'h-2 w-6', thumb: 'size-3.5', travel: 'translate-x-[10px]' },
  medium: { root: 'h-3 w-8', thumb: 'size-[18px]', travel: 'translate-x-[14px]' },
  large: { root: 'h-3 w-9', thumb: 'size-[22px]', travel: 'translate-x-[14px]' },
};
const trackTone = (type) => (type === 'dark' ? 'bg-foreground' : 'bg-primary')
const borderTone = (type) => (type === 'dark' ? 'border-foreground' : 'border-primary')

export const Check = forwardRef(({
  checked = false,
  onChange,
  disabled = false,
  type = 'default',
  size = 'medium',
  plain = false,
  round,
  dot = false,
  className = '',
  style: inlineStyle = {}
}, ref) => {
  const dim = (dot ? dotSizeMap : sizeMap)[size] || sizeMap.medium;
  const trackCls = dot
    ? 'border-transparent bg-input px-0'
    : plain
      ? cn('bg-transparent', checked ? borderTone(type) : 'border-input')
      : checked
        ? cn(trackTone(type), 'border-transparent')
        : type === 'dark'
          ? 'border-input bg-background'
          : 'border-transparent bg-input';
  const thumbCls = dot
    ? checked
      ? cn('border', borderTone(type), trackTone(type))
      : 'border border-input bg-background'
    : plain
      ? checked
        ? trackTone(type)
        : 'bg-input'
      : checked
        ? 'bg-background'
        : type === 'dark'
          ? 'bg-muted-foreground'
          : 'bg-background';

  const toggle = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.(!checked);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle(e);
    }
  };

  const radiusCls = round === false ? 'rounded-md' : 'rounded-full';

  return (
    <div
      ref={ref}
      role="switch"
      aria-checked={!!checked}
      aria-disabled={!!disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      data-slot="switch"
      data-state={checked ? 'checked' : 'unchecked'}
      className={cn(
        'relative inline-flex shrink-0 items-center border px-[2px] align-middle outline-none transition-all',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50',
        dim.root,
        radiusCls,
        trackCls,
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-85',
        className
      )}
      style={inlineStyle}
    >
      <span
        className={cn(
          'block shrink-0 shadow-xs ring-0 transition-transform duration-200',
          dim.thumb,
          radiusCls,
          checked ? dim.travel : dot ? '-translate-x-[2px]' : 'translate-x-0',
          thumbCls
        )}
      />
    </div>
  );
});

export default React.memo(Check);
