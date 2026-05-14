import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import { useFeatureFlag } from '../hooks/useFeatureFlag'

/**
 * product: top-rated product to feature in the photo column. Optional —
 * if absent (loading / no products), photo column shows a bone-200 placeholder.
 */
export function Hero({ product }) {
  const lazyImages = useFeatureFlag('image_lazy_loading')

  return (
    <section
      aria-labelledby='hero-h1'
      className='grid grid-cols-1 md:grid-cols-2 gap-7 items-center pb-9'
    >
      <div>
        <p className='t-eyebrow'>Top rated · This week</p>
        <h1
          id='hero-h1'
          className='font-display font-medium text-4xl md:text-5xl text-forest-800 tracking-tight mt-1.5'
        >
          Considered things, well kept.
        </h1>
        <p className='max-w-prose text-md text-ink-soft leading-loose mt-4'>
          Speakers, phones, cameras — chosen one at a time and shipped flat.
          The shop is small on purpose; what's listed is what's stocked.
        </p>
        <div className='mt-6 inline-flex gap-3'>
          <Button
            variant='primary'
            onClick={() => {
              const el = document.getElementById('latest-h2')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Shop all
          </Button>
        </div>
      </div>

      {product ? (
        <Link
          to={`/product/${product._id}`}
          aria-label={`${product.name} — view product`}
          className='block relative rounded-lg overflow-hidden aspect-[4/5] bg-bone-200 focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-4'
        >
          <img
            src={product.image}
            alt={product.name}
            className='absolute inset-0 w-full h-full object-cover'
            {...(lazyImages ? { loading: 'lazy' } : {})}
          />
          <div
            className='absolute left-4 right-4 bottom-4 grid grid-cols-[1fr_auto] gap-3 items-end rounded-lg p-4'
            style={{ background: 'rgba(251, 248, 242, 0.92)', backdropFilter: 'blur(6px)' }}
          >
            <div>
              <p className='t-eyebrow text-forest-800'>Featured</p>
              <p className='font-display text-xl text-forest-800'>{product.name}</p>
              <p className='text-xs text-ink-mute mt-1 [font-feature-settings:"tnum"]'>
                {product.rating} · {product.numReviews} reviews · In stock
              </p>
            </div>
            <p className='font-display text-xl text-forest-800 [font-feature-settings:"tnum"]'>
              ${product.price}
            </p>
          </div>
        </Link>
      ) : (
        <div
          aria-hidden='true'
          className='block rounded-lg overflow-hidden aspect-[4/5] bg-bone-200'
        />
      )}
    </section>
  )
}

export default Hero
