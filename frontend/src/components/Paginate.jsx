import React from 'react'
import { Link } from 'react-router-dom'
import { IconChevronRight } from './Icons'
import { cn } from './cn'

const PILL_BASE =
  'inline-grid place-items-center w-9 h-9 rounded-pill border border-line text-ink-soft ' +
  'transition-colors duration-fast ease-out hover:bg-bone-200 hover:text-forest-800 ' +
  'no-underline hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2'
const PILL_ACTIVE =
  'bg-forest-700 text-bone-50 border-forest-700 hover:bg-forest-800 hover:text-bone-50'
const PILL_DISABLED =
  'text-ink-faint border-line-soft cursor-not-allowed hover:bg-transparent hover:text-ink-faint'

const Paginate = ({ pages, page, isAdmin = false, keyword = '' }) => {
  if (pages <= 1) return null

  const hrefFor = (n) =>
    isAdmin
      ? `/admin/productlist/${n}`
      : keyword
      ? `/search/${keyword}/page/${n}`
      : `/page/${n}`

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < pages ? page + 1 : null
  const pageList = Array.from({ length: pages }, (_, i) => i + 1)

  return (
    <nav aria-label='Pagination' className='flex justify-center gap-1 pt-6 pb-2'>
      {prevPage ? (
        <Link to={hrefFor(prevPage)} aria-label='Previous page' className={PILL_BASE}>
          <span className='rotate-180 inline-flex' aria-hidden='true'>
            <IconChevronRight />
          </span>
        </Link>
      ) : (
        <span aria-label='Previous page' aria-disabled='true' className={cn(PILL_BASE, PILL_DISABLED)}>
          <span className='rotate-180 inline-flex' aria-hidden='true'>
            <IconChevronRight />
          </span>
        </span>
      )}
      {pageList.map((n) => (
        <Link
          key={n}
          to={hrefFor(n)}
          aria-current={n === page ? 'page' : undefined}
          aria-label={`Page ${n}`}
          className={cn(PILL_BASE, n === page && PILL_ACTIVE, 'text-sm')}
        >
          {n}
        </Link>
      ))}
      {nextPage ? (
        <Link to={hrefFor(nextPage)} aria-label='Next page' className={PILL_BASE}>
          <IconChevronRight />
        </Link>
      ) : (
        <span aria-label='Next page' aria-disabled='true' className={cn(PILL_BASE, PILL_DISABLED)}>
          <IconChevronRight />
        </span>
      )}
    </nav>
  )
}

export default Paginate
