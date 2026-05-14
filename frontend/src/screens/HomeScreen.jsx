import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { listProducts, listTopProducts } from '../actions/productActions'
import { Breadcrumb } from '../components/Breadcrumb'
import { Hero } from '../components/Hero'
import { ProductRail } from '../components/ProductRail'
import { ProductCard } from '../components/ProductCard'
import Paginate from '../components/Paginate'
import RecentlyViewed from '../components/RecentlyViewed'
import { Button } from '../components/Button'
import Meta from '../components/Meta'
import { cn } from '../components/cn'

const HomeScreen = ({ match }) => {
  const keyword = match.params.keyword || ''
  const pageNumber = Number(match.params.pageNumber) || 1
  const isCatalogueDefault = !keyword && pageNumber === 1

  const dispatch = useDispatch()

  const productList = useSelector((s) => s.productList)
  const { loading, error, products, page, pages } = productList

  const productTopRated = useSelector((s) => s.productTopRated)
  const {
    loading: loadingTop,
    error: errorTop,
    products: topProducts,
  } = productTopRated

  const retry = () => dispatch(listProducts(keyword, pageNumber))

  useEffect(() => {
    dispatch(listProducts(keyword, pageNumber))
  }, [dispatch, keyword, pageNumber])

  useEffect(() => {
    if (isCatalogueDefault) dispatch(listTopProducts())
  }, [dispatch, isCatalogueDefault])

  const featured = topProducts && topProducts.length > 0 ? topProducts[0] : null
  const railProducts =
    topProducts && topProducts.length > 1 ? topProducts.slice(1) : []

  const crumbs = keyword
    ? [
        { label: 'Home', href: '/' },
        { label: 'Search', href: '/' },
        { label: `"${keyword}"`, current: true },
      ]
    : pageNumber > 1
    ? [
        { label: 'Home', href: '/' },
        { label: `Page ${pageNumber}`, current: true },
      ]
    : [{ label: 'Home', current: true }]

  return (
    <main
      id='main-content'
      tabIndex='-1'
      className='min-h-screen bg-bone-100 text-ink focus:outline-none'
    >
      <Meta />
      <div className='max-w-container mx-auto px-6 pt-6 pb-9'>
        <Breadcrumb crumbs={crumbs} />

        {isCatalogueDefault && (
          <>
            <Hero product={featured} />
            {!loadingTop && !errorTop && railProducts.length > 0 && (
              <ProductRail
                id='top-rated'
                eyebrow='Top rated'
                heading='Quiet best-sellers'
                products={railProducts}
                className='pt-9'
              />
            )}
          </>
        )}

        <section
          aria-labelledby='latest-h2'
          className={cn(isCatalogueDefault && 'pt-9')}
        >
          <div className='flex items-end justify-between pb-5 flex-wrap gap-3'>
            <div>
              <p className='t-eyebrow'>
                {keyword ? 'Catalogue · Search' : 'Catalogue'}
              </p>
              <h2
                id='latest-h2'
                className={cn(
                  'font-display font-medium text-forest-800 mt-1.5',
                  isCatalogueDefault ? 'text-2xl' : 'text-4xl tracking-tight',
                )}
              >
                {keyword
                  ? `Results for "${keyword}"`
                  : pageNumber > 1
                  ? 'All products'
                  : 'Latest products'}
              </h2>
              {keyword && (
                <p className='max-w-prose text-md text-ink-soft leading-loose mt-4'>
                  {products && products.length > 0
                    ? `${products.length} ${products.length === 1 ? 'product matches' : 'products match'}.`
                    : ''}
                  <Link
                    to='/'
                    className='text-forest-700 border-b border-forest-700 ml-2 no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
                  >
                    Clear search
                  </Link>
                </p>
              )}
            </div>
            {products && (
              <p
                role='status'
                aria-live='polite'
                aria-atomic='true'
                className='text-xs text-ink-mute'
              >
                Showing {products.length} {pages > 1 ? `· Page ${page} of ${pages}` : ''}
              </p>
            )}
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <ErrorState error={error} onRetry={retry} />
          ) : !products || products.length === 0 ? (
            <EmptyState keyword={keyword} />
          ) : (
            <ProductGrid products={products} />
          )}

          <Paginate pages={pages} page={page} keyword={keyword} />
        </section>

        <RecentlyViewed excludeId={null} />

        <p
          role='status'
          aria-live='polite'
          aria-atomic='true'
          className='text-xs text-ink-mute mt-5 pt-5 border-t border-line-soft'
        >
          Synced from <span className='font-mono'>/api/products</span>
        </p>
      </div>
    </main>
  )
}

function ProductGrid({ products }) {
  return (
    <ul
      role='list'
      className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-7 list-none p-0 m-0'
    >
      {products.map((p) => (
        <li key={p._id}>
          <ProductCard product={p} size='md' />
        </li>
      ))}
    </ul>
  )
}

function SkeletonGrid() {
  const cells = Array.from({ length: 8 }, (_, i) => i)
  return (
    <ul
      role='list'
      aria-busy='true'
      className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-7 list-none p-0 m-0'
    >
      {cells.map((i) => (
        <li key={i}>
          <div className='aspect-[4/5] rounded-lg bg-bone-200' />
          <div className='h-4 rounded-sm bg-bone-200 mt-4 w-3/4' />
          <div className='h-3 rounded-sm bg-bone-200 mt-2 w-1/3' />
        </li>
      ))}
    </ul>
  )
}

function EmptyState({ keyword }) {
  return (
    <div role='status' className='py-9 px-5 text-center'>
      <p className='font-display italic text-xl text-forest-800 m-0'>
        {keyword ? 'Nothing matches that search.' : 'Nothing here yet.'}
      </p>
      <p className='text-sm text-ink-soft mt-2'>
        Try a different search term or{' '}
        <Link
          to='/'
          className='text-forest-700 border-b border-forest-700 no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'
        >
          clear filters
        </Link>
        .
      </p>
    </div>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <div
      role='alert'
      className='py-9 px-5 text-center border border-critical-100 bg-bone-50 rounded-lg'
    >
      <p className='font-display italic text-xl text-critical-700 m-0'>
        We couldn't load products right now.
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

export default HomeScreen
