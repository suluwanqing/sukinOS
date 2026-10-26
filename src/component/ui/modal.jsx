import { forwardRef } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[1000] bg-black/50',
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = forwardRef(function DialogContent(
  { className, children, showCloseButton = true, ...props },
  ref
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        /* 核心修复：放行与挂载在 body 上的外部 Portal 元素（如 Select 下拉框、Tooltip）交互，
           防止 Radix 的 Focus Trap 和 Interact Outside 拦截吞没 Select 的点击与搜索框聚焦事件 */
        onPointerDownOutside={(e) => {
          const target = e.target
          if (
            target instanceof HTMLElement &&
            (target.closest('[data-slot="select-content"]') ||
              target.closest('[data-slot="select-trigger"]') ||
              target.closest('.z-\\[99999\\]'))
          ) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target
          if (
            target instanceof HTMLElement &&
            (target.closest('[data-slot="select-content"]') ||
              target.closest('[data-slot="select-trigger"]') ||
              target.closest('.z-\\[99999\\]'))
          ) {
            e.preventDefault()
          }
        }}
        onFocusOutside={(e) => {
          const target = e.target
          if (
            target instanceof HTMLElement &&
            (target.closest('[data-slot="select-content"]') ||
              target.closest('[data-slot="select-trigger"]'))
          ) {
            e.preventDefault()
          }
        }}
        className={cn(
          'bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[1000] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-[3px] focus:ring-ring/50 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            aria-label="关闭"
          >
            <XIcon />
          </DialogClose>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = 'DialogContent'

const DialogHeader = forwardRef(function DialogHeader({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
})
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = forwardRef(function DialogFooter(
  { className, showCloseButton = false, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">
          关闭
        </DialogClose>
      )}
    </div>
  )
})
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = forwardRef(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
})
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = forwardRef(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
})
DialogDescription.displayName = 'DialogDescription'

const bodyLayout = {
  standard: 'flex flex-col gap-4',
  split: 'grid grid-cols-[220px_1fr] gap-7',
}

function Modal({
  title,
  visible = false,
  onClose,
  children,
  width = 820,
  layout = 'standard',
  minHeight,
}) {
  const handleOpenChange = (next) => {
    if (!next) onClose?.()
  }

  return (
    <DialogPrimitive.Root open={visible} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-none'
        )}
        style={{
          width,
          maxWidth: 'calc(100vw - 32px)',
          minHeight: minHeight || (layout === 'split' ? 420 : 320),
        }}
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-5">
          <DialogTitle className="min-w-0 flex-1 truncate">{title}</DialogTitle>
          <DialogClose
            data-slot="modal-close"
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            aria-label="关闭"
          >
            <XIcon />
          </DialogClose>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto p-6', bodyLayout[layout] || bodyLayout.standard)}>
          {children}
        </div>
      </DialogContent>
    </DialogPrimitive.Root>
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}

export default Modal
