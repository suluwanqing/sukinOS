import { cva } from 'class-variance-authority';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';


const positionVariants = cva('', {
  variants: {
    position: {
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6',
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-center': 'top-6 left-1/2 -translate-x-1/2',
    },
  },
  defaultVariants: { position: 'top-right' },
});

const POSITIONS = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center'];
const positionKeyOf = (position) => (POSITIONS.includes(position) ? position : 'top-right');

export const Notification = ({
  position = 'top-right',
  title,
  icon,
  content,
  children,
  footer,
  showClose = true,
  onClose,
  onClick,
  className,
  style: customStyle,
  ...restProps
}) => {
  const hasHeader = !!(title || icon || showClose);

  return (
    <div
      className={cn(
        'fixed z-[9999] box-border flex w-80 flex-col overflow-hidden rounded-lg border border-border bg-popover text-sm text-popover-foreground shadow-lg transition-[opacity,transform] duration-300',
        positionVariants({ position: positionKeyOf(position) }),
        className
      )}
      style={customStyle}
      onClick={onClick}
      {...restProps}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            {icon && <span className="inline-flex items-center justify-center text-lg text-primary">{icon}</span>}
            {title && <span className="text-base font-medium leading-snug">{title}</span>}
          </div>
          {showClose && (
            <span
              role="button"
              tabIndex={0}
              aria-label="关闭"
              className="inline-flex cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose?.(e);
                }
              }}
            >
              <XIcon size={16} />
            </span>
          )}
        </div>
      )}

      <div className={cn('px-4 pb-3 text-sm leading-relaxed break-words', hasHeader ? 'pt-1' : 'pt-2')}>
        {children || content}
      </div>

      {footer && (
        <div className="flex items-center justify-end gap-2 px-4 pt-2 pb-3">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Notification;
