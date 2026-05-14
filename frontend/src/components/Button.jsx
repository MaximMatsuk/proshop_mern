import React from 'react'
import { cn } from './cn'

const VARIANTS = {
  primary: 'bg-forest-700 text-bone-50 border-forest-700 hover:bg-forest-800',
  secondary: 'bg-transparent text-forest-800 border-forest-800 hover:bg-forest-100',
  ghost: 'bg-transparent text-ink border-line hover:bg-bone-200',
  danger: 'bg-transparent text-critical-700 border-critical-500 hover:bg-critical-100',
}

const SIZES = {
  sm: 'h-btnSm px-[14px] text-[13px]',
  md: 'h-btn px-[18px] text-sm',
  lg: 'h-btnLg px-[26px] text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill border whitespace-nowrap',
        'font-medium tracking-[0.005em]',
        'transition-colors duration-fast ease-out',
        'active:translate-y-px focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon && <span className='inline-flex'>{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
