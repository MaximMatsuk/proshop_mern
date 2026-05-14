import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from './cn'

/**
 * crumbs: Array<{ label: string, href?: string, current?: boolean }>
 */
export function Breadcrumb({ crumbs, className }) {
  return (
    <nav aria-label='Breadcrumb' className={cn('pb-6', className)}>
      <ol className='flex items-center gap-2 text-xs text-ink-mute list-none p-0 m-0'>
        {crumbs.map((c, i) => (
          <React.Fragment key={`${c.label}-${i}`}>
            {i > 0 && (
              <li aria-hidden='true' className='text-ink-faint'>·</li>
            )}
            <li
              aria-current={c.current ? 'page' : undefined}
              className={c.current ? 'text-forest-800' : ''}
            >
              {c.href && !c.current ? (
                <Link
                  to={c.href}
                  className='text-ink-mute hover:text-forest-700 no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
                >
                  {c.label}
                </Link>
              ) : (
                c.label
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
