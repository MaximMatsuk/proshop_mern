import React from 'react'
import { cn } from './cn'

export function TextInput({ icon, className, inputClassName, ...rest }) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 h-input px-4',
        'bg-bone-50 border border-line rounded-pill',
        'transition-colors duration-fast ease-out',
        'focus-within:border-forest-700',
        className,
      )}
    >
      {icon && <span className='inline-flex text-ink-mute'>{icon}</span>}
      <input
        className={cn(
          'flex-1 bg-transparent border-0 outline-none text-sm text-ink',
          'placeholder:text-ink-mute',
          inputClassName,
        )}
        {...rest}
      />
    </label>
  )
}

export function FieldLabel({ children, htmlFor, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('t-eyebrow', className)}>
      {children}
    </label>
  )
}

export function Toggle({ checked, onChange, label, className }) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', className)}>
      <input type='checkbox' checked={checked} onChange={onChange} className='sr-only peer' />
      <span
        className={cn(
          'relative inline-block w-[34px] h-[20px] rounded-pill align-middle',
          'bg-bone-300 peer-checked:bg-forest-700',
          'transition-colors duration-base ease-out',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-bone-50',
            'transition-transform duration-base ease-out',
            'shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
            checked && 'translate-x-[14px]',
          )}
        />
      </span>
      {label && <span className='text-[13px] text-ink-soft'>{label}</span>}
    </label>
  )
}

export function IconButton({ children, className, ...rest }) {
  return (
    <button
      type='button'
      className={cn(
        'inline-grid place-items-center w-8 h-8 rounded-full',
        'bg-transparent text-ink-mute hover:bg-bone-200 hover:text-forest-800',
        'transition-colors duration-fast ease-out',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
