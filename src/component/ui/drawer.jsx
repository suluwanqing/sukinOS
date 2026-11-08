import { useEffect } from 'react'
import { XIcon } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const SIDES = ['left', 'right', 'top', 'bottom']
const sideKeyOf = (side) => (SIDES.includes(side) ? side : 'left')

// 抽屉不传送也不固定到视口：面板铺在最近的定位祖先里，所以只盖住宿主容器本身，
// 不会压住状态栏与其他窗口，应用自带的 CSS Modules 作用域对它依然有效。
const panelVariants = cva(
  'pointer-events-auto absolute flex flex-col overflow-hidden bg-background shadow-lg outline-none transition-transform duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
  {
    variants: {
      side: {
        left: 'inset-y-0 left-0 border-r',
        right: 'inset-y-0 right-0 border-l',
        top: 'inset-x-0 top-0 border-b',
        bottom: 'inset-x-0 bottom-0 border-t',
      },
    },
    defaultVariants: { side: 'left' },
  }
)

// 收起态整条推出容器，靠根节点裁剪藏住；这样无需卸载重挂，动画也能双向走。
const CLOSED_OFFSET = {
  left: '-translate-x-full',
  right: 'translate-x-full',
  top: '-translate-y-full',
  bottom: 'translate-y-full',
}

// 主轴尺寸按贴边方向给默认值，调用方要改只有 size 一个入口。
// 侧向档按导航抽屉的实际内容宽度定：232px 够放标签与树名，再宽就是留白而不是信息。
const DEFAULT_SIZE = {
  left: 'min(232px, 78%)',
  right: 'min(232px, 78%)',
  top: 'min(240px, 60%)',
  bottom: 'min(240px, 60%)',
}

const crossAxisOf = (side) => (side === 'top' || side === 'bottom' ? 'height' : 'width')

const Drawer = ({
  open = false,
  onClose,
  side = 'left',
  size,
  label,
  className,
  style,
  showCloseButton = false,
  children,
}) => {
  const resolvedSide = sideKeyOf(side)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <div
      className={cn('absolute inset-0 z-[300] overflow-hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        data-slot="drawer-backdrop"
        aria-hidden="true"
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-[220ms]',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-slot="drawer-content"
        className={cn(panelVariants({ side: resolvedSide }), !open && CLOSED_OFFSET[resolvedSide], className)}
        style={{ [crossAxisOf(resolvedSide)]: size ?? DEFAULT_SIZE[resolvedSide], ...style }}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            data-slot="drawer-close"
            className="absolute top-3 right-3 inline-flex size-8 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-sm border-0 bg-transparent opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 max-[767px]:size-9"
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  )
}

const DrawerHeader = ({ className, ...props }) => (
  <div
    data-slot="drawer-header"
    className={cn('flex shrink-0 flex-col gap-2 px-4 pt-4 pb-2', className)}
    {...props}
  />
)

const DrawerBody = ({ className, ...props }) => (
  <div
    data-slot="drawer-body"
    className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-2', className)}
    {...props}
  />
)

const DrawerFooter = ({ className, ...props }) => (
  <div
    data-slot="drawer-footer"
    className={cn('flex shrink-0 flex-col gap-2 px-4 pt-2 pb-4', className)}
    {...props}
  />
)

const DrawerTitle = ({ className, ...props }) => (
  <div
    data-slot="drawer-title"
    className={cn('text-lg leading-none font-semibold text-foreground', className)}
    {...props}
  />
)

const DrawerDescription = ({ className, ...props }) => (
  <div
    data-slot="drawer-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
)

export {
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

export default Drawer
