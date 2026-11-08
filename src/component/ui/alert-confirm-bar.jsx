import React, { memo } from 'react'
import { RefreshCw } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'


const barVariants = cva(
  'fixed left-1/2 top-[30px] z-[1000] w-auto min-w-[min(20rem,calc(100%-24px))] max-w-[calc(100%-24px)] -translate-x-1/2 rounded-full border border-border bg-popover px-5 py-2 text-popover-foreground shadow-lg transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] max-[767px]:top-[calc(12px+var(--su-safe-top,0px))] max-[767px]:px-4 max-[767px]:rounded-2xl',
  {
    variants: {
      visible: {
        true: 'pointer-events-auto translate-y-0 opacity-100',
        false: 'pointer-events-none -translate-y-[100px] opacity-0',
      },
    },
  }
)

const barButtonVariants = cva(
  'flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-none px-4 py-1.5 text-xs font-bold transition-all duration-200 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      tone: {
        cancel: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      },
    },
  }
)

export const AlertConfirm = ({
  visible = false,
  title = '检测到未保存的更改',
  confirmText = '保存更改',
  cancelText = '放弃',
  onConfirm,
  onCancel,
  loading = false,
  icon: Icon = null,
  confirmType = 'primary',
  className,
}) => {
  return (
    <div className={cn(barVariants({ visible }), className)}>
      <div className="flex flex-wrap items-center justify-between gap-5 max-[767px]:gap-2">
        <span className="min-w-0 whitespace-nowrap text-[13px] font-medium max-[767px]:whitespace-normal">{title}</span>
        <div className="flex items-center gap-2.5 max-[767px]:w-full max-[767px]:justify-end">
          <button
            type="button"
            className={cn(barButtonVariants({ tone: 'cancel' }), 'max-[767px]:min-h-9')}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn(barButtonVariants({ tone: confirmType }), 'max-[767px]:min-h-9')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : (Icon && <Icon width="1em" height="1em" />)}
            {loading ? '正在保存...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(AlertConfirm)
