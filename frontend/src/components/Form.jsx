import React from 'react'
import { cn } from './cn'

export function TextInput({
  icon,
  className,
  inputClassName,
  label,
  hideLabel = false,
  id,
  ...rest
}) {
  const inputId = id || (rest.name ? `input-${rest.name}` : undefined)
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex items-center gap-2 h-input px-4',
        'bg-bone-50 border border-line rounded-pill',
        'transition-colors duration-fast ease-out',
        'focus-within:border-forest-700',
        className,
      )}
    >
      {label && (
        <span className={hideLabel ? 'sr-only' : 't-eyebrow shrink-0'}>{label}</span>
      )}
      {icon && (
        <span className='inline-flex text-ink-mute' aria-hidden='true'>
          {icon}
        </span>
      )}
      <input
        id={inputId}
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

export function Toggle({
  checked,
  onChange,
  label,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  id,
  ...rest
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 py-1 cursor-pointer select-none',
        className,
      )}
    >
      <input
        id={id}
        type='checkbox'
        role='switch'
        checked={checked}
        onChange={onChange}
        aria-label={!label ? ariaLabel : undefined}
        aria-labelledby={ariaLabelledBy}
        className='sr-only peer'
        {...rest}
      />
      <span
        className={cn(
          'relative inline-block w-[34px] h-[20px] rounded-pill align-middle',
          'bg-bone-300 peer-checked:bg-forest-700',
          'transition-colors duration-base ease-out',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-forest-500 peer-focus-visible:outline-offset-2',
        )}
      >
        <span
          aria-hidden='true'
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
        'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function TextArea({
  className,
  inputClassName,
  label,
  hideLabel = false,
  id,
  rows = 4,
  ...rest
}) {
  const inputId = id || (rest.name ? `input-${rest.name}` : undefined)
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={hideLabel ? 'sr-only' : 't-eyebrow'}
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 rounded-lg',
          'bg-bone-50 border border-line outline-none text-sm text-ink',
          'placeholder:text-ink-mute resize-y',
          'transition-colors duration-fast ease-out',
          'focus:border-forest-700',
          'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
          inputClassName,
        )}
        {...rest}
      />
    </div>
  )
}

export function Select({
  className,
  inputClassName,
  label,
  hideLabel = false,
  id,
  options = [],
  ...rest
}) {
  const inputId = id || (rest.name ? `input-${rest.name}` : undefined)
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={hideLabel ? 'sr-only' : 't-eyebrow'}
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'h-input px-4 rounded-pill',
          'bg-bone-50 border border-line text-sm text-ink outline-none',
          'transition-colors duration-fast ease-out',
          'focus:border-forest-700',
          'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
          inputClassName,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
