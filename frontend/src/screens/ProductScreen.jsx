import React, { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  listProductDetails,
  createProductReview,
} from '../actions/productActions'
import { PRODUCT_CREATE_REVIEW_RESET } from '../constants/productConstants'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'

import { Breadcrumb } from '../components/Breadcrumb'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { Stars } from '../components/Stars'
import { TextArea, Select } from '../components/Form'
import { IconStar } from '../components/Icons'
import RecentlyViewed from '../components/RecentlyViewed'
import Meta from '../components/Meta'
import { cn } from '../components/cn'

const ProductScreen = ({ history, match }) => {
  const productId = match.params.id

  const [qty, setQty] = useState(1)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const dispatch = useDispatch()

  const productDetails = useSelector((s) => s.productDetails)
  const { loading, error, product } = productDetails

  const userLogin = useSelector((s) => s.userLogin)
  const { userInfo } = userLogin

  const productReviewCreate = useSelector((s) => s.productReviewCreate)
  const {
    success: successProductReview,
    loading: loadingProductReview,
    error: errorProductReview,
  } = productReviewCreate

  const recentlyViewedEnabled = useFeatureFlag('recently_viewed')
  const verifiedBadgeEnabled = useFeatureFlag('verified_purchase_badge')
  const { trackView } = useRecentlyViewed()

  const retry = useCallback(() => {
    dispatch(listProductDetails(productId))
  }, [dispatch, productId])

  useEffect(() => {
    if (successProductReview) {
      setRating(0)
      setComment('')
    }
    if (!product._id || product._id !== productId) {
      dispatch(listProductDetails(productId))
      dispatch({ type: PRODUCT_CREATE_REVIEW_RESET })
    }
  }, [dispatch, productId, successProductReview, product._id])

  useEffect(() => {
    if (
      recentlyViewedEnabled &&
      product &&
      product._id === productId
    ) {
      trackView(product)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentlyViewedEnabled, product._id, productId])

  const addToCartHandler = () => {
    history.push(`/cart/${productId}?qty=${qty}`)
  }

  const submitHandler = (e) => {
    e.preventDefault()
    dispatch(createProductReview(productId, { rating, comment }))
  }

  const productLoaded = product && product._id === productId && !loading
  const crumbs = [
    { label: 'Home', href: '/' },
    { label: 'Catalogue', href: '/' },
    {
      label: productLoaded ? product.name : '…',
      current: true,
    },
  ]

  return (
    <main
      id='main-content'
      tabIndex='-1'
      className='min-h-screen bg-bone-100 text-ink focus:outline-none'
    >
      {productLoaded && <Meta title={product.name} />}

      <div className='max-w-container mx-auto px-6 pt-6 pb-9'>
        <Breadcrumb crumbs={crumbs} />

        {loading ? (
          <DetailSkeleton />
        ) : error ? (
          <DetailErrorState error={error} onRetry={retry} />
        ) : (
          <>
            <section
              aria-labelledby='product-h1'
              className='grid grid-cols-1 md:grid-cols-2 gap-7 pb-9 border-b border-line-soft'
            >
              <div className='aspect-[4/5] rounded-lg overflow-hidden bg-bone-200 md:sticky md:top-[92px] md:self-start'>
                <img
                  src={product.image}
                  alt={product.name}
                  className='w-full h-full object-cover'
                />
              </div>

              <div className='space-y-5'>
                <header>
                  <p className='t-eyebrow'>
                    {product.category}
                    {product.brand ? ` · ${product.brand}` : ''}
                  </p>
                  <h1
                    id='product-h1'
                    className='font-display font-medium text-4xl md:text-5xl text-forest-800 tracking-tight mt-1.5'
                  >
                    {product.name}
                  </h1>
                  <p className='max-w-prose text-md text-ink-soft leading-loose mt-4'>
                    {product.description}
                  </p>
                </header>

                <div className='flex flex-wrap gap-x-5 gap-y-4 items-center pt-5 border-t border-line-soft text-sm text-ink-soft'>
                  <a
                    href='#reviews'
                    className='inline-flex items-center gap-2 no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
                  >
                    <Stars value={product.rating} />
                    <span className='border-b border-line text-ink-soft'>
                      {product.rating} · {product.numReviews} reviews
                    </span>
                  </a>
                  <Dot />
                  {product.countInStock > 0 ? (
                    <Badge tone='positive' dot>In stock</Badge>
                  ) : (
                    <Badge tone='critical' dot>Out of stock</Badge>
                  )}
                  <Dot />
                  <span>
                    Brand{' '}
                    <b className='text-forest-800 font-medium ml-1'>
                      {product.brand}
                    </b>
                  </span>
                </div>

                <BuyBox
                  product={product}
                  qty={qty}
                  setQty={setQty}
                  onAddToCart={addToCartHandler}
                />
              </div>
            </section>

            <Reviews
              reviews={product.reviews || []}
              userInfo={userInfo}
              verifiedBadgeEnabled={verifiedBadgeEnabled}
              rating={rating}
              setRating={setRating}
              comment={comment}
              setComment={setComment}
              onSubmit={submitHandler}
              successProductReview={successProductReview}
              loadingProductReview={loadingProductReview}
              errorProductReview={errorProductReview}
            />

            <RecentlyViewed excludeId={product._id} />
          </>
        )}
      </div>
    </main>
  )
}

function Dot() {
  return (
    <span
      aria-hidden='true'
      className='inline-block w-1 h-1 rounded-pill bg-ink-faint'
    />
  )
}

function BuyBox({ product, qty, setQty, onAddToCart }) {
  const outOfStock = product.countInStock === 0
  const qtyOptions = Array.from(
    { length: Math.max(product.countInStock, 0) },
    (_, i) => ({ value: i + 1, label: String(i + 1) }),
  )

  return (
    <div
      role='group'
      aria-labelledby='buy-box-heading'
      className='bg-bone-50 border border-line-soft rounded-lg p-5'
    >
      <h2 id='buy-box-heading' className='sr-only'>
        Purchase options
      </h2>
      <BuyRow label='Price'>
        <span className='font-display text-3xl text-forest-800 [font-feature-settings:"tnum"]'>
          ${product.price}
        </span>
      </BuyRow>
      <BuyRow label='Status'>
        {outOfStock ? (
          <Badge tone='critical' dot>Out of stock</Badge>
        ) : (
          <Badge tone='positive' dot>In stock</Badge>
        )}
      </BuyRow>
      {!outOfStock && (
        <BuyRow label='Quantity'>
          <Select
            name='qty'
            label='Quantity'
            hideLabel
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            options={qtyOptions}
            className='min-w-[88px]'
          />
        </BuyRow>
      )}
      <div className='pt-5'>
        <Button
          variant='primary'
          size='lg'
          className='w-full'
          onClick={onAddToCart}
          disabled={outOfStock}
        >
          Add to cart
        </Button>
      </div>
    </div>
  )
}

function BuyRow({ label, children }) {
  return (
    <div className='flex justify-between items-center gap-4 py-3 border-b border-line-soft last:border-b-0'>
      <span className='text-sm text-ink-mute font-medium'>{label}</span>
      <span className='text-sm text-ink [font-feature-settings:"tnum"]'>
        {children}
      </span>
    </div>
  )
}

function Reviews({
  reviews,
  userInfo,
  verifiedBadgeEnabled,
  rating,
  setRating,
  comment,
  setComment,
  onSubmit,
  successProductReview,
  loadingProductReview,
  errorProductReview,
}) {
  return (
    <section id='reviews' aria-labelledby='reviews-h2' className='pt-9'>
      <p className='t-eyebrow'>Customer feedback</p>
      <h2
        id='reviews-h2'
        className='font-display font-medium text-2xl text-forest-800 mt-1.5'
      >
        Reviews
        <span className='font-sans text-base text-ink-mute font-normal ml-2 [letter-spacing:0]'>
          · {reviews.length}
        </span>
      </h2>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-7 pt-6'>
        <div>
          {reviews.length === 0 ? (
            <p role='status' className='font-display italic text-xl text-forest-800 py-5'>
              No reviews yet.
            </p>
          ) : (
            reviews.map((r) => (
              <ReviewItem
                key={r._id}
                review={r}
                showVerified={verifiedBadgeEnabled}
              />
            ))
          )}
        </div>

        <div>
          <p className='t-eyebrow mb-4'>Share your view</p>
          {userInfo ? (
            <ReviewForm
              rating={rating}
              setRating={setRating}
              comment={comment}
              setComment={setComment}
              onSubmit={onSubmit}
              loadingProductReview={loadingProductReview}
              successProductReview={successProductReview}
              errorProductReview={errorProductReview}
            />
          ) : (
            <p
              role='status'
              className='font-display italic text-xl text-forest-800'
            >
              Sign in to leave a review.
              <Link
                to='/login'
                className='not-italic font-sans text-base text-forest-700 border-b border-forest-700 ml-2 no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function ReviewItem({ review, showVerified }) {
  return (
    <article
      aria-labelledby={`r-${review._id}-name`}
      className='pb-5 mb-5 border-b border-line-soft last:border-b-0 last:mb-0'
    >
      <div className='flex items-center gap-3 flex-wrap'>
        <span
          id={`r-${review._id}-name`}
          className='text-sm font-medium text-forest-800'
        >
          {review.name}
        </span>
        {showVerified && review.verified && (
          <Badge tone='info' dot>Verified purchase</Badge>
        )}
        <Stars value={review.rating} size='sm' />
      </div>
      <time
        dateTime={review.createdAt}
        className='block text-xs text-ink-mute mt-1 [font-feature-settings:"tnum"]'
      >
        {review.createdAt ? review.createdAt.substring(0, 10) : ''}
      </time>
      <p className='text-base text-ink mt-3 leading-relaxed'>{review.comment}</p>
    </article>
  )
}

function ReviewForm({
  rating,
  setRating,
  comment,
  setComment,
  onSubmit,
  loadingProductReview,
  successProductReview,
  errorProductReview,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className='bg-bone-50 border border-line-soft rounded-lg p-6'
    >
      {successProductReview && (
        <div
          role='status'
          className='font-display italic text-xl text-positive-700 mb-5'
        >
          Review submitted successfully.
        </div>
      )}
      {errorProductReview && (
        <div
          role='alert'
          className='font-display italic text-xl text-critical-700 mb-5'
        >
          {errorProductReview}
        </div>
      )}

      <span
        id='rating-picker-label'
        className='t-eyebrow block mb-2'
      >
        Rating
      </span>
      <StarPicker
        labelledBy='rating-picker-label'
        value={Number(rating)}
        onChange={setRating}
      />

      <div className='mt-5'>
        <TextArea
          name='comment'
          label='Comment'
          placeholder="What stood out? What didn't?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          rows={4}
        />
      </div>

      <Button
        type='submit'
        variant='primary'
        className='mt-5'
        disabled={loadingProductReview || !rating || !comment}
      >
        {loadingProductReview ? 'Submitting…' : 'Submit review'}
      </Button>
    </form>
  )
}

function StarPicker({ value, onChange, labelledBy }) {
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(Math.min(5, (Number(value) || 0) + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(Math.max(1, (Number(value) || 1) - 1))
    }
  }

  return (
    <span
      role='radiogroup'
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className='inline-flex gap-1 p-2 bg-bone-50 border border-line rounded-pill'
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value
        return (
          <button
            key={n}
            type='button'
            role='radio'
            aria-checked={n === value}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange(n)}
            tabIndex={n === (value || 1) ? 0 : -1}
            className={cn(
              'inline-grid place-items-center w-6 h-6 rounded-full bg-transparent border-0 cursor-pointer',
              'transition-colors duration-fast ease-out',
              'focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2',
              active ? 'text-clay-500' : 'text-ink-faint hover:text-clay-500',
            )}
          >
            <IconStar filled={active} width={22} height={22} />
          </button>
        )
      })}
    </span>
  )
}

function DetailSkeleton() {
  return (
    <div
      aria-busy='true'
      className='grid grid-cols-1 md:grid-cols-2 gap-7 pb-9 border-b border-line-soft'
    >
      <div className='aspect-[4/5] rounded-lg bg-bone-200' />
      <div className='space-y-5'>
        <div>
          <div className='h-3 w-32 rounded-sm bg-bone-200' />
          <div className='h-12 w-3/4 rounded-sm bg-bone-200 mt-4' />
          <div className='h-4 w-full rounded-sm bg-bone-200 mt-4' />
          <div className='h-4 w-5/6 rounded-sm bg-bone-200 mt-2' />
        </div>
        <div className='h-32 rounded-lg bg-bone-200' />
      </div>
    </div>
  )
}

function DetailErrorState({ error, onRetry }) {
  return (
    <div
      role='alert'
      className='py-9 px-5 text-center border border-critical-100 bg-bone-50 rounded-lg'
    >
      <p className='font-display italic text-xl text-critical-700 m-0'>
        We couldn't load this product.
      </p>
      <p className='text-sm text-ink-soft mt-2 mb-5'>
        {typeof error === 'string' ? error : 'Network or server hiccup. Try refreshing.'}
      </p>
      <Button variant='ghost' size='sm' onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

export default ProductScreen
