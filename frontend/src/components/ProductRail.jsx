import React from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from './ProductCard'
import { cn } from './cn'

/**
 * id: used for aria-labelledby on the section
 * eyebrow: small uppercase label
 * heading: H2 in Cormorant
 * products: array
 * showMeta: pass-through to ProductCard
 * viewAll: { href, label } — optional inline link on the right
 * className: extra outer classes (e.g. pt-9 / pt-8)
 */
export function ProductRail({
  id,
  eyebrow,
  heading,
  products,
  showMeta = true,
  viewAll,
  className,
}) {
  if (!products || products.length === 0) return null

  return (
    <section aria-labelledby={`${id}-h2`} className={cn(className)}>
      <div className='flex items-end justify-between pb-5'>
        <div>
          <p className='t-eyebrow'>{eyebrow}</p>
          <h2
            id={`${id}-h2`}
            className='font-display font-medium text-2xl text-forest-800 mt-1.5'
          >
            {heading}
          </h2>
        </div>
        {viewAll && (
          <Link
            to={viewAll.href}
            className='text-sm text-forest-700 border-b border-forest-700 hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
          >
            {viewAll.label} →
          </Link>
        )}
      </div>
      <ul
        role='list'
        className='grid grid-flow-col auto-cols-[220px] gap-5 overflow-x-auto pb-2 snap-x snap-mandatory list-none p-0 m-0'
      >
        {products.map((p) => (
          <li key={p._id} className='snap-start'>
            <ProductCard product={p} size='sm' showMeta={showMeta} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ProductRail
