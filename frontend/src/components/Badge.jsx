import React from 'react'
import { cn } from './cn'

const TONES = {
  neutral: 'bg-bone-200 text-ink-soft',
  positive: 'bg-positive-100 text-positive-700',
  caution: 'bg-caution-100 text-caution-700',
  critical: 'bg-critical-100 text-critical-700',
  info: 'bg-info-100 text-info-700',
  brand: 'bg-forest-100 text-forest-700',
}

export function Badge({ tone = 'neutral', dot = false, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill',
        'px-2.5 pt-[3px] pb-1 text-xs font-medium leading-none tracking-[0.01em]',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className='h-1.5 w-1.5 rounded-full bg-current' />}
      {children}
    </span>
  )
}

export function CodeChip({ tone = 'default', children, className }) {
  return (
    <span
      className={cn(
        'inline-block font-mono text-[11.5px] tracking-tight px-[7px] py-[3px] rounded-sm',
        tone === 'dep' ? 'bg-forest-100 text-forest-800' : 'bg-bone-200 text-ink-soft',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SegmentTag({ children, className }) {
  return (
    <span
      className={cn(
        'inline-block text-xs text-ink-soft px-[9px] py-[3px] rounded-pill',
        'border border-line bg-transparent',
        className,
      )}
    >
      {children}
    </span>
  )
}
