import { forwardRef, useState, useRef, useImperativeHandle } from 'react'
import { cva } from 'class-variance-authority'
import { Eye, EyeOff, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// 统一尺寸体系映射，兼容 sm / small, default / medium, lg / large
// xsmall 是给移动端工具条用的一档：不做 ≤767px 抬高，保持 28px
const normalizeSize = (size) => {
  if (size === 'xs' || size === 'xsmall' || size === 'mini') return 'xsmall'
  if (size === 'sm' || size === 'small') return 'small'
  if (size === 'lg' || size === 'large') return 'large'
  return 'medium'
}

const inputVariants = cva(
  'inline-flex w-full min-w-0 items-center rounded-md border border-input bg-transparent text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground dark:bg-input/30 has-[input[aria-invalid=true]]:border-destructive has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50',
  {
    variants: {
      size: { xsmall: 'h-7 text-xs', small: 'h-8 text-xs max-[767px]:h-9', medium: 'h-9 text-sm', large: 'h-10 text-base' },
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: '',
      },
    },
    defaultVariants: { size: 'medium', disabled: false },
  }
)

const innerVariants = cva(
  'h-full w-full min-w-0 appearance-none bg-transparent text-inherit outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
  {
    variants: {
      size: { xsmall: 'px-2', small: 'px-2.5', medium: 'px-3', large: 'px-3.5' },
      hasPrefix: { true: 'pl-1', false: '' },
      hasSuffix: { true: 'pr-1', false: '' },
    },
    defaultVariants: { size: 'medium' },
  }
)

const adornment = 'inline-flex shrink-0 items-center justify-center text-muted-foreground'

export const Input = forwardRef((
  {
    value,
    defaultValue,
    onChange,
    size = 'medium',
    disabled = false,
    clearable = false,
    showPassword = false,
    focus = true,
    hover = true,
    prefixIcon,
    suffixIcon,
    maxLength,
    minLength,
    className = '',
    style = {},
    isRound = false,
    ...restProps
  },
  ref
) => {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const innerInputRef = useRef(null)


  const [uncontrolledVal, setUncontrolledVal] = useState(defaultValue ?? '')

  useImperativeHandle(ref, () => innerInputRef.current)

  const isControlled = value !== undefined
  const currentVal = isControlled ? (value ?? '') : uncontrolledVal

  const actualSize = normalizeSize(size)

  const inputType =
    restProps.type === 'password' && showPassword && passwordVisible
      ? 'text'
      : restProps.type

  const hasPrefix = !!prefixIcon
  const hasSuffix = !!suffixIcon || clearable || (showPassword && restProps.type === 'password')

  const handleChange = (e) => {
    if (!isControlled) {
      setUncontrolledVal(e.target.value)
    }
    onChange?.(e)
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (innerInputRef.current) {
      innerInputRef.current.value = ''
      innerInputRef.current.focus()
    }

    if (!isControlled) {
      setUncontrolledVal('')
    }

    if (onChange && innerInputRef.current) {
      const syntheticEvent = Object.create(e)
      syntheticEvent.target = innerInputRef.current
      syntheticEvent.currentTarget = innerInputRef.current
      onChange(syntheticEvent)
    }
  }

  const renderSuffix = () => {
    if (suffixIcon) {
      return <span className={cn(adornment, 'pr-2.5')}>{suffixIcon}</span>
    }

    if (restProps.type === 'password' && showPassword) {
      return (
        <button
          type="button"
          className={cn(adornment, 'cursor-pointer pr-2.5 outline-none transition-colors hover:text-foreground focus-visible:text-foreground')}
          onClick={() => setPasswordVisible(!passwordVisible)}
          aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
          tabIndex={disabled ? -1 : 0}
        >
          {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )
    }

    const hasValue = currentVal !== '' && currentVal !== null && currentVal !== undefined

    if (clearable && hasValue && !disabled) {
      return (
        <button
          type="button"
          className={cn(adornment, 'cursor-pointer pr-2.5 outline-none transition-colors hover:text-foreground focus-visible:text-foreground')}
          onMouseDown={handleClear}
          aria-label="清空内容"
          tabIndex={disabled ? -1 : 0}
        >
          <XCircle className="size-4 transition-colors" />
        </button>
      )
    }

    return null
  }

  return (
    <div
      data-slot="input"
      style={style}
      className={cn(
        inputVariants({ size: actualSize, disabled }),
        hover !== false && 'hover:border-foreground/25 dark:hover:bg-input/50',
        focus !== false && 'has-[input:focus-visible]:border-ring',
        isRound && 'rounded-full',
        className
      )}
    >
      {hasPrefix && (
        <span className={cn(adornment, 'whitespace-nowrap pl-2.5')}>{prefixIcon}</span>
      )}
      <input
        ref={innerInputRef}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className={innerVariants({ size: actualSize, hasPrefix, hasSuffix })}
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
        {...restProps}
        type={inputType}
      />
      {renderSuffix()}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
