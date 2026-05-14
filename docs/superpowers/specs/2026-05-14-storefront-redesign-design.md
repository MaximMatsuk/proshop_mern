# Storefront Redesign — HomeScreen + ProductScreen

**Дата:** 2026-05-14
**Скоуп:** Редизайн `HomeScreen` (включая зависимые `ProductCarousel`, `RecentlyViewed`, `Paginate`, карточку товара) и `ProductScreen` под эстетику DESIGN.md.
**Эталон:** `frontend/src/screens/FeatureListScreen.jsx` + `components/{Header,Button,Form,Badge,Icons,cn}.jsx`. Все правила — `DESIGN.md` (особенно §5 spacing, §7 components, §9 accessibility).
**Брейнсторминг проведён:** 2026-05-14, видимые промежуточные мокапы — `.superpowers/brainstorm/57574-1778750313/content/{home-block1-v2,spacing-audit,product-block2}.html`.

## 1. Цель

Главная и страница товара пока на Bootstrap (`Row/Col/Card/Carousel/Pagination/ListGroup`) и Font Awesome — разнобой с уже редизайненным `FeatureListScreen`. Эта спека приводит обе публичные страницы к единому языку: cream/forest палитра, Cormorant Garamond + DM Sans, наши примитивы (`Button`, `Badge`, `TextInput`, `Toggle`), WCAG 2.1/2.2 AA. После редизайна на Bootstrap в публичной воронке не остаётся ни одного экрана.

## 2. Контекст и решения

Зафиксировано в брейнсторминге:

| Вопрос | Решение |
|---|---|
| Скоуп редизайна | Home + ProductScreen в одном спеке, **выполнение блоками** (P1 = Home, P2 = ProductScreen) — каждый блок завершается визуальным чекпойнтом перед следующим |
| Направление hero | Editorial с одним продуктом-героем (top-rated #1): eyebrow + Cormorant H1 «Considered things, well kept.» + lede + photo 4:5 с caption-strip (единственное место, где DESIGN.md §6 разрешает glass) |
| Структура главной | Hero → Top rated rail → Latest grid → Pagination → Recently viewed |
| Состояние search / `page > 1` | Hero и Top rated rail скрыты. Сверху breadcrumb (Home · Search · "query"), eyebrow «Catalogue · Search», Cormorant H1 «Results for …» / «All products», lede с count и Clear search. |
| Карточка товара | Голая editorial-карточка: фото 4:5 (`radius-lg`), под ним имя (Cormorant `text-xl`), цена (Cormorant `text-lg`, `tnum`), мета `4.5 · 12 reviews` (12 px `ink-mute`). Без `bone-50`-подложки. Out-of-stock = `<Badge tone='critical' dot>Sold out</Badge>` + dim фото. Звёзд на карточке нет. Без quick-add. |
| Композиция ProductScreen | Editorial 1fr 1fr: sticky-фото слева, info-колонка справа (eyebrow + H1 + lede + meta-row + price/qty/Add-to-cart в `bone-50` buy-box). Reviews — 1fr 1fr под продуктом: список слева, форма справа. |
| Подход к реализации | A — чистая замена `.js` → `.jsx`, переиспользуемые примитивы (`ProductCard`, `Hero`, `ProductRail`, `Breadcrumb`, `Stars`). Старые файлы удаляются в конце каждого блока. |
| `App.js` | Маршруты `/`, `/search/:keyword`, `/page/:n`, `/search/:keyword/page/:n`, `/product/:id` выносим из-под общего `<main><Container>` на верхний уровень `<Switch>` (как `/admin/featurelist`). Экраны сами рендерят `<main id='main-content'>` и `max-w-container`. |
| Feature flags | Сохраняем поведение: `image_lazy_loading`, `recently_viewed`, `verified_purchase_badge` продолжают работать. |
| Тесты | Не добавляем автоматически (правило CLAUDE.md). После реализации спросить пользователя, нужны ли. |

## 3. Архитектура

```
App.js
├─ <Header /> (sticky, общий, без правок)
├─ <Switch>
│   ├─ /admin/featurelist                                  ← без изменений
│   ├─ /                          → HomeScreen.jsx ⬅ NEW
│   ├─ /search/:keyword           → HomeScreen.jsx
│   ├─ /page/:pageNumber          → HomeScreen.jsx
│   ├─ /search/:keyword/page/:pn  → HomeScreen.jsx
│   ├─ /product/:id               → ProductScreen.jsx ⬅ NEW
│   └─ <Route render={() => <main><Container>{остальные обычные экраны}</Container></main>} />  ← без изменений
└─ <Footer />
```

Все остальные экраны (cart, login, profile, admin/userlist и т.д.) остаются под `<main><Container>` — не трогаем.

## 4. Дизайн-система — что переиспользуем без правок

| Компонент | Файл | Что используем |
|---|---|---|
| `<Header />` | `components/Header.jsx` | Sticky 76px, search-form, cart, user/admin меню. Skip-link уже внутри — **не дублируем**. |
| `<Button variant size icon>` | `components/Button.jsx` | `primary`/`secondary`/`ghost`/`danger` × `sm`/`md`/`lg`. Disabled-стейт уже корректный (DESIGN.md §9.3). |
| `<Badge tone dot>` | `components/Badge.jsx` | `positive`/`caution`/`critical`/`info`/`brand`/`neutral`. Используем для In stock / Out of stock / Verified purchase. |
| `<TextInput label hideLabel icon>` | `components/Form.jsx` | На главной не нужен (поиск в Header). Понадобится только в форме отзыва (но там textarea — см. §6.5). |
| `<Toggle>` | `components/Form.jsx` | Не нужен на главной/деталях. |
| `cn(...)` | `components/cn.js` | Класс-склейка везде. |
| Icons | `components/Icons.jsx` | `IconSearch`, `IconCart`, `IconChevronRight`, `IconChevron`. **Добавляем** новые (см. §6.7). |
| Tokens | `tailwind.config.js` + `tailwind.input.css` | Все цвета, отступы, радиусы, тени, font-family — без правок. |
| `useRecentlyViewed`, `useFeatureFlag` | `hooks/` | Без правок. |

## 5. Шкала отступов (DESIGN.md §5) — единственная разрешённая

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96` (px) → `space-1 … space-9`.

Никаких значений вне шкалы (`14`, `28`, `40`, `56`, `6`) — это правило обязательно как для нового кода, так и для всех новых классов/inline-стилей.

**Ключевые значения для этой спеки:**
- Container: `max-w-container` (1240) + `px-6` (32 px).
- Inline default gap: `space-4` (16).
- Section gutter: `space-6` (32).
- **Между большими секциями: `space-9` (96).** Между «routine» секциями: `space-8` (64).
- Component padding: `space-5` (24) на хотя бы одной оси.
- Hero column gap: `space-7` (48).
- Grid карточек: `gap-x-6` (32) × `gap-y-7` (48).

## 6. P1 — HomeScreen redesign

### 6.1. Файлы блока

| Действие | Файл |
|---|---|
| **NEW** | `frontend/src/screens/HomeScreen.jsx` |
| **NEW** | `frontend/src/components/Hero.jsx` |
| **NEW** | `frontend/src/components/ProductCard.jsx` |
| **NEW** | `frontend/src/components/ProductRail.jsx` |
| **NEW** | `frontend/src/components/Breadcrumb.jsx` |
| **REWRITE** | `frontend/src/components/Paginate.jsx` (заменяет `Paginate.js`) |
| **REWRITE** | `frontend/src/components/RecentlyViewed.jsx` (заменяет `RecentlyViewed.js`) |
| **MODIFY** | `frontend/src/App.js` — вынести 4 home-route + product-route на верхний уровень `<Switch>` |
| **MODIFY** | `frontend/src/components/Icons.jsx` — при необходимости добавить иконку для стрелки «back» в пагинации (см. §6.4) |
| **DELETE** (в конце блока) | `frontend/src/screens/HomeScreen.js`, `frontend/src/components/Product.js`, `frontend/src/components/ProductCarousel.js`, `frontend/src/components/Paginate.js`, `frontend/src/components/RecentlyViewed.js` |

### 6.2. `HomeScreen.jsx` — структура

```jsx
<main id='main-content' tabIndex='-1' className='focus:outline-none'>
  <div className='max-w-container mx-auto px-6 pt-6 pb-9'>
    <Breadcrumb crumbs={…} />                        {/* Home, или Home · Search · "kw" */}

    {isCatalogueDefault ? (
      <>
        <Hero product={featuredTopRated} />          {/* §6.3 */}
        <ProductRail
          ariaLabel='Top rated products'
          eyebrow='Top rated'
          heading='Quiet best-sellers'
          products={otherTopRated}
        />
      </>
    ) : null}

    <section aria-labelledby='latest-h2' className={isCatalogueDefault ? 'pt-9' : ''}>
      <div className='flex items-end justify-between pb-5'>
        <div>
          <p className='t-eyebrow'>{isCatalogueDefault ? 'Catalogue' : 'Catalogue · Search'}</p>
          <h2 id='latest-h2' className='font-display font-medium text-2xl text-forest-800 mt-1.5'>
            {isCatalogueDefault ? 'Latest products' : `Results for "${keyword}"`}
          </h2>
        </div>
        <p role='status' aria-live='polite' aria-atomic='true' className='text-xs text-ink-mute'>
          Showing {products.length} of {total} · Page {page}
        </p>
      </div>

      {loading ? <SkeletonGrid /> :
       error ? <ErrorState error={error} onRetry={retry} /> :
       products.length === 0 ? <EmptyState /> :
       <ProductGrid products={products} />}

      <Paginate pages={pages} page={page} keyword={keyword} />
    </section>

    <RecentlyViewed excludeId={null} />              {/* §6.6 */}

    <p role='status' aria-live='polite' aria-atomic='true' className='text-xs text-ink-mute mt-5'>
      Synced from <span className='font-mono'>/api/products</span>
    </p>
  </div>
</main>
```

`isCatalogueDefault = !keyword && pageNumber === 1` — только в этом случае показываем hero и top-rated rail. На search-выдаче и `page > 1` они скрыты.

### 6.3. `Hero.jsx`

```
<section aria-labelledby='hero-h1' className='grid grid-cols-1 md:grid-cols-2 gap-7 items-center pb-9'>
  <div>
    <p className='t-eyebrow'>Top rated · This week</p>
    <h1 id='hero-h1' className='font-display font-medium text-4xl md:text-5xl text-forest-800 tracking-tight mt-1.5'>
      Considered things, well kept.
    </h1>
    <p className='max-w-prose text-md text-ink-soft leading-loose mt-4'>
      Speakers, phones, cameras — chosen one at a time and shipped flat. The shop is small on purpose; what's listed is what's stocked.
    </p>
    <div className='mt-6 inline-flex gap-3'>
      <Button variant='primary' as={Link} to='#latest-h2'>Shop all</Button>
      <Button variant='ghost' onClick={…}>What we choose</Button>
    </div>
  </div>
  <Link to={`/product/${product._id}`} className='block relative rounded-lg overflow-hidden aspect-[4/5] bg-bone-200' aria-label={`${product.name} — view product`}>
    <img src={product.image} alt={product.name} className='absolute inset-0 w-full h-full object-cover' />
    <div className='absolute left-4 right-4 bottom-4 grid grid-cols-[1fr_auto] gap-3 items-end bg-bone-50/[0.92] backdrop-blur-[6px] rounded-lg p-4'>
      <div>
        <p className='t-eyebrow text-forest-800'>Featured</p>
        <p className='font-display text-xl text-forest-800'>{product.name}</p>
        <p className='text-xs text-ink-mute mt-1 [font-feature-settings:'tnum']'>{product.rating} · {product.numReviews} reviews · In stock</p>
      </div>
      <p className='font-display text-xl text-forest-800 [font-feature-settings:'tnum']'>${product.price}</p>
    </div>
  </Link>
</section>
```

- Hero — единственное место, где разрешён glass (DESIGN.md §6). Не реплицировать.
- `product` для hero = первый из top-rated (тот же thunk `listTopProducts`).
- Caption-strip имеет `padding: 16` (`p-4`) и **внешние отступы тоже `16` (`left-4 right-4 bottom-4`)** — всё на шкале. Никаких 14 px.

### 6.4. `ProductCard.jsx` — единая карточка для всех мест

API:

```jsx
<ProductCard product={…} size='md' | 'sm' />
```

| `size` | Где используется | Имя | Цена | Мета |
|---|---|---|---|---|
| `md` | Latest grid | `font-display text-xl` | `font-display text-lg` | `text-xs text-ink-mute` |
| `sm` | Top rated rail, Recently viewed | `font-display text-lg` | `font-display text-base` | `text-xs text-ink-mute` (только в rail; в recently — без меты, как в текущей реализации) |

Карточка целиком — `<Link to={`/product/${product._id}`}>` с `focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-lg`. Внутри:

```
<div className='aspect-[4/5] rounded-lg bg-bone-200 overflow-hidden transition-colors duration-slow ease-out group-hover:bg-bone-300'>
  <img src={product.image} alt={product.name} className='w-full h-full object-cover' loading={lazyImages ? 'lazy' : 'eager'} />
</div>
<p className='font-display text-{xl|lg} text-forest-800 mt-4 leading-snug'>{product.name}</p>
<p className='font-display text-{lg|base} text-forest-800 [font-feature-settings:'tnum']'>${product.price}</p>
{showMeta && (
  <p className='text-xs text-ink-mute mt-1.5 [font-feature-settings:'tnum']'>
    {product.rating} · {product.numReviews} reviews
  </p>
)}
{outOfStock && (
  <Badge tone='critical' dot className='mt-1.5'>Sold out</Badge>
)}
```

Out-of-stock = `product.countInStock === 0`: фото с `opacity-55`, имя/цена `text-ink-mute`, badge `Sold out`.

### 6.5. `ProductRail.jsx` — горизонтальный rail (замена `ProductCarousel.js`)

```jsx
<section aria-labelledby={`${id}-h2`} className='pt-9'>
  <div className='flex items-end justify-between pb-5'>
    <div>
      <p className='t-eyebrow'>{eyebrow}</p>
      <h2 id={`${id}-h2`} className='font-display font-medium text-2xl text-forest-800 mt-1.5'>{heading}</h2>
    </div>
    {viewAllHref && <Link to={viewAllHref} className='text-sm text-forest-700 border-b border-forest-700 hover:no-underline'>{viewAllLabel} →</Link>}
  </div>
  <ul role='list' className='grid grid-flow-col auto-cols-[220px] gap-5 overflow-x-auto pb-2 snap-x snap-mandatory'>
    {products.map(p => (
      <li key={p._id} className='snap-start'>
        <ProductCard product={p} size='sm' />
      </li>
    ))}
  </ul>
</section>
```

Слайды (`react-bootstrap` Carousel + auto-rotate + dots) **уходят** — это не slideshow, а scroll-snap rail. Top-rated #1 уже использован в Hero, остальные top-rated показываются в rail.

### 6.6. `RecentlyViewed.jsx` (rewrite)

Та же логика что и сейчас (читает из `useRecentlyViewed`, рендерит только при флаге `recently_viewed`, фильтрует по `excludeId`), но рендер через `<ProductRail eyebrow='For you' heading='Recently viewed' products={visible} />`. Никаких inline-стилей.

### 6.7. `Paginate.jsx` (rewrite — замена `Paginate.js`)

Полностью отказываемся от `react-bootstrap Pagination` и `react-router-bootstrap LinkContainer`.

```jsx
<nav aria-label='Pagination' className='flex justify-center gap-1 pt-6 pb-2'>
  {prevPage && <Link to={hrefFor(prevPage)} aria-label='Previous page' className='page-pill'><IconChevronRight className='rotate-180' /></Link>}
  {!prevPage && <span aria-label='Previous page' aria-disabled='true' className='page-pill page-pill--disabled'><IconChevronRight className='rotate-180' /></span>}
  {pageList.map(n => (
    <Link key={n} to={hrefFor(n)} aria-current={n === page ? 'page' : undefined} className={cn('page-pill', n === page && 'page-pill--active')}>{n}</Link>
  ))}
  {nextPage && <Link to={hrefFor(nextPage)} aria-label='Next page' className='page-pill'><IconChevronRight /></Link>}
</nav>
```

`page-pill` — не отдельный css-класс, а tailwind-цепочка, переиспользуемая через локальную константу или `cn(...)` хелпер внутри `Paginate.jsx`. Базовые классы: `inline-grid place-items-center w-9 h-9 rounded-pill border border-line text-ink-soft hover:bg-bone-200 focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2`. Active добавляет: `bg-forest-700 text-bone-50 border-forest-700`. Disabled добавляет: `text-ink-faint border-line-soft cursor-not-allowed`.

Пропсы такие же: `pages`, `page`, `keyword`, `isAdmin` (остаётся для `ProductListScreen.js`, который продолжает им пользоваться без изменений).

`IconChevronRight` уже есть в `Icons.jsx` — стрелка «back» = тот же чеврон с `className='rotate-180'`. **Не** добавляем новый `IconChevronLeft`.

### 6.8. Состояния главной

`SkeletonGrid`, `ErrorState`, `EmptyState`, `ProductGrid` — локальные функции внутри `HomeScreen.jsx` (паттерн `Stat`/`Tab`/`FlagCard` в `FeatureListScreen.jsx`), не отдельные модули.

- **Loading**: `aria-busy={true}` на контейнере списка + `SkeletonGrid` — 4×8 (md×lg) placeholder'ов 4:5 + два прямоугольника текста. Без `<Loader>` (он spinner — слишком резко).
- **Empty (search ничего не нашёл)**: `<div role='status' className='py-9 px-5 text-center'>` с `font-display italic text-xl text-forest-800` («Nothing here yet.») и подсказкой `text-sm text-ink-soft` («Try a different search term or clear filters.»).
- **Error**: `<div role='alert' className='py-9 px-5 text-center'>` с `font-display italic text-xl text-critical-700` («We couldn't load products right now.») + `text-sm text-ink-soft` + `<Button variant='ghost' size='sm' onClick={retry}>Retry</Button>`.
- **No `<Message>`** на этом экране — `react-bootstrap Alert` отрисует bootstrap-стили, что выпадает из языка.

### 6.9. Аккуратные точки

- `RecentlyViewed` фильтрует `_id !== excludeId` — на главной `excludeId={null}`, так что показывается всё. Если пользователь только что зашёл и список пуст — компонент возвращает `null` (как сейчас).
- `Hero` рендерится только если top-rated thunk ответил и есть `products[0]`. До этого — пустой блок 4:5 placeholder (того же aspect-ratio, чтобы не было layout-shift) + skeleton текста справа.
- `keyword` берётся из `match.params.keyword` (React Router v5).

## 7. P2 — ProductScreen redesign

### 7.1. Файлы блока

| Действие | Файл |
|---|---|
| **NEW** | `frontend/src/screens/ProductScreen.jsx` |
| **NEW** | `frontend/src/components/Stars.jsx` |
| **MODIFY** | `frontend/src/components/Icons.jsx` — добавить `IconStar`, `IconStarHalf` (Lucide-style, stroke 1.4, viewBox `0 0 24 24`, `aria-hidden focusable=false`) |
| **MODIFY** | `frontend/src/components/Form.jsx` — добавить `<TextArea label hideLabel id name …>` и `<Select label hideLabel id name options …>` по контракту существующего `<TextInput>` (auto-id, `t-eyebrow` label, `bg-bone-50 border-line rounded-pill`/`rounded-lg`, focus → `border-forest-700`) |
| **MODIFY** | `frontend/src/App.js` — Route `/product/:id` уже вынесен в P1 (общая правка вместе с home-routes) |
| **DELETE** (в конце блока) | `frontend/src/screens/ProductScreen.js`, `frontend/src/components/Rating.js` (после миграции — других использований нет) |

### 7.2. `ProductScreen.jsx` — структура

```jsx
<main id='main-content' tabIndex='-1' className='focus:outline-none'>
  <div className='max-w-container mx-auto px-6 pt-6 pb-9'>
    <Breadcrumb crumbs={[{label:'Home', href:'/'}, {label:'Catalogue', href:'/'}, {label: product.name, current: true}]} />

    {loading ? <ProductDetailSkeleton /> :
     error ? <DetailErrorState error={error} onRetry={retry} /> :
     <>
      <section aria-labelledby='product-h1' className='grid grid-cols-1 md:grid-cols-2 gap-7 pb-9 border-b border-line-soft'>
        <Link to={…media…} className='block aspect-[4/5] rounded-lg overflow-hidden bg-bone-200 md:sticky md:top-[92px] md:self-start'>
          <img src={product.image} alt={product.name} className='w-full h-full object-cover' />
        </Link>

        <div className='space-y-5'>
          <header>
            <p className='t-eyebrow'>{product.category} · {product.brand}</p>
            <h1 id='product-h1' className='font-display font-medium text-4xl md:text-5xl text-forest-800 tracking-tight mt-1.5'>{product.name}</h1>
            <p className='max-w-prose text-md text-ink-soft leading-loose mt-4'>{product.description}</p>
          </header>

          <div className='flex flex-wrap gap-x-5 gap-y-4 items-center pt-5 border-t border-line-soft text-sm text-ink-soft'>
            <a href='#reviews' className='inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2 rounded-sm'>
              <Stars value={product.rating} />
              <span className='border-b border-line'>{product.rating} · {product.numReviews} reviews</span>
            </a>
            <span className='inline-block w-1 h-1 rounded-pill bg-ink-faint' aria-hidden='true' />
            {product.countInStock > 0
              ? <Badge tone='positive' dot>In stock</Badge>
              : <Badge tone='critical' dot>Out of stock</Badge>}
            <span className='inline-block w-1 h-1 rounded-pill bg-ink-faint' aria-hidden='true' />
            <span>Brand <b className='text-forest-800 font-medium ml-1'>{product.brand}</b></span>
          </div>

          <BuyBox product={product} qty={qty} setQty={setQty} onAddToCart={addToCartHandler} />
        </div>
      </section>

      <Reviews
        productId={product._id}
        reviews={product.reviews}
        userInfo={userInfo}
        verifiedBadgeEnabled={verifiedBadgeEnabled}
        successProductReview={successProductReview}
        loadingProductReview={loadingProductReview}
        errorProductReview={errorProductReview}
        rating={rating} setRating={setRating}
        comment={comment} setComment={setComment}
        onSubmit={submitHandler}
      />

      <RecentlyViewed excludeId={product._id} />
     </>}
  </div>
</main>
```

`BuyBox`, `Reviews`, `ReviewItem`, `ReviewForm`, `StarPicker`, `ProductDetailSkeleton`, `DetailErrorState` — локальные `function` внутри файла экрана (паттерн `Stat`/`Tab`/`FlagCard` в `FeatureListScreen.jsx`), не отдельные модули.

### 7.3. `BuyBox` (inline)

```jsx
<div role='group' aria-labelledby='buy-box-heading' className='bg-bone-50 border border-line-soft rounded-lg p-5'>
  <h2 id='buy-box-heading' className='sr-only'>Purchase options</h2>
  <Row label='Price'>
    <p className='font-display text-3xl text-forest-800 [font-feature-settings:'tnum']'>${product.price}</p>
  </Row>
  <Row label='Status'>
    {product.countInStock > 0
      ? <Badge tone='positive' dot>In stock</Badge>
      : <Badge tone='critical' dot>Out of stock</Badge>}
  </Row>
  {product.countInStock > 0 && (
    <Row label='Quantity'>
      <Select
        name='qty' label='Quantity' hideLabel
        value={qty} onChange={e => setQty(e.target.value)}
        options={Array.from({length: product.countInStock}, (_, i) => ({value: i+1, label: String(i+1)}))}
      />
    </Row>
  )}
  <div className='pt-5'>
    <Button variant='primary' size='lg' className='w-full' onClick={onAddToCart} disabled={product.countInStock === 0}>
      Add to cart
    </Button>
  </div>
</div>
```

`Row` — локальный helper: `<div className='flex justify-between items-center py-3 border-b border-line-soft last:border-b-0'>`.

### 7.4. `Reviews` (inline)

```jsx
<section id='reviews' aria-labelledby='reviews-h2' className='pt-9'>
  <p className='t-eyebrow'>Customer feedback</p>
  <h2 id='reviews-h2' className='font-display font-medium text-2xl text-forest-800 mt-1.5'>
    Reviews <span className='font-sans text-base text-ink-mute font-normal ml-2'>· {reviews.length}</span>
  </h2>
  <div className='grid grid-cols-1 md:grid-cols-2 gap-7 pt-6'>
    <div>
      {reviews.length === 0
        ? <p role='status' className='font-display italic text-xl text-forest-800 py-5'>No reviews yet.</p>
        : reviews.map(r => <ReviewItem key={r._id} review={r} showVerified={verifiedBadgeEnabled} />)}
    </div>
    <div>
      <p className='t-eyebrow mb-4'>Share your view</p>
      {userInfo
        ? <ReviewForm … />
        : <p role='status' className='font-display italic text-xl text-forest-800'>
            Sign in to leave a review. <Link to='/login' className='text-forest-700 border-b border-forest-700 not-italic font-sans text-base ml-2'>Sign in</Link>
          </p>}
    </div>
  </div>
</section>
```

`ReviewItem` — `<article className='pb-5 mb-5 border-b border-line-soft last:border-b-0'>`. Внутри: head-row с именем + (опционально) `<Badge tone='info' dot>Verified purchase</Badge>` + `<Stars value={review.rating} />`; `<time dateTime={review.createdAt}>{review.createdAt.substring(0,10)}</time>` в `text-xs text-ink-mute mt-1`; `<p className='text-base text-ink mt-3 leading-relaxed'>{review.comment}</p>`.

### 7.5. `ReviewForm` (inline)

```jsx
<form onSubmit={onSubmit} className='bg-bone-50 border border-line-soft rounded-lg p-6'>
  {successProductReview && <div role='status' className='font-display italic text-xl text-positive-700 mb-5'>Review submitted successfully.</div>}
  {errorProductReview && <div role='alert' className='font-display italic text-xl text-critical-700 mb-5'>{errorProductReview}</div>}

  <span id='rating-picker-label' className='t-eyebrow block mb-2'>Rating</span>
  <StarPicker labelledBy='rating-picker-label' value={rating} onChange={setRating} />

  <div className='mt-5'>
    <TextArea name='comment' label='Comment' placeholder="What stood out? What didn't?" value={comment} onChange={e => setComment(e.target.value)} required />
  </div>

  <Button type='submit' variant='primary' className='mt-5' disabled={loadingProductReview}>
    {loadingProductReview ? 'Submitting…' : 'Submit review'}
  </Button>
</form>
```

`StarPicker` — `<span role='radiogroup' aria-labelledby={labelledBy}>` с пятью `<button type='button' role='radio' aria-checked={n === value} aria-label={`${n} stars`} onClick={() => onChange(n)}>`, иконка `IconStar` (filled при `n <= value`) или `IconStar` (outline при `n > value`). Контейнер: `inline-flex gap-1 p-2 bg-bone-50 border border-line rounded-pill`. Hover на звезде → `text-clay-500`. Focus → `outline-2 outline-forest-500 outline-offset-2 rounded-pill`. Клавиатурная навигация: Tab → группа; ←/→ или ↑/↓ переключают значение между 1..5 (см. WAI-ARIA APG radiogroup pattern).

### 7.6. `Stars.jsx`

```jsx
<span role='img' aria-label={`Rated ${rounded} out of 5 stars${text ? `, ${text}` : ''}`} className='inline-flex items-center gap-0.5 text-clay-500'>
  {[1,2,3,4,5].map(n => (
    n <= value ? <IconStar filled /> :
    n - 0.5 <= value ? <IconStarHalf /> :
    <IconStar />  /* outline */
  ))}
  {text && <span aria-hidden='true' className='ml-2 text-sm text-ink-soft'>{text}</span>}
</span>
```

- Размер по умолчанию 14×14. Через проп `size='sm'|'md'|'lg'` → 12/14/18.
- `clay-500` (`#C97B5B`) для filled, `ink-faint` (`#B0B6AF`) для outline.
- `IconStar`: `viewBox=0 0 24 24`, stroke 1.4 / currentColor, при `filled` → `fill='currentColor'`. `IconStarHalf`: те же, но с clip-path или вторым path-ом для половины.

### 7.7. Состояния ProductScreen

- **Loading**: skeleton с тем же 1fr 1fr grid (placeholder 4:5 слева, прямоугольники текста справа).
- **Error**: `role='alert'` секция (как на главной), кнопка Retry → `dispatch(listProductDetails(id))`.
- **Out of stock**: см. §7.2 (meta-row), §7.3 (Buy box без quantity-row, button disabled).
- **Review submit success / error**: уже учтены в §7.5.

## 8. Доступность (DESIGN.md §9)

Проверочный список для обоих экранов:

- [ ] Один `<h1>` на экран. На главной — Cormorant `text-5xl` в Hero; на search/page>1 — `Results for "kw"` / `All products`. На ProductScreen — `product.name`.
- [ ] Все списки — `<ul role='list'>` (DESIGN.md §9.1).
- [ ] Breadcrumb — `<nav aria-label='Breadcrumb'><ol>` (`<Breadcrumb>` компонент инкапсулирует).
- [ ] Все навигационные переходы — через `<Link>`. Никаких `<button onClick={history.push}>`.
- [ ] Все иконки в `Icons.jsx` остаются `aria-hidden focusable='false'`. Имя контрола живёт на родителе (`aria-label='Previous page'`).
- [ ] `<Stars role='img' aria-label='Rated X out of 5 stars'>` — один aria-label на блок. Внутренние SVG — `aria-hidden`.
- [ ] `StarPicker` — `role='radiogroup'`, каждая звезда — `role='radio' aria-checked aria-label`. Управление клавиатурой: Tab → группа, ← / → переключают звезду.
- [ ] Disabled-кнопки — через `disabled:` палитру (см. `Button.jsx`), не `opacity-50`.
- [ ] Focus — `focus-visible:outline-2 focus-visible:outline-forest-500 focus-visible:outline-offset-2` на каждом клик-таргете.
- [ ] Минимальный touch-target 24×24: `page-pill` 36×36 ✓, `StarPicker` звёзды 22×22 (в padding контейнера → реальный hit ≥ 24×24).
- [ ] Skeleton-контейнер: `aria-busy={true}`.
- [ ] Error → `role='alert'`. Success / empty → `role='status'`. Live-счётчик «Showing X of Y» → `role='status' aria-live='polite'`.
- [ ] `prefers-reduced-motion` уже захвачен глобально в `tailwind.input.css` — в новом коде ничего дополнительно не нужно.
- [ ] Шрифт ≥ 12 px везде. Никаких 10/11.

## 9. Порядок выполнения и чекпойнты

Делается двумя блоками с **обязательной паузой и визуальной проверкой** между ними:

**P1 — HomeScreen (полный pass)**:
1. Добавить `Breadcrumb`, `Hero`, `ProductCard`, `ProductRail` (новые).
2. Переписать `Paginate` → `Paginate.jsx`, `RecentlyViewed` → `RecentlyViewed.jsx`.
3. Создать `HomeScreen.jsx`.
4. Поправить `App.js` (вынести 5 routes из-под Container — 4 home + 1 product, сразу для P2 — `App.js` правится один раз).
5. Проверить: `npm run tailwind:build`, `cd frontend && npm test -- --watch=false` (если есть тесты, касающиеся `HomeScreen` или `ProductCarousel` — увидеть).
6. Удалить `HomeScreen.js`, `Product.js`, `ProductCarousel.js`, `Paginate.js`, `RecentlyViewed.js`.
7. **ПАУЗА** — визуальный чекпойнт пользователя.

**P2 — ProductScreen (полный pass)**:
1. Добавить `IconStar`, `IconStarHalf` в `Icons.jsx`.
2. Расширить `Form.jsx` — `TextArea`, `Select`.
3. Создать `Stars.jsx`.
4. Создать `ProductScreen.jsx` с локальными `BuyBox`, `Reviews`, `ReviewItem`, `ReviewForm`, `StarPicker`.
5. Проверить: `npm run tailwind:build`, тесты, если есть.
6. Удалить `ProductScreen.js`, `Rating.js`.
7. **ПАУЗА** — визуальный чекпойнт пользователя.

После каждого блока — короткая сводка изменённого и список «на что посмотреть» (golden path + edge-cases: search-выдача, page>1, out-of-stock товар, неавторизованный пользователь на ProductScreen, пустая корзина → after Add to cart).

## 10. Out of scope

- Header / Footer / любые другие экраны (cart, login, profile, admin/userlist, admin/productlist, admin/orderlist, order, place-order, payment, shipping, register).
- Категории / фильтры на главной — текущий backend не группирует товары по категориям.
- Изменения backend API (`/api/products`, `/api/products/top`, `/api/products/:id`, `/api/products/:id/reviews`).
- Изменения Redux-слайсов `productList`, `productTopRated`, `productDetails`, `productReviewCreate`.
- Тесты — по правилу CLAUDE.md не добавляем автоматически.
- Категории / brand-фильтры в breadcrumb (используем `Catalogue` как родительский узел).
- Картинки реальных товаров и фото-фотосессии (используется существующий `product.image`).

## 11. Handoff — что должно стать `writing-plans`

Один план с двумя секциями (P1 / P2), внутри каждой — упорядоченные шаги из §9. Каждый шаг указывает:
- какие файлы создаём/правим/удаляем;
- какой компонент/состояние затрагивает;
- что должно проверяться визуально в чекпойнте;
- какая команда запускается локально (`npm run tailwind:build` обязательна на каждом блоке, потому что `tailwind.input.css` может затрагиваться при добавлении новых tail-классов; тесты — только если есть существующие).

После approval пользователем выполнить через `subagent-driven-development` либо в одной сессии — на усмотрение.
