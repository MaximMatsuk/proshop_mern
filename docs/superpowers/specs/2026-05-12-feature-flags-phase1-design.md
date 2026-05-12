# Feature Flags — Phase 1: Decorative Gates + Admin Dashboard

**Дата:** 2026-05-12
**Скоуп:** Доделать backend-гейтинг 4 эндпоинтов + read-only админ-страница Dashboard Features
**Предшественник:** [Phase 0 — Infrastructure](./2026-05-08-feature-flags-phase0-design.md)
**Источник истины:** `config/features.json` (управляется MCP-сервером `feature-flags`)

## 1. Цель

После Phase 0 инфраструктура флагов готова, но `features.json` слабо связан с реальными эндпоинтами: только две фичи (`admin_advanced_filters`, `verified_purchase_badge`) реально используют `isFeatureEnabled`. Phase 1 — расширить гейтинг на 4 дополнительные фичи и добавить admin-UI для наблюдения за состоянием флагов.

## 2. Контекст и решения

Решения, принятые в брейнсторминге (фиксируем здесь):

| Вопрос | Решение |
|---|---|
| Имя HTTP-эндпоинта | Оставить `/api/features` (из Phase 0). Не переименовываем в `/api/feature-flags`. |
| Скоуп backend-гейтинга | 4 эндпоинта: `search_v2`, `product_recommendations`, `photo_reviews`, `gift_message` |
| Семантика гейтов | **Graceful degradation** — флаг off ⇒ baseline-поведение (как у существующих `admin_advanced_filters` / `verified_purchase_badge`). Никаких 503. |
| Глубина гейтов | Минимальные функциональные (Подход B) — наблюдаемое поведение на API-уровне без UI-имплементации фич |
| Админ-страница | Read-only таблица. Управление флагами остаётся через MCP. |
| Управление флагами с UI | Не делаем (нет PATCH-эндпоинтов, нет mutating actions) |
| `traffic_percentage` / `targeted_segments` | Продолжают игнорироваться резолвером (стабы из Phase 0) |
| Тесты | Не добавляем автоматически (правило CLAUDE.md) |

## 3. Архитектура

Изменения распределяются по слоям:

```
config/features.json
       │
       ▼
backend/utils/featureFlags.js                  ← расширяем маппинг (display_name, description)
       │
       ├─→ isFeatureEnabled(name) ──────────┐
       │                                    ▼
       │                       4 контроллера (inline-гейтинг):
       │                       • getProducts        (search_v2)
       │                       • getTopProducts     (product_recommendations)
       │                       • createProductReview (photo_reviews)
       │                       • addOrderItems      (gift_message)
       │
       └─→ HTTP: GET /api/features (расширенный response shape)
                       │
                       ▼
               frontend Redux slice (без изменений)
                       │
                       ▼
               /admin/featurelist (new screen, read-only)
```

## 4. Backend изменения

### 4.1. `backend/utils/featureFlags.js` — расширение API-ответа

В функциях `getAllFeatures` и `getFeatureResolved` объект-маппер расширить двумя полями:

```js
{
  name,                              // slug-ключ ("search_v2")
  display_name: feature.name,        // human-readable ("New Search Algorithm")
  description: feature.description,  // длинное описание из features.json
  enabled,
  status,
  traffic_percentage,
  targeted_segments,
  rollout_strategy,
  dependencies,
  last_modified,
}
```

Обоснование: `name` остаётся slug'ом — это контракт с `useFeatureFlag(name)` на фронте. Просто **добавляем** новые поля, ничего не переименовываем. Изменение полностью backwards-compatible для существующих потребителей (`HomeScreen`, `ProductScreen`).

### 4.2. Backend gates — graceful degradation, inline в контроллерах

Паттерн: повторяет существующие `admin_advanced_filters` (в `getProducts`) и `verified_purchase_badge` (в `getProductById`). Никакой новой middleware/обёртки.

#### `productController.js → getProducts`

```js
let query = { ...keyword, ...filters }   // keyword — текущая логика name-regex
if (await isFeatureEnabled('search_v2') && req.query.keyword) {
  query = {
    $or: [
      { name:        { $regex: req.query.keyword, $options: 'i' } },
      { brand:       { $regex: req.query.keyword, $options: 'i' } },
      { description: { $regex: req.query.keyword, $options: 'i' } },
    ],
    ...filters,
  }
}
```

При `off` — поведение остаётся текущим (только `name`). При `on` — `$or` по `name + brand + description`.

#### `productController.js → getTopProducts`

```js
if (await isFeatureEnabled('product_recommendations')) {
  // weighted score: rating * sqrt(numReviews + 1)
  const products = await Product.aggregate([
    {
      $addFields: {
        score: { $multiply: ['$rating', { $sqrt: { $add: ['$numReviews', 1] } }] },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 5 },
  ])
  return res.json(products)
}
// off: текущее поведение
const products = await Product.find({}).sort({ rating: -1 }).limit(3)
res.json(products)
```

При `on` — 5 товаров взвешенных, при `off` — текущие 3 по rating.

#### `productController.js → createProductReview`

```js
const review = {
  name: req.user.name,
  rating: Number(rating),
  comment,
  user: req.user._id,
}

if (await isFeatureEnabled('photo_reviews')) {
  const photos = Array.isArray(req.body.photos) ? req.body.photos : []
  // приём: только строки, максимум 3 элемента
  review.photos = photos.filter((p) => typeof p === 'string').slice(0, 3)
}

product.reviews.push(review)
```

При `off` — поле не записывается (применяется default `[]` из схемы).

#### `orderController.js → addOrderItems`

```js
const order = new Order({
  orderItems,
  user: req.user._id,
  shippingAddress,
  paymentMethod,
  itemsPrice,
  taxPrice,
  shippingPrice,
  totalPrice,
})

if (await isFeatureEnabled('gift_message')) {
  const raw = typeof req.body.giftMessage === 'string' ? req.body.giftMessage : ''
  order.giftMessage = raw.slice(0, 500)   // hard cap 500 chars
}

const createdOrder = await order.save()
```

При `off` — поле остаётся дефолтным `''`.

### 4.3. Изменения Mongoose-моделей

**`backend/models/productModel.js`** — `reviewSchema` (вложенная схема):

```js
const reviewSchema = mongoose.Schema(
  {
    name:    { type: String, required: true },
    rating:  { type: Number, required: true },
    comment: { type: String, required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    photos:  { type: [String], default: [] },   // ← новое
  },
  { timestamps: true }
)
```

**`backend/models/orderModel.js`** — поле Order-уровня:

```js
const orderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    orderItems: [ /* ... */ ],
    shippingAddress: { /* ... */ },
    paymentMethod: { type: String, required: true },
    paymentResult: { /* ... */ },
    // ... existing fields ...
    giftMessage: { type: String, default: '' },   // ← новое
  },
  { timestamps: true }
)
```

Оба поля имеют дефолты — старые документы продолжают работать без миграции. Mongoose применит дефолты при чтении/записи новых документов.

## 5. Frontend изменения

### 5.1. Новый экран `frontend/src/screens/FeatureListScreen.js`

Паттерн — копия `UserListScreen.js`:

```jsx
import React, { useEffect } from 'react'
import { Table, Badge, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { loadFeatureFlags } from '../actions/featureFlagsActions'

const FeatureListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const featureFlags = useSelector((s) => s.featureFlags)
  const { loading, error, flags } = featureFlags

  const userLogin = useSelector((s) => s.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(loadFeatureFlags())
    } else {
      history.push('/login')
    }
  }, [dispatch, history, userInfo])

  const statusVariant = {
    Disabled: 'danger',
    Testing: 'warning',
    Enabled: 'success',
  }

  const rows = Object.values(flags)

  return (
    <>
      <div className='d-flex justify-content-between align-items-center'>
        <h1>Feature Flags</h1>
        <Button
          variant='light'
          onClick={() => dispatch(loadFeatureFlags())}
          disabled={loading}
        >
          <i className='fas fa-sync'></i> Refresh
        </Button>
      </div>
      {loading ? (
        <Loader />
      ) : error ? (
        <Message variant='danger'>{error}</Message>
      ) : (
        <Table striped bordered hover responsive className='table-sm'>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Enabled</th>
              <th>Traffic</th>
              <th>Strategy</th>
              <th>Dependencies</th>
              <th>Segments</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.name}>
                <td title={f.description}>
                  {f.display_name}
                  <br />
                  <small className='text-muted'>{f.name}</small>
                </td>
                <td>
                  <Badge variant={statusVariant[f.status] || 'secondary'}>
                    {f.status}
                  </Badge>
                </td>
                <td>
                  {f.enabled ? (
                    <i className='fas fa-check' style={{ color: 'green' }}></i>
                  ) : (
                    <i className='fas fa-times' style={{ color: 'red' }}></i>
                  )}
                </td>
                <td>{f.traffic_percentage}%</td>
                <td>{f.rollout_strategy || '—'}</td>
                <td>
                  {(f.dependencies || []).map((d) => (
                    <Badge key={d} variant='info' className='mr-1'>
                      {d}
                    </Badge>
                  ))}
                </td>
                <td>
                  <small>{(f.targeted_segments || []).join(', ')}</small>
                </td>
                <td>{f.last_modified}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

export default FeatureListScreen
```

Описание из `description` показывается через нативный browser-tooltip (`title` атрибут на ячейке Name) — без отдельного стейта раскрытия.

### 5.2. `frontend/src/App.js` — регистрация маршрута

Добавить:
```js
import FeatureListScreen from './screens/FeatureListScreen'
// ...
<Route path='/admin/featurelist' component={FeatureListScreen} exact />
```

Маршрут — рядом с другими `/admin/*` (как `/admin/userlist`, `/admin/orderlist`).

### 5.3. `frontend/src/components/Header.js` — пункт меню

В `<NavDropdown title='Admin'>` добавить 4-й пункт после Orders:

```jsx
<LinkContainer to='/admin/featurelist'>
  <NavDropdown.Item>Feature Flags</NavDropdown.Item>
</LinkContainer>
```

## 6. API contract (без breaking changes)

### `GET /api/features`

**Response 200** — расширенный shape (новые поля помечены `// new`):

```json
[
  {
    "name": "gift_message",
    "display_name": "Gift Message at Checkout",        
    "description": "Adds an optional gift message...", 
    "enabled": true,
    "status": "Testing",
    "traffic_percentage": 90,
    "targeted_segments": ["all"],
    "rollout_strategy": "full_release",
    "dependencies": [],
    "last_modified": "2026-05-03"
  }
]
```

`GET /api/features/:name` — аналогично, плюс два новых поля.

Существующие потребители фронта (`useFeatureFlag(name)`) читают только `enabled` — не ломается.

## 7. Data flow при изменении флага

1. Admin вызывает `set_feature_state` через MCP → atomic write в `config/features.json`
2. Backend cache TTL (5s) → новые значения подхватываются
3. Existing user-flows (продукты, заказы, отзывы) автоматически реагируют на флаг — следующий запрос идёт по on/off ветке
4. Frontend admin на странице `/admin/featurelist` → нажимает **Refresh** → видит обновлённое состояние в таблице

## 8. Обработка ошибок

| Ситуация | Поведение |
|---|---|
| `req.body.photos` не массив | `Array.isArray` фильтр → `[]` (отзыв сохраняется без фото) |
| `req.body.photos` содержит не-строки | `filter(typeof === 'string')` → отброшено |
| `req.body.giftMessage` не строка | Игнорируем, `order.giftMessage = ''` |
| `req.body.giftMessage` длиннее 500 символов | `.slice(0, 500)` |
| Флаг недоступен (`features.json` испорчен) | `isFeatureEnabled` → `false` → graceful baseline (как у существующих гейтов) |
| Не-admin зашёл на `/admin/featurelist` | `history.push('/login')` (как у `UserListScreen`) |
| `/api/features` упал на фронте | `featureFlagsReducer` ставит `error`, `<Message variant='danger'>` в UI |

## 9. Acceptance criteria

1. ✅ `GET /api/features` отдаёт **25 объектов** с новыми полями `display_name` и `description`.
2. ✅ `search_v2 = Disabled` (после TTL≥6с): `GET /api/products?keyword=phone` отдаёт только товары по `name`. `search_v2 = Testing/Enabled`: дополнительно матчатся по `brand` и `description`.
3. ✅ `product_recommendations = Disabled`: `GET /api/products/top` возвращает 3 элемента отсортированных по `rating`. `Testing/Enabled`: 5 элементов отсортированных по weighted score.
4. ✅ `photo_reviews = Enabled` + POST `/api/products/:id/reviews` с `{rating, comment, photos: ["a.jpg","b.jpg"]}`: review сохраняется с `photos: ["a.jpg","b.jpg"]`. `Disabled`: поле не сохраняется (пустой массив по default).
5. ✅ `gift_message = Enabled` + POST `/api/orders` с `{..., giftMessage: "Happy Birthday"}`: order сохраняется с `giftMessage: "Happy Birthday"`. `Disabled`: `order.giftMessage === ''`.
6. ✅ Существующие гейты (`admin_advanced_filters`, `verified_purchase_badge`) работают как раньше.
7. ✅ `/admin/featurelist` рендерит таблицу со всеми 25 фичами для admin'а.
8. ✅ Не-admin перенаправляется на `/login`.
9. ✅ Кнопка **Refresh** заново вызывает `/api/features` (видно в Network tab).
10. ✅ Smoke: главная грузится, поиск работает, корзина работает, чекаут проходит, существующие `/admin/*` страницы открываются.

## 10. Ручная проверка после имплементации

```bash
# 1. Сборка и запуск
npm run dev

# 2. API smoke
curl http://localhost:5000/api/features | jq '.[0]'
# должны быть поля display_name и description

# 3. Гейтинг search_v2
curl 'http://localhost:5000/api/products?keyword=apple' | jq '.products | length'
# через MCP: set_feature_state('search_v2', 'Disabled') → подождать 6с → запрос снова
# при Disabled количество результатов меньше или равно (только по name)

# 4. Гейтинг product_recommendations
curl http://localhost:5000/api/products/top | jq 'length'
# Disabled → 3, Testing/Enabled → 5

# 5. UI
# Login as admin@example.com / 123456
# В шапке Admin → Feature Flags → таблица из 25 строк
# Кнопка Refresh показывает свежий запрос
# Через MCP меняем статус → Refresh → видим новое состояние
```

## 11. Что НЕ делаем в Phase 1

- ❌ Не реализуем UI самих фич: чекбокс photo upload в форме отзыва, поле gift message на PlaceOrderScreen, переключение search UI и т.п.
- ❌ Не добавляем mutating endpoints (`PATCH /api/features/:name`) — управление флагами остаётся через MCP.
- ❌ Не реализуем `traffic_percentage` и `targeted_segments` (продолжают игнорироваться).
- ❌ Не добавляем тесты (по правилу CLAUDE.md — спрашиваем явно).
- ❌ Не делаем auto-refresh флагов на фронте (YAGNI).
- ❌ Не делаем admin-only protection на `/api/features` (по решению Phase 0).
- ❌ Не пишем UI-индикатор «feature ON/OFF» для самих 4 затронутых эндпоинтов (декоративный гейт виден только через API).

## 12. Файлы — изменения

| Файл | Тип | Что делаем |
|---|---|---|
| `backend/utils/featureFlags.js` | edit | Добавить `display_name` и `description` в маппинг |
| `backend/controllers/productController.js` | edit | 3 inline-гейта в `getProducts`, `getTopProducts`, `createProductReview` |
| `backend/controllers/orderController.js` | edit | 1 inline-гейт в `addOrderItems` |
| `backend/models/productModel.js` | edit | `photos: [String]` в `reviewSchema` |
| `backend/models/orderModel.js` | edit | `giftMessage: String` на orderSchema |
| `frontend/src/screens/FeatureListScreen.js` | new | Read-only таблица |
| `frontend/src/App.js` | edit | +import + 1 Route |
| `frontend/src/components/Header.js` | edit | +1 NavDropdown.Item |

## 13. Риски и митигации

| Риск | Митигация |
|---|---|
| Schema-расширения ломают сериализацию старых документов | Дефолты (`[]`, `''`) — backward-compatible |
| `useFeatureFlag` пользователи получают новые поля и неявно зависят от них | Хук читает только `enabled` — изменение прозрачно |
| Aggregation pipeline в `getTopProducts` ломает кэширование/индексы | Pipeline простой, без $lookup. Limit малый. Производительность сопоставима. |
| Admin страница ломается если backend упал | Стандартный error-state (`<Message variant='danger'>`) |
| Через MCP флаг изменился, но UI показывает старое | Refresh-кнопка обновляет. Auto-refresh — не делаем. |
| `req.body.giftMessage` от клиента содержит XSS payload | Сохраняем как plain string, рендеринг на packing slip — out of scope. Длина капируется 500 символов. |

## 14. Следующие шаги

После Phase 1 — кандидаты на Phase 2:
- Реализовать UI самих фич (фото на форме ревью, gift message в чекауте) — каждая под своим флагом, с frontend-гейтингом через `useFeatureFlag`
- Реализовать `traffic_percentage` (детерминированный хэш user-id или session-cookie)
- Добавить admin-mutating endpoints (если решим делать управление с UI)
