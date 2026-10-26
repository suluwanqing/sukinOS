import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        outline: 'border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground shadow-xs hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground shadow-xs hover:bg-warning/90',
        info: 'bg-info text-info-foreground shadow-xs hover:bg-info/90',
      },
      size: {
        default: 'h-9 px-4 text-sm',
        sm: 'h-8 px-3 text-xs sm:text-[13px]',
        lg: 'h-10 px-5 text-sm sm:text-base',
        xs: 'h-6 gap-1 rounded-sm px-2 text-xs',
        icon: 'size-9 p-0',
        'icon-sm': 'size-8 p-0',
        'icon-lg': 'size-10 p-0',
        'icon-xs': 'size-6 rounded-sm p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const plainClass = {
  default: 'border-primary bg-transparent text-primary shadow-none hover:bg-primary/10',
  outline: 'border-border bg-transparent text-foreground shadow-none',
  secondary: 'border-transparent bg-transparent text-secondary-foreground shadow-none hover:bg-secondary/50',
  ghost: 'bg-transparent',
  destructive: 'border-destructive bg-transparent text-destructive shadow-none hover:bg-destructive/10',
  link: 'bg-transparent',
  success: 'border-success bg-transparent text-success shadow-none hover:bg-success/10',
  warning: 'border-warning bg-transparent text-warning shadow-none hover:bg-warning/10',
  info: 'border-info bg-transparent text-info shadow-none hover:bg-info/10',
}

const legacyTypeToVariant = {
  default: 'outline',
  primary: 'default',
  dark: 'default',
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
        plain && plainClass[resolvedVariant],
        round && 'rounded-full',
        block && 'w-full flex',
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
