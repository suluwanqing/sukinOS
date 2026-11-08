import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none aria-invalid:border-destructive disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs',
        dark: 'bg-foreground text-background shadow-xs',
        outline: 'border-input bg-background text-foreground shadow-xs',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs',
        ghost: '',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs',
        link: 'text-primary underline-offset-4',
        success: 'bg-success text-success-foreground shadow-xs',
        warning: 'bg-warning text-warning-foreground shadow-xs',
        info: 'bg-info text-info-foreground shadow-xs',
      },
      size: {
        default: 'h-9 px-4 text-sm max-[767px]:px-3',
        sm: 'h-8 px-3 text-xs sm:text-[13px] max-[767px]:h-9',
        lg: 'h-10 px-5 text-sm sm:text-base max-[767px]:px-4',
        xs: 'h-6 gap-1 rounded-sm px-2 text-xs max-[767px]:h-7',
        icon: 'size-9 p-0',
        'icon-sm': 'size-8 p-0 max-[767px]:size-9',
        'icon-lg': 'size-10 p-0',
        'icon-xs': 'size-6 rounded-sm p-0 max-[767px]:size-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

// 悬浮反馈单独成表：`hover={false}` 时整表不发，底色保持常态
const variantHover = {
  default: 'hover:bg-primary/90',
  dark: 'hover:bg-foreground/90',
  outline: 'hover:bg-accent hover:text-accent-foreground',
  secondary: 'hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'hover:bg-destructive/90',
  link: 'hover:underline',
  success: 'hover:bg-success/90',
  warning: 'hover:bg-warning/90',
  info: 'hover:bg-info/90',
}

const plainClass = {
  default: 'border-primary bg-transparent text-primary shadow-none',
  dark: 'border-foreground bg-transparent text-foreground shadow-none',
  outline: 'border-input bg-transparent text-foreground shadow-none',
  secondary: 'border-transparent bg-transparent text-secondary-foreground shadow-none',
  ghost: 'bg-transparent',
  destructive: 'border-destructive bg-transparent text-destructive shadow-none',
  link: 'bg-transparent',
  success: 'border-success bg-transparent text-success shadow-none',
  warning: 'border-warning bg-transparent text-warning shadow-none',
  info: 'border-info bg-transparent text-info shadow-none',
}

const plainHover = {
  default: 'hover:bg-primary/10',
  dark: 'hover:bg-foreground/10',
  secondary: 'hover:bg-secondary/50',
  destructive: 'hover:bg-destructive/10',
  success: 'hover:bg-success/10',
  warning: 'hover:bg-warning/10',
  info: 'hover:bg-info/10',
}

const legacyTypeToVariant = {
  default: 'outline',
  primary: 'default',
  dark: 'dark',
  danger: 'destructive',
  success: 'success',
  warning: 'warning',
  info: 'info',
  text: 'ghost',
}

const legacySizeToSize = {
  mini: 'xs',
  small: 'sm',
  medium: 'default',
  large: 'lg'
}

const variantOf = (variant, type) => {
  if (variant) return variant
  if (type && legacyTypeToVariant[type]) return legacyTypeToVariant[type]
  return 'default'
}

const sizeOf = (size) => {
  if (!size) return 'default'
  return legacySizeToSize[size] || size
}

export const Button = forwardRef(({
  children,
  variant,
  type,
  size = 'default',
  plain = false,
  round = false,
  block = false,
  disabled = false,
  loading = false,
  focus = true,
  hover = true,
  icon,
  iconPosition = 'left',
  className = '',
  asChild = false,
  ...restProps
}, ref) => {
  const resolvedVariant = variantOf(variant, type)
  const resolvedSize = sizeOf(size)

  const mark = () => {
    if (loading) {
      return (
        <span
          data-icon="inline-start"
          className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )
    }
    if (icon) return <span data-icon="inline-start" className="inline-flex shrink-0 items-center">{icon}</span>
    return null
  }

  const Comp = asChild ? Slot.Root : 'button'
  const inner = asChild ? children : (
    <>
      {iconPosition === 'left' && mark()}
      {children}
      {iconPosition === 'right' && mark()}
    </>
  )

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      type="button"
      className={cn(
        buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
        hover !== false && variantHover[resolvedVariant],
        plain && plainClass[resolvedVariant],
        plain && hover !== false && plainHover[resolvedVariant],
        round && 'rounded-full',
        block && 'w-full flex',
        focus !== false && 'focus-visible:border-ring',
        className
      )}
      disabled={disabled || loading}
      {...restProps}
    >
      {inner}
    </Comp>
  )
})

Button.displayName = 'Button'

export { buttonVariants }

export default Button
