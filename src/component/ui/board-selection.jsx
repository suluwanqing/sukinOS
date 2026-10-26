import React, { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { surfaceCard } from './tokens'

const overlayCls = 'fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 animate-in fade-in-0 duration-150'
const panelCls = cn(
  'flex max-w-[92%] flex-col overflow-hidden rounded-lg border border-border shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 outline-none',
  surfaceCard
)

export const BoardSelection = ({
  visible = false,
  title = "选择打开方式",
  options = [],
  onSelect,
  onClose,
  noneInfo = '无可用选择',
  className,
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose?.()
    }
  }, [onClose])

  useEffect(() => {
    if (!visible) return
    window.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [visible, handleKeyDown])

  if (!visible) return null
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }
  return createPortal(
    <div
      className={overlayCls}
      data-state="open"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleOverlayClick}
    >
      <div
        className={cn(panelCls, className)}
        style={{ width: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border bg-muted/60 px-5 py-3.5 text-sm font-semibold text-foreground">
          {title}
        </div>
        <div className="max-h-[280px] overflow-y-auto bg-background py-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent">
          {options.length > 0 ? (
            options.map((item, index) => (
              <div
                key={item.id ?? item.value ?? item.key ?? index}
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center bg-background px-5 py-2.5 outline-none transition-colors duration-150 hover:bg-accent focus-visible:bg-accent"
                onClick={() => onSelect && onSelect(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect && onSelect(item)
                  }
                }}
              >
                <div className="mr-3.5 flex size-8 shrink-0 items-center justify-center">
                  {item.icon || <div className="size-full rounded-md border border-border bg-muted" />}
                </div>
                <div className="flex-1 truncate text-sm font-medium text-foreground">
                  {item.label}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-background px-5 py-8 text-center text-sm text-muted-foreground">{noneInfo}</div>
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          className="cursor-pointer select-none border-t border-border bg-muted/60 px-5 py-2.5 text-center text-xs sm:text-sm font-medium text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:bg-accent"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClose?.()
            }
          }}
        >
          取消
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BoardSelection
