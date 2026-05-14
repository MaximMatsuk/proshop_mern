# Storefront Redesign — HomeScreen + ProductScreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести `/` (HomeScreen) и `/product/:id` (ProductScreen) к языку DESIGN.md — те же шрифты, цвета, отступы, что и в `FeatureListScreen.jsx`. Снять Bootstrap из публичной воронки.

**Architecture:** Подход A из спеки: чистая замена `.js` → `.jsx`, переиспользуемые примитивы (`ProductCard`, `Hero`, `ProductRail`, `Breadcrumb`, `Stars`), inline-сборки внутри экранов (паттерн Feature flags). Экраны рендерят собственный `<main>` и выносятся из-под `react-bootstrap Container` в `App.js`.

**Tech Stack:** React 16, React Router v5, классический Redux + thunk, Tailwind (custom tokens из `tailwind.config.js`), inline SVG в Lucide-style.

**Spec:** [`2026-05-14-storefront-redesign-design.md`](../specs/2026-05-14-storefront-redesign-design.md)

**Глобальные правила (DESIGN.md, повторяю для скорости):**
- Отступы только из шкалы `4/8/12/16/24/32/48/64/96` (`space-1` … `space-9`). Никаких `14/28/40/56`.
- Шрифт минимум 12 px (`text-xs`).
- Touch target ≥ 24×24.
- Focus → `focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2`.
- Disabled — через disabled-палитру `Button.jsx`, не `opacity-50`.
- Навигация → `<Link>`. Действие → `<button>`.
- Иконки `aria-hidden`, имя на родителе.
- Никаких эмодзи, юникода-как-иконок, `<Message>` (он рендерит bootstrap `<Alert>`).
- Тесты не добавляем автоматически (CLAUDE.md). После каждого блока пользователь делает визуальный чекпойнт.

**Глобальные команды для проверки в течение плана:**
- `cd frontend && npm run tailwind:build` — пересобрать generated.css после изменений в шаблонах (JIT-скан перечитывает `./src/**/*.{js,jsx}`). Запускать после крупных правок шаблонов.
- `cd frontend && npm start` — dev-сервер на `:3000` (нужен для визуальных чекпойнтов).
- `npm run dev` — backend + frontend параллельно.

---

## Block P1 — HomeScreen

### Task 1: Создать `Breadcrumb.jsx`

**Files:**
- Create: `frontend/src/components/Breadcrumb.jsx`

**Зачем:** Используется в обоих новых экранах (Home, Product) и потенциально в админских; выносим, чтобы не дублировать `<nav aria-label='Breadcrumb'><ol>`.

- [ ] **Step 1: Создать файл с контентом**

```jsx
// frontend/src/components/Breadcrumb.jsx
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
```

- [ ] **Step 2: Coммит**

```bash
git add frontend/src/components/Breadcrumb.jsx
git commit -m "feat(frontend): add Breadcrumb component for storefront redesign"
```

---

### Task 2: Создать `ProductCard.jsx`

**Files:**
- Create: `frontend/src/components/ProductCard.jsx`

**Зачем:** Единая карточка для grid (`size='md'`), rail (`size='sm'`) и hero caption (через `tone='caption'`). Заменяет `components/Product.js`.

- [ ] **Step 1: Создать файл**

```jsx
// frontend/src/components/ProductCard.jsx
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
```

- [ ] **Step 2: Коммит**

```bash
git add frontend/src/components/ProductCard.jsx
git commit -m "feat(frontend): add ProductCard primitive (md/sm sizes, out-of-stock)"
```

---

### Task 3: Создать `Hero.jsx`

**Files:**
- Create: `frontend/src/components/Hero.jsx`

**Зачем:** Editorial 1fr 1fr hero для главной (только в default-режиме). Каptioн-strip — единственное место glass.

- [ ] **Step 1: Создать файл**

```jsx
// frontend/src/components/Hero.jsx
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
```

> Прим. `backdrop-filter` через inline-стиль — Tailwind 3.4 поддерживает `backdrop-blur-[6px]`, но `rgba(…, 0.92)` через arbitrary class длиннее; inline-стиль читается чище и совпадает с DESIGN.md §6.

- [ ] **Step 2: Коммит**

```bash
git add frontend/src/components/Hero.jsx
git commit -m "feat(frontend): add editorial Hero for HomeScreen"
```

---

### Task 4: Создать `ProductRail.jsx`

**Files:**
- Create: `frontend/src/components/ProductRail.jsx`

**Зачем:** Горизонтальный scroll-snap rail для Top rated и Recently viewed. Заменяет `react-bootstrap Carousel`.

- [ ] **Step 1: Создать файл**

```jsx
// frontend/src/components/ProductRail.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from './ProductCard'
import { cn } from './cn'

/**
 * eyebrow: small uppercase label
 * heading: H2 in Cormorant
 * products: array
 * showMeta: pass-through to ProductCard
 * viewAll: { href, label } — optional inline link on the right
 * id: used for aria-labelledby on the section
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
```

- [ ] **Step 2: Коммит**

```bash
git add frontend/src/components/ProductRail.jsx
git commit -m "feat(frontend): add ProductRail (replaces react-bootstrap Carousel for top-rated/recently-viewed)"
```

---

### Task 5: Переписать `Paginate.js` → `Paginate.jsx`

**Files:**
- Create: `frontend/src/components/Paginate.jsx`
- Delete: `frontend/src/components/Paginate.js`

**Зачем:** Снимаем `react-bootstrap Pagination` + `react-router-bootstrap LinkContainer`, переписываем пилюлями в стиле DESIGN.md. Используется на главной И в `ProductListScreen.js` (последний оставляем без правок — он импортирует `from '../components/Paginate'`, расширение CRA подхватит автоматически).

- [ ] **Step 1: Создать `Paginate.jsx`**

```jsx
// frontend/src/components/Paginate.jsx
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
```

- [ ] **Step 2: Удалить старый `Paginate.js`**

Run:

```bash
git rm frontend/src/components/Paginate.js
```

- [ ] **Step 3: Убедиться, что импортеры всё ещё работают**

`ProductListScreen.js` импортирует `from '../components/Paginate'` без расширения. CRA-резолвер найдёт `.jsx` после удаления `.js`. Ничего больше менять не нужно.

Команда проверки:

```bash
grep -rn "from '.*Paginate" frontend/src/screens
```

Ожидается: 2 строки из `HomeScreen.js` (старый) и `ProductListScreen.js` — обе без расширения. Старый HomeScreen ещё ссылается на Paginate; он будет удалён в Task 7.

- [ ] **Step 4: Коммит**

```bash
git add frontend/src/components/Paginate.jsx
git commit -m "refactor(frontend): replace Bootstrap Pagination with pill-style Paginate.jsx"
```

---

### Task 6: Переписать `RecentlyViewed.js` → `RecentlyViewed.jsx`

**Files:**
- Create: `frontend/src/components/RecentlyViewed.jsx`
- Delete: `frontend/src/components/RecentlyViewed.js`

**Зачем:** Убираем inline-стили, переезжаем на `ProductRail`.

- [ ] **Step 1: Создать `RecentlyViewed.jsx`**

```jsx
// frontend/src/components/RecentlyViewed.jsx
import React from 'react'
import { ProductRail } from './ProductRail'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'

const RecentlyViewed = ({ excludeId }) => {
  const enabled = useFeatureFlag('recently_viewed')
  const { items } = useRecentlyViewed()

  if (!enabled) return null
  const visible = items.filter((p) => p._id !== excludeId)
  if (visible.length === 0) return null

  return (
    <ProductRail
      id='recently-viewed'
      eyebrow='For you'
      heading='Recently viewed'
      products={visible}
      showMeta={false}
      className='pt-8'
    />
  )
}

export default RecentlyViewed
```

- [ ] **Step 2: Удалить старый `RecentlyViewed.js`**

```bash
git rm frontend/src/components/RecentlyViewed.js
```

- [ ] **Step 3: Коммит**

```bash
git add frontend/src/components/RecentlyViewed.jsx
git commit -m "refactor(frontend): rewrite RecentlyViewed on ProductRail (drops inline styles)"
```

---

### Task 7: Создать `HomeScreen.jsx`, обновить `App.js`, удалить старое

**Files:**
- Create: `frontend/src/screens/HomeScreen.jsx`
- Modify: `frontend/src/App.js` — вынести 4 home route + product route на верхний уровень `<Switch>`
- Delete: `frontend/src/screens/HomeScreen.js`, `frontend/src/components/Product.js`, `frontend/src/components/ProductCarousel.js`

**Зачем:** Финальная сборка блока. Hero+rail+grid+pagination+recently-viewed; собственный `<main>` с `max-w-container px-6`. Старые файлы уходят.

- [ ] **Step 1: Создать `HomeScreen.jsx`**

```jsx
// frontend/src/screens/HomeScreen.jsx
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

  const totalLabel = products ? `${products.length} of ${products.length}` : '—'

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
```

- [ ] **Step 2: Удалить старые файлы**

```bash
git rm frontend/src/screens/HomeScreen.js
git rm frontend/src/components/Product.js
git rm frontend/src/components/ProductCarousel.js
```

- [ ] **Step 3: Обновить `App.js` — вынести 5 routes из-под `Container`**

Заменить блок `<Switch>` в `frontend/src/App.js` на:

```jsx
<Switch>
  <Route path='/admin/featurelist' exact component={FeatureListScreen} />
  <Route path='/' exact component={HomeScreen} />
  <Route path='/search/:keyword' exact component={HomeScreen} />
  <Route path='/page/:pageNumber' exact component={HomeScreen} />
  <Route path='/search/:keyword/page/:pageNumber' exact component={HomeScreen} />
  <Route path='/product/:id' component={ProductScreen} />
  <Route
    render={() => (
      <main id='main-content' tabIndex='-1' className='py-3 focus:outline-none'>
        <Container>
          <Route path='/order/:id' component={OrderScreen} />
          <Route path='/shipping' component={ShippingScreen} />
          <Route path='/payment' component={PaymentScreen} />
          <Route path='/placeorder' component={PlaceOrderScreen} />
          <Route path='/login' component={LoginScreen} />
          <Route path='/register' component={RegisterScreen} />
          <Route path='/profile' component={ProfileScreen} />
          <Route path='/cart/:id?' component={CartScreen} />
          <Route path='/admin/userlist' component={UserListScreen} />
          <Route path='/admin/user/:id/edit' component={UserEditScreen} />
          <Route path='/admin/productlist' component={ProductListScreen} exact />
          <Route path='/admin/productlist/:pageNumber' component={ProductListScreen} exact />
          <Route path='/admin/product/:id/edit' component={ProductEditScreen} />
          <Route path='/admin/orderlist' component={OrderListScreen} />
        </Container>
      </main>
    )}
  />
</Switch>
```

> Прим. `/product/:id` оставили вынесенным, но ProductScreen ещё старый — он не рендерит свой `<main>`. Это **временный disrepair** для одного блока: на ProductScreen в P1 не будет skip-link target и `<main>` landmark. Чекпойнт P1 принимает это (раскрашиваем main в P2). Если предпочтительнее — можно оставить product-route под Container до P2 (вернуть в Container, тогда P2 переместит его обратно). Решение: **выносим сразу, чтобы потом не дважды править App.js**, и фиксируем как known temporary.

- [ ] **Step 4: Пересобрать tailwind и проверить визуально**

```bash
cd frontend && npm run tailwind:build
```

Запустить dev-сервер (отдельный терминал):

```bash
cd frontend && npm start
```

Открыть `http://localhost:3000` и проверить:
- `/` — hero, top-rated rail, latest grid, pagination, recently viewed (если есть просмотры).
- `/page/2` — нет hero, есть «All products» H1, breadcrumb с Page 2.
- `/search/iphone` — нет hero, H1 «Results for "iphone"», есть Clear search.
- Любая ссылка на товар ведёт на `/product/:id` (рендерится старый ProductScreen — стилизация Bootstrap, но работает).
- Tab по странице — focus visible на каждом клик-таргете.
- Cart count в Header обновляется.

- [ ] **Step 5: Коммит**

```bash
git add frontend/src/screens/HomeScreen.jsx frontend/src/App.js
git rm --cached frontend/src/screens/HomeScreen.js frontend/src/components/Product.js frontend/src/components/ProductCarousel.js 2>/dev/null
git commit -m "feat(frontend): redesign HomeScreen with editorial hero + rail + grid (P1)"
```

> Если `git rm` уже выполнено на Step 2, обычный `git commit -am` достаточен. Команда выше — на случай если кто-то выполнял шаги без коммитов между ними.

---

### Task 8: P1 visual checkpoint — пауза для пользователя

**Зачем:** Per memory `feedback-block-by-block-review` — пауза перед P2.

- [ ] **Step 1: Сводка изменений P1**

Краткий пост в чат с:
- Что поменялось визуально: hero, rail (вместо carousel), сетка карточек, пагинация-пилюли, recently viewed без inline-стилей.
- Список путей для клика: `/`, `/page/2` (если ≥ 2 страниц), `/search/airpods`, открытие товара (старая верстка ProductScreen ожидаема).
- Известные ограничения: ProductScreen всё ещё Bootstrap (P2).

- [ ] **Step 2: Дождаться явного «ок» / «продолжай»**

Не начинать Task 9 до подтверждения.

---

## Block P2 — ProductScreen

### Task 9: Добавить `IconStar` и `IconStarHalf` в `Icons.jsx`

**Files:**
- Modify: `frontend/src/components/Icons.jsx`

**Зачем:** Нужны для `Stars.jsx` и `StarPicker` (форма отзыва). Lucide-style, stroke 1.4, viewBox 0 0 24 24.

- [ ] **Step 1: Добавить экспорты в конец `Icons.jsx`**

Открыть `frontend/src/components/Icons.jsx`, добавить после `IconLogo`:

```jsx
export const IconStar = ({ filled = false, ...p }) => (
  <svg
    width='14'
    height='14'
    viewBox='0 0 24 24'
    fill={filled ? 'currentColor' : 'none'}
    stroke='currentColor'
    strokeWidth='1.4'
    strokeLinejoin='round'
    aria-hidden='true'
    focusable='false'
    {...p}
  >
    <path d='M12 2.5l2.9 6.2 6.8.8-5 4.7 1.4 6.8L12 17.7 5.9 21l1.4-6.8-5-4.7 6.8-.8z' />
  </svg>
)

export const IconStarHalf = (p) => (
  <svg
    width='14'
    height='14'
    viewBox='0 0 24 24'
    aria-hidden='true'
    focusable='false'
    {...p}
  >
    <defs>
      <clipPath id='star-half-clip'>
        <rect x='0' y='0' width='12' height='24' />
      </clipPath>
    </defs>
    <path
      d='M12 2.5l2.9 6.2 6.8.8-5 4.7 1.4 6.8L12 17.7 5.9 21l1.4-6.8-5-4.7 6.8-.8z'
      fill='currentColor'
      stroke='currentColor'
      strokeWidth='1.4'
      strokeLinejoin='round'
      clipPath='url(#star-half-clip)'
    />
    <path
      d='M12 2.5l2.9 6.2 6.8.8-5 4.7 1.4 6.8L12 17.7 5.9 21l1.4-6.8-5-4.7 6.8-.8z'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.4'
      strokeLinejoin='round'
    />
  </svg>
)
```

> Прим. `clipPath` id уникален в пределах документа. Если в одном Stars-блоке несколько половинок, все они отклипаются одинаково — это ок. Если потребуются разные размеры одновременно (вряд ли) — можно вынести clipPath в один общий `<defs>` в Stars.

- [ ] **Step 2: Коммит**

```bash
git add frontend/src/components/Icons.jsx
git commit -m "feat(frontend): add IconStar and IconStarHalf to Icons inventory"
```

---

### Task 10: Создать `Stars.jsx`

**Files:**
- Create: `frontend/src/components/Stars.jsx`

**Зачем:** Заменяет `Rating.js` (Font Awesome). Используется в meta-row ProductScreen и в каждом ReviewItem.

- [ ] **Step 1: Создать файл**

```jsx
// frontend/src/components/Stars.jsx
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
```

- [ ] **Step 2: Коммит**

```bash
git add frontend/src/components/Stars.jsx
git commit -m "feat(frontend): add Stars component (Lucide-style, clay-500)"
```

---

### Task 11: Расширить `Form.jsx` — `TextArea` и `Select`

**Files:**
- Modify: `frontend/src/components/Form.jsx`

**Зачем:** Нужны для формы отзыва (`TextArea` для комментария, `Select` для qty в BuyBox).

- [ ] **Step 1: Добавить экспорты в конец `Form.jsx`**

Открыть `frontend/src/components/Form.jsx`, добавить после `IconButton`:

```jsx
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
```

- [ ] **Step 2: Коммит**

```bash
git add frontend/src/components/Form.jsx
git commit -m "feat(frontend): add TextArea and Select to Form primitives"
```

---

### Task 12: Создать `ProductScreen.jsx`, удалить старые `ProductScreen.js` и `Rating.js`

**Files:**
- Create: `frontend/src/screens/ProductScreen.jsx`
- Delete: `frontend/src/screens/ProductScreen.js`, `frontend/src/components/Rating.js`

**Зачем:** Финальная сборка P2. Editorial 1fr 1fr + Buy box + Reviews + ReviewForm + Recently viewed.

- [ ] **Step 1: Создать `ProductScreen.jsx`**

```jsx
// frontend/src/screens/ProductScreen.jsx
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
        <p className='font-display text-3xl text-forest-800 [font-feature-settings:"tnum"] m-0'>
          ${product.price}
        </p>
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
```

- [ ] **Step 2: Удалить старые файлы**

```bash
git rm frontend/src/screens/ProductScreen.js
git rm frontend/src/components/Rating.js
```

- [ ] **Step 3: Проверить отсутствие импортов `Rating`**

```bash
grep -rn "from '.*Rating'" frontend/src
grep -rn "import.*Rating" frontend/src
```

Ожидается: пусто. Если что-то найдено — заменить на `Stars`.

- [ ] **Step 4: Пересобрать tailwind и проверить визуально**

```bash
cd frontend && npm run tailwind:build
cd frontend && npm start
```

Открыть `http://localhost:3000` и проверить:
- `/` — главная всё ещё работает (P1 не задет).
- `/product/<id>` — editorial layout, sticky photo, buy box, reviews, recently viewed.
- Out-of-stock товар: `Add to cart` disabled, Status pill `critical`, qty-row скрыт.
- Не авторизован: вместо формы отзыва — «Sign in to leave a review» со ссылкой.
- Авторизован: форма работает, StarPicker реагирует на клик и стрелки.
- Submit ревью → success message появляется; обновлённый ревью попадает в список.
- `Tab`-проход по странице — focus visible везде.
- VoiceOver (Cmd+F5): «Rated 4.5 out of 5 stars, 12 reviews — link» в meta-row; «1 star, radio button, not checked» в StarPicker.

- [ ] **Step 5: Коммит**

```bash
git add frontend/src/screens/ProductScreen.jsx
git commit -m "feat(frontend): redesign ProductScreen with editorial 1fr 1fr + Stars (P2)"
```

---

### Task 13: P2 visual checkpoint + финальная зачистка

- [ ] **Step 1: Сводка изменений P2**

Краткий пост в чат:
- Что поменялось: editorial layout, sticky photo, новая Stars-компонента (clay-500), Buy box на bone-50 surface, ReviewForm с keyboard-accessible StarPicker.
- Список путей: `/product/<id>` для любого товара, попробовать в out-of-stock товаре, как авторизованный и не авторизованный.
- Удалено: `ProductScreen.js`, `Rating.js`, `HomeScreen.js`, `Product.js`, `ProductCarousel.js`, `Paginate.js` (`.js`), `RecentlyViewed.js`.

- [ ] **Step 2: Дождаться «ок»**

После подтверждения — план выполнен.

- [ ] **Step 3 (опционально, после ок): убедиться, что нет осиротевших импортов**

```bash
grep -rn "from 'react-bootstrap'" frontend/src/screens/HomeScreen.jsx frontend/src/screens/ProductScreen.jsx 2>/dev/null
grep -rn "ProductCarousel\|Rating\.js" frontend/src 2>/dev/null
```

Ожидается: пусто. Если что-то найдено — починить отдельным коммитом.

- [ ] **Step 4 (опционально): спросить пользователя, нужны ли тесты**

CLAUDE.md запрещает автоматически добавлять тесты. После завершения работы один раз спросить: «Добавить тесты для `ProductCard`, `Stars`, `StarPicker`?». Если «да» — отдельный план.

---

## Out of scope (повтор из спеки)

- Header / Footer / прочие экраны.
- Изменения backend API / Redux-слайсов.
- Категории / фильтры / brand-фильтры в breadcrumb.
- Автоматические тесты (по правилу CLAUDE.md).

## Известные временные состояния

- **После P1 Task 7, до P2 Task 12** — `/product/:id` route вынесен из-под `Container`, но старый `ProductScreen.js` ещё рендерит plain `<>` без своего `<main>`. Skip-link target будет вести на тег `<Header>`-внутренний `<a href='#main-content'>`, но `<main id='main-content'>` отсутствует — он появится только в P2. Это accepted gap длиной в один блок.

## Self-review notes

- Все имена методов / пропсов согласованы между tasks (например, `value` / `onChange` / `labelledBy` у `StarPicker`; `size` `'md' | 'sm'` у `ProductCard`).
- Шкала отступов соблюдена везде: `pt-6/pt-9`, `gap-7`, `gap-x-6 gap-y-7`, `p-4`, `p-5`, `p-6` — все на 4-px scale.
- Нет осиротевших импортов: `Paginate` и `RecentlyViewed` остаются доступными по тем же путям без расширения (CRA подхватывает `.jsx`).
- `ProductListScreen.js` (админский) использует `Paginate` — продолжит работать благодаря CRA-резолверу.
- `Meta` / `Loader` / `Footer` не трогаются.
- Feature flags `image_lazy_loading`, `recently_viewed`, `verified_purchase_badge` поведением не меняются — только перерисованы.
