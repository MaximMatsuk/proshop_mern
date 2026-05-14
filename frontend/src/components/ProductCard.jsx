import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from './Badge'
import { cn } from './cn'
import { useFeatureFlag } from '../hooks/useFeatureFlag'

const NAME_SIZE = { md: 'text-xl', sm: 'text-lg' }
const PRICE_SIZE = { md: 'text-lg', sm: 'text-base' }

/**
 * size: 'md' (grid) | 'sm' (rail / recently viewed)
 * showMeta: bool — show "4.5 · 12 reviews" line under price
 */
export function ProductCard({ product, size = 'md', showMeta = true, className }) {
  const lazyImages = useFeatureFlag('image_lazy_loading')
  const outOfStock = product.countInStock === 0

  return (
    <Link
      to={`/product/${product._id}`}
      className={cn(
        'group block no-underline hover:no-underline rounded-lg',
        'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-4',
        className,
      )}
    >
      <div className='aspect-[4/5] rounded-lg overflow-hidden bg-bone-200'>
        <img
          src={product.image}
          alt={product.name}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-slow ease-out',
            outOfStock && 'opacity-55',
          )}
          {...(lazyImages ? { loading: 'lazy' } : {})}
        />
      </div>
      <p
        className={cn(
          'font-display font-medium leading-snug mt-4',
          NAME_SIZE[size],
          outOfStock ? 'text-ink-mute' : 'text-forest-800',
        )}
      >
        {product.name}
      </p>
      <p
        className={cn(
          'font-display font-medium [font-feature-settings:"tnum"]',
          PRICE_SIZE[size],
          outOfStock ? 'text-ink-mute' : 'text-forest-800',
        )}
      >
        ${product.price}
      </p>
      {outOfStock ? (
        <Badge tone='critical' dot className='mt-1.5'>Sold out</Badge>
      ) : showMeta ? (
        <p className='text-xs text-ink-mute mt-1.5 [font-feature-settings:"tnum"]'>
          {product.rating} · {product.numReviews} reviews
        </p>
      ) : null}
    </Link>
  )
}

export default ProductCard
