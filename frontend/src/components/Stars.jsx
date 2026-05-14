import React from 'react'
import { IconStar, IconStarHalf } from './Icons'
import { cn } from './cn'

const SIZE = { sm: 12, md: 14, lg: 18 }

/**
 * value: number 0..5
 * text: optional trailing text node (e.g. "4.5 · 12 reviews"); aria-hidden
 * size: 'sm' | 'md' | 'lg'
 */
export function Stars({ value, text, size = 'md', className }) {
  const numeric = typeof value === 'number' ? value : parseFloat(value) || 0
  const rounded = Math.round(numeric * 10) / 10
  const px = SIZE[size]
  const ariaLabel = text
    ? `Rated ${rounded} out of 5 stars, ${text}`
    : `Rated ${rounded} out of 5 stars`

  return (
    <span
      role='img'
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-0.5 text-clay-500', className)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        if (numeric >= n) return <IconStar key={n} filled width={px} height={px} />
        if (numeric >= n - 0.5)
          return <IconStarHalf key={n} width={px} height={px} />
        return <IconStar key={n} width={px} height={px} />
      })}
      {text && (
        <span aria-hidden='true' className='ml-2 text-sm text-ink-soft'>
          {text}
        </span>
      )}
    </span>
  )
}

export default Stars
