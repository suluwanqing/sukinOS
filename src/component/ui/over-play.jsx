import React, { useEffect } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'


const overPlayVariants = cva('flex h-screen w-screen items-center justify-center animate-in fade-in-0 duration-400', {
  variants: {
    isFixed: { true: 'fixed left-0 top-0 z-[1000]', false: '' },
    isBlur: { true: 'blur-[5px] will-change-[filter]', false: '' },
  },
})

export const OverPlay = ({
  children,
  style: customeStyle = {},
  styleC = {},
  closeFunc = () => { },
  isFixed = false,
  isBlur = false,
  className,
}) => {

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeFunc()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeFunc])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(overPlayVariants({ isFixed, isBlur }), className)}
      style={customeStyle ? customeStyle : undefined}
      onClick={(e) => { if (e.target == e.currentTarget) { closeFunc() } }}
    >
      <div className="flex items-center justify-center" style={styleC ? styleC : undefined}>
        {children}
      </div>
    </div>
  )
}

export default OverPlay
