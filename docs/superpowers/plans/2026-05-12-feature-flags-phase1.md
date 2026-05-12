# Feature Flags Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Доделать backend-гейтинг 4 фич (`search_v2`, `product_recommendations`, `photo_reviews`, `gift_message`) и добавить read-only админ-страницу `/admin/featurelist`, читающую расширенный `GET /api/features`.

**Architecture:** Phase 0 инфраструктура (`backend/utils/featureFlags.js` + Redux slice) уже на месте. Задача — inline `isFeatureEnabled('...')` в 4 контроллера в стиле существующих гейтов (`admin_advanced_filters`, `verified_purchase_badge`), мини-расширения двух Mongoose-схем (`photos`, `giftMessage`), плюс новый React-экран в стиле `UserListScreen`.

**Tech Stack:** Node.js 16 (ESM), Express 4, Mongoose 5, express-async-handler, React 16, React Router v5, классический Redux 4 + redux-thunk, react-bootstrap.

**Тесты:** Согласно `CLAUDE.md` бэкенд-тестов в проекте нет и автоматически их не добавляем. План использует **ручную проверку через curl + UI** вместо автотестов. Каждая задача заканчивается командой проверки и ожидаемым результатом.

**Учётка для тестирования:** `admin@example.com / 123456` (после `npm run data:import`).

---

## Pre-flight

- [ ] **Step 0.1: Подтвердить чистое состояние ветки**

Run:
```bash
git status
```
Expected: `nothing to commit, working tree clean` (или только спека из брейнсторма, которая уже закоммичена).

- [ ] **Step 0.2: Поднять стек локально**

Run:
```bash
npm run dev
```
Expected: backend на `:5000`, CRA на `:3000`, в логах нет ошибок. Оставить процесс работающим в отдельном терминале — будем перезапускать backend после изменений (nodemon делает это автоматически).

- [ ] **Step 0.3: Засеять данные (если ещё не)**

Run:
```bash
npm run data:import
```
Expected: `Data Imported!`. Без этого нельзя проверить `/api/products`.

---

### Task 1: Расширить API-ответ `/api/features` полями `display_name` и `description`

**Files:**
- Modify: `backend/utils/featureFlags.js` (функции `getAllFeatures` и `getFeatureResolved`)

- [ ] **Step 1.1: Прочитать текущую реализацию**

Read: `backend/utils/featureFlags.js:73-101`

Сейчас маппинг возвращает: `{name, enabled, status, traffic_percentage, targeted_segments, rollout_strategy, dependencies, last_modified}`. Нужно добавить `display_name` и `description`.

- [ ] **Step 1.2: Обновить `getAllFeatures`**

В `backend/utils/featureFlags.js` заменить блок:
```js
export const getAllFeatures = async () => {
  const features = await ensureCache()
  return Object.entries(features).map(([name, feature]) => ({
    name,
    enabled: resolveEnabled(name, features, new Set()),
    status: feature.status,
    traffic_percentage: feature.traffic_percentage,
    targeted_segments: feature.targeted_segments ?? [],
    rollout_strategy: feature.rollout_strategy ?? null,
    dependencies: feature.dependencies ?? [],
    last_modified: feature.last_modified,
  }))
}
```
на:
```js
export const getAllFeatures = async () => {
  const features = await ensureCache()
  return Object.entries(features).map(([name, feature]) => ({
    name,
    display_name: feature.name,
    description: feature.description,
    enabled: resolveEnabled(name, features, new Set()),
    status: feature.status,
    traffic_percentage: feature.traffic_percentage,
    targeted_segments: feature.targeted_segments ?? [],
    rollout_strategy: feature.rollout_strategy ?? null,
    dependencies: feature.dependencies ?? [],
    last_modified: feature.last_modified,
  }))
}
```

- [ ] **Step 1.3: Обновить `getFeatureResolved`** (тот же блок-маппер)

Заменить:
```js
export const getFeatureResolved = async (name) => {
  const features = await ensureCache()
  const feature = features[name]
  if (!feature) return null
  return {
    name,
    enabled: resolveEnabled(name, features, new Set()),
    status: feature.status,
    traffic_percentage: feature.traffic_percentage,
    targeted_segments: feature.targeted_segments ?? [],
    rollout_strategy: feature.rollout_strategy ?? null,
    dependencies: feature.dependencies ?? [],
    last_modified: feature.last_modified,
  }
}
```
на:
```js
export const getFeatureResolved = async (name) => {
  const features = await ensureCache()
  const feature = features[name]
  if (!feature) return null
  return {
    name,
    display_name: feature.name,
    description: feature.description,
    enabled: resolveEnabled(name, features, new Set()),
    status: feature.status,
    traffic_percentage: feature.traffic_percentage,
    targeted_segments: feature.targeted_segments ?? [],
    rollout_strategy: feature.rollout_strategy ?? null,
    dependencies: feature.dependencies ?? [],
    last_modified: feature.last_modified,
  }
}
```

- [ ] **Step 1.4: Дождаться рестарта nodemon + проверка**

Run:
```bash
curl -s http://localhost:5000/api/features | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d)); print('first:', json.dumps(d[0], indent=2))"
```
Expected:
- `count: 25`
- `first:` объект содержит поля `display_name` (например `"New Search Algorithm"`) и `description` (длинный текст).

- [ ] **Step 1.5: Проверка эндпоинта по имени**

Run:
```bash
curl -s http://localhost:5000/api/features/gift_message | python3 -m json.tool
```
Expected: объект с `name: "gift_message"`, `display_name: "Gift Message at Checkout"`, `description: "Adds an optional gift message..."`.

- [ ] **Step 1.6: Commit**

```bash
git add backend/utils/featureFlags.js
git commit -m "feat(backend): expose display_name and description in /api/features response"
```

---

### Task 2: Добавить `photos` в reviewSchema

**Files:**
- Modify: `backend/models/productModel.js:3-17`

- [ ] **Step 2.1: Обновить reviewSchema**

В `backend/models/productModel.js` заменить:
```js
const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)
```
на:
```js
const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    photos: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
)
```

- [ ] **Step 2.2: Smoke — сервер поднимается**

После рестарта nodemon — посмотреть консоль backend. Не должно быть ошибок схемы. Проверить что существующие продукты с отзывами по-прежнему отдаются:
```bash
curl -s http://localhost:5000/api/products/top | python3 -c "import sys,json; print('ok' if isinstance(json.load(sys.stdin), list) else 'fail')"
```
Expected: `ok`.

- [ ] **Step 2.3: Commit**

```bash
git add backend/models/productModel.js
git commit -m "feat(backend): add optional photos array to reviewSchema"
```

---

### Task 3: Добавить `giftMessage` в orderSchema

**Files:**
- Modify: `backend/models/orderModel.js`

- [ ] **Step 3.1: Добавить поле**

В `backend/models/orderModel.js` после `deliveredAt: { type: Date }` (строка ~68) добавить **перед** закрывающим `}` orderSchema:
```js
    deliveredAt: {
      type: Date,
    },
    giftMessage: {
      type: String,
      default: '',
    },
  },
```

Полный фрагмент после правки (последняя секция перед `{ timestamps: true }`):
```js
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    giftMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
```

- [ ] **Step 3.2: Smoke**

После рестарта nodemon — запросить заказ admin'ом (нужен валидный токен). Проще через UI: войти как `admin@example.com / 123456` на `http://localhost:3000`, в админ-дропдауне открыть Orders, кликнуть Details — заказ должен открываться без ошибок.

Или, если есть существующие заказы из seed: проверить shape напрямую через mongo shell. Если в проекте нет mongo CLI, шаг smoke = «UI не падает».

- [ ] **Step 3.3: Commit**

```bash
git add backend/models/orderModel.js
git commit -m "feat(backend): add optional giftMessage field to orderSchema"
```

---

### Task 4: Гейт `search_v2` в `getProducts`

**Files:**
- Modify: `backend/controllers/productController.js:9-46` (функция `getProducts`)

- [ ] **Step 4.1: Прочитать текущий код функции**

Текущий блок keyword (строки 13-21):
```js
const keyword = req.query.keyword
  ? {
      name: {
        $regex: req.query.keyword,
        $options: 'i',
      },
    }
  : {}
```

И `query` сборка (строка 39):
```js
const query = { ...keyword, ...filters }
```

- [ ] **Step 4.2: Заменить логику keyword на условную**

Заменить блок keyword (13-21) и блок query (39) на:
```js
let keywordQuery = {}
if (req.query.keyword) {
  if (await isFeatureEnabled('search_v2')) {
    keywordQuery = {
      $or: [
        { name: { $regex: req.query.keyword, $options: 'i' } },
        { brand: { $regex: req.query.keyword, $options: 'i' } },
        { description: { $regex: req.query.keyword, $options: 'i' } },
      ],
    }
  } else {
    keywordQuery = {
      name: { $regex: req.query.keyword, $options: 'i' },
    }
  }
}
```

И:
```js
const query = { ...keywordQuery, ...filters }
```

Финальная функция должна выглядеть так:
```js
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = 10
  const page = Number(req.query.pageNumber) || 1

  let keywordQuery = {}
  if (req.query.keyword) {
    if (await isFeatureEnabled('search_v2')) {
      keywordQuery = {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { brand: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    } else {
      keywordQuery = {
        name: { $regex: req.query.keyword, $options: 'i' },
      }
    }
  }

  const filters = {}
  if (await isFeatureEnabled('admin_advanced_filters')) {
    const { priceMin, priceMax, stockMin, stockMax, category, brand } = req.query
    if (priceMin || priceMax) {
      filters.price = {}
      if (priceMin) filters.price.$gte = Number(priceMin)
      if (priceMax) filters.price.$lte = Number(priceMax)
    }
    if (stockMin || stockMax) {
      filters.countInStock = {}
      if (stockMin) filters.countInStock.$gte = Number(stockMin)
      if (stockMax) filters.countInStock.$lte = Number(stockMax)
    }
    if (category) filters.category = category
    if (brand) filters.brand = brand
  }

  const query = { ...keywordQuery, ...filters }
  const count = await Product.countDocuments(query)
  const products = await Product.find(query)
    .limit(pageSize)
    .skip(pageSize * (page - 1))

  res.json({ products, page, pages: Math.ceil(count / pageSize) })
})
```

- [ ] **Step 4.3: Проверить baseline (search_v2 = Testing → on)**

Через MCP убедиться что `search_v2` = `Testing`:
- В Claude вызвать `get_feature_info("search_v2")` → ожидается `status: Testing`.

Тестовый запрос:
```bash
curl -s 'http://localhost:5000/api/products?keyword=microsoft' | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d['products']))"
```
Запомните это число — назовём его `count_on`.

В seed данных `microsoft` встречается в описании или бренде XBox-продуктов, но не в имени. Ожидание: при `search_v2 = on` count > 0 (если в seed есть Microsoft-продукты в описании/бренде).

- [ ] **Step 4.4: Выключить search_v2 и проверить разницу**

Через MCP: `set_feature_state("search_v2", "Disabled")`.

Подождать 6 секунд (TTL кэша).

Тот же запрос:
```bash
sleep 6 && curl -s 'http://localhost:5000/api/products?keyword=microsoft' | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d['products']))"
```
Expected: `count_off` ≤ `count_on` (при off ищется только по `name`).

Если в seed нет продукта с Microsoft в `name` но есть в brand/description, `count_off` будет 0, а `count_on` > 0. Если оба равны — выбрать другой keyword из seed (`iphone`, `airpods`, `playstation`), который точно есть в brand но не в name.

- [ ] **Step 4.5: Вернуть search_v2 обратно в Testing**

Через MCP: `set_feature_state("search_v2", "Testing")`.

- [ ] **Step 4.6: Commit**

```bash
git add backend/controllers/productController.js
git commit -m "feat(backend): gate search_v2 to extend keyword search to brand+description"
```

---

### Task 5: Гейт `product_recommendations` в `getTopProducts`

**Files:**
- Modify: `backend/controllers/productController.js:194-199` (функция `getTopProducts`)

- [ ] **Step 5.1: Заменить функцию**

Текущая:
```js
const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ rating: -1 }).limit(3)

  res.json(products)
})
```

Заменить на:
```js
const getTopProducts = asyncHandler(async (req, res) => {
  if (await isFeatureEnabled('product_recommendations')) {
    const products = await Product.aggregate([
      {
        $addFields: {
          score: {
            $multiply: [
              '$rating',
              { $sqrt: { $add: ['$numReviews', 1] } },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 5 },
    ])
    return res.json(products)
  }
  const products = await Product.find({}).sort({ rating: -1 }).limit(3)
  res.json(products)
})
```

- [ ] **Step 5.2: Baseline проверка (флаг on)**

Убедиться через MCP: `product_recommendations` = `Testing`.

```bash
curl -s http://localhost:5000/api/products/top | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d))"
```
Expected: `count: 5`.

- [ ] **Step 5.3: Выключить флаг и проверить**

Через MCP: `set_feature_state("product_recommendations", "Disabled")`.

```bash
sleep 6 && curl -s http://localhost:5000/api/products/top | python3 -c "import sys,json; d=json.load(sys.stdin); print('count:', len(d))"
```
Expected: `count: 3`.

- [ ] **Step 5.4: Вернуть в Testing**

Через MCP: `set_feature_state("product_recommendations", "Testing")`.

- [ ] **Step 5.5: Commit**

```bash
git add backend/controllers/productController.js
git commit -m "feat(backend): gate product_recommendations with weighted top scoring (rating*sqrt(numReviews+1), limit 5)"
```

---

### Task 6: Гейт `photo_reviews` в `createProductReview`

**Files:**
- Modify: `backend/controllers/productController.js:154-190` (функция `createProductReview`)

- [ ] **Step 6.1: Обновить функцию**

Найти блок:
```js
const review = {
  name: req.user.name,
  rating: Number(rating),
  comment,
  user: req.user._id,
}

product.reviews.push(review)
```

Заменить **перед** `product.reviews.push(review)` так:
```js
const review = {
  name: req.user.name,
  rating: Number(rating),
  comment,
  user: req.user._id,
}

if (await isFeatureEnabled('photo_reviews')) {
  const photos = Array.isArray(req.body.photos) ? req.body.photos : []
  review.photos = photos.filter((p) => typeof p === 'string').slice(0, 3)
}

product.reviews.push(review)
```

- [ ] **Step 6.2: Подготовить токен**

Нужен JWT обычного пользователя. Войти как `john@example.com / 123456`:
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"john@example.com","password":"123456"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "$TOKEN" | head -c 30
```
Expected: какой-то JWT prefix (`eyJhbGc...`).

- [ ] **Step 6.3: Найти товар без отзыва от John**

В seed-данных у некоторых продуктов отзывы уже есть. Чтобы избежать `Product already reviewed`, нужен товар, который John ещё не ревьюил. Простейший путь — пересеять данные перед тестом:
```bash
npm run data:destroy && npm run data:import
```
Expected: `Data Destroyed!` и `Data Imported!`. После пересева у John отзывов нет.

Получить ID любого продукта:
```bash
PID=$(curl -s 'http://localhost:5000/api/products' | python3 -c "import sys,json; print(json.load(sys.stdin)['products'][0]['_id'])")
echo $PID
```

- [ ] **Step 6.4: POST review с photos (флаг on — Testing по умолчанию)**

Убедиться `photo_reviews = Testing` через MCP.

```bash
curl -s -X POST http://localhost:5000/api/products/$PID/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"rating":5,"comment":"Great with photos","photos":["a.jpg","b.jpg"]}' && echo
```
Expected: `{"message":"Review added"}`.

- [ ] **Step 6.5: Проверить что photos сохранились**

```bash
curl -s "http://localhost:5000/api/products/$PID" | python3 -c "import sys,json; d=json.load(sys.stdin); r=[x for x in d['reviews'] if x['name']=='John Doe'][0]; print('photos:', r.get('photos'))"
```
Expected: `photos: ['a.jpg', 'b.jpg']`.

- [ ] **Step 6.6: Выключить флаг, пересеять, повторить**

```bash
# disable
# Через MCP: set_feature_state("photo_reviews", "Disabled")
sleep 6
npm run data:destroy && npm run data:import

# re-login (токен мог инвалидироваться при destroy)
TOKEN=$(curl -s -X POST http://localhost:5000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"john@example.com","password":"123456"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
PID=$(curl -s 'http://localhost:5000/api/products' | python3 -c "import sys,json; print(json.load(sys.stdin)['products'][0]['_id'])")

# review with photos in body
curl -s -X POST http://localhost:5000/api/products/$PID/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"rating":5,"comment":"No photos saved","photos":["x.jpg"]}' && echo
```
Expected: `{"message":"Review added"}`.

Проверка:
```bash
curl -s "http://localhost:5000/api/products/$PID" | python3 -c "import sys,json; d=json.load(sys.stdin); r=[x for x in d['reviews'] if x['name']=='John Doe'][0]; print('photos:', r.get('photos', '<absent>'))"
```
Expected: `photos: <absent>` или `photos: []` (поле не сохранено в документ или применился default).

- [ ] **Step 6.7: Вернуть флаг в Testing**

Через MCP: `set_feature_state("photo_reviews", "Testing")`.

- [ ] **Step 6.8: Commit**

```bash
git add backend/controllers/productController.js
git commit -m "feat(backend): gate photo_reviews to accept and persist photos array on reviews"
```

---

### Task 7: Гейт `gift_message` в `addOrderItems`

**Files:**
- Modify: `backend/controllers/orderController.js:8-39` (функция `addOrderItems`)

- [ ] **Step 7.1: Обновить функцию**

Заменить блок создания order в `addOrderItems`:
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

const createdOrder = await order.save()
```
на:
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
  order.giftMessage = raw.slice(0, 500)
}

const createdOrder = await order.save()
```

- [ ] **Step 7.2: Создать заказ с gift_message (флаг on)**

Убедиться `gift_message = Testing` через MCP.

Получить токен и существующий productId:
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"john@example.com","password":"123456"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
PID=$(curl -s 'http://localhost:5000/api/products' | python3 -c "import sys,json; print(json.load(sys.stdin)['products'][0]['_id'])")
```

POST заказ:
```bash
ORDER_RES=$(curl -s -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"orderItems\":[{\"name\":\"Item\",\"qty\":1,\"image\":\"/x.jpg\",\"price\":10,\"product\":\"$PID\"}],
    \"shippingAddress\":{\"address\":\"a\",\"city\":\"c\",\"postalCode\":\"1\",\"country\":\"C\"},
    \"paymentMethod\":\"PayPal\",
    \"itemsPrice\":10,\"taxPrice\":0,\"shippingPrice\":0,\"totalPrice\":10,
    \"giftMessage\":\"Happy Birthday\"
  }")
echo "$ORDER_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print('giftMessage:', repr(d.get('giftMessage')))"
```
Expected: `giftMessage: 'Happy Birthday'`.

- [ ] **Step 7.3: Выключить и повторить**

Через MCP: `set_feature_state("gift_message", "Disabled")`.

```bash
sleep 6
ORDER_RES=$(curl -s -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"orderItems\":[{\"name\":\"Item\",\"qty\":1,\"image\":\"/x.jpg\",\"price\":10,\"product\":\"$PID\"}],
    \"shippingAddress\":{\"address\":\"a\",\"city\":\"c\",\"postalCode\":\"1\",\"country\":\"C\"},
    \"paymentMethod\":\"PayPal\",
    \"itemsPrice\":10,\"taxPrice\":0,\"shippingPrice\":0,\"totalPrice\":10,
    \"giftMessage\":\"Should be ignored\"
  }")
echo "$ORDER_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print('giftMessage:', repr(d.get('giftMessage', '<absent>')))"
```
Expected: `giftMessage: ''` (дефолт схемы применился).

- [ ] **Step 7.4: Вернуть флаг в Testing**

Через MCP: `set_feature_state("gift_message", "Testing")`.

- [ ] **Step 7.5: Commit**

```bash
git add backend/controllers/orderController.js
git commit -m "feat(backend): gate gift_message to persist giftMessage field on order"
```

---

### Task 8: Создать `FeatureListScreen.js`

**Files:**
- Create: `frontend/src/screens/FeatureListScreen.js`

- [ ] **Step 8.1: Создать файл**

Создать `frontend/src/screens/FeatureListScreen.js` с содержимым:
```js
import React, { useEffect } from 'react'
import { Table, Badge, Button } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import Message from '../components/Message'
import Loader from '../components/Loader'
import { loadFeatureFlags } from '../actions/featureFlagsActions'

const STATUS_VARIANT = {
  Disabled: 'danger',
  Testing: 'warning',
  Enabled: 'success',
}

const FeatureListScreen = ({ history }) => {
  const dispatch = useDispatch()

  const featureFlags = useSelector((state) => state.featureFlags)
  const { loading, error, flags } = featureFlags

  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  useEffect(() => {
    if (userInfo && userInfo.isAdmin) {
      dispatch(loadFeatureFlags())
    } else {
      history.push('/login')
    }
  }, [dispatch, history, userInfo])

  const rows = Object.values(flags || {})

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
                  <strong>{f.display_name}</strong>
                  <br />
                  <small className='text-muted'>{f.name}</small>
                </td>
                <td>
                  <Badge variant={STATUS_VARIANT[f.status] || 'secondary'}>
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

- [ ] **Step 8.2: Проверить что CRA принял файл (нет lint-ошибок)**

В терминале CRA посмотреть лог — после сохранения должна быть пересборка без ошибок. Если есть ошибки — поправить (обычно опечатки в импортах).

- [ ] **Step 8.3: Commit** (промежуточный, без маршрута пока недоступен)

```bash
git add frontend/src/screens/FeatureListScreen.js
git commit -m "feat(frontend): add FeatureListScreen for admin feature flags dashboard"
```

---

### Task 9: Зарегистрировать маршрут `/admin/featurelist`

**Files:**
- Modify: `frontend/src/App.js`

- [ ] **Step 9.1: Добавить импорт**

В `frontend/src/App.js` найти строку:
```js
import OrderListScreen from './screens/OrderListScreen'
```
И сразу после неё добавить:
```js
import FeatureListScreen from './screens/FeatureListScreen'
```

- [ ] **Step 9.2: Добавить маршрут**

В блоке `<Route ...>` после:
```jsx
<Route path='/admin/orderlist' component={OrderListScreen} />
```
Добавить:
```jsx
<Route path='/admin/featurelist' component={FeatureListScreen} exact />
```

- [ ] **Step 9.3: Smoke**

Войти как `admin@example.com / 123456`. Открыть в браузере вручную: `http://localhost:3000/admin/featurelist`.
Expected: страница рендерится, видна таблица из 25 строк, кнопка Refresh кликабельна.

- [ ] **Step 9.4: Smoke — non-admin redirect**

Выйти из admin'а, войти как `john@example.com / 123456`, ввести в адресную строку `http://localhost:3000/admin/featurelist`.
Expected: моментальный редирект на `/login`.

- [ ] **Step 9.5: Commit**

```bash
git add frontend/src/App.js
git commit -m "feat(frontend): wire /admin/featurelist route"
```

---

### Task 10: Добавить пункт меню в Header

**Files:**
- Modify: `frontend/src/components/Header.js:51-63`

- [ ] **Step 10.1: Обновить admin-дропдаун**

В `frontend/src/components/Header.js` заменить блок:
```jsx
{userInfo && userInfo.isAdmin && (
  <NavDropdown title='Admin' id='adminmenu'>
    <LinkContainer to='/admin/userlist'>
      <NavDropdown.Item>Users</NavDropdown.Item>
    </LinkContainer>
    <LinkContainer to='/admin/productlist'>
      <NavDropdown.Item>Products</NavDropdown.Item>
    </LinkContainer>
    <LinkContainer to='/admin/orderlist'>
      <NavDropdown.Item>Orders</NavDropdown.Item>
    </LinkContainer>
  </NavDropdown>
)}
```
на:
```jsx
{userInfo && userInfo.isAdmin && (
  <NavDropdown title='Admin' id='adminmenu'>
    <LinkContainer to='/admin/userlist'>
      <NavDropdown.Item>Users</NavDropdown.Item>
    </LinkContainer>
    <LinkContainer to='/admin/productlist'>
      <NavDropdown.Item>Products</NavDropdown.Item>
    </LinkContainer>
    <LinkContainer to='/admin/orderlist'>
      <NavDropdown.Item>Orders</NavDropdown.Item>
    </LinkContainer>
    <LinkContainer to='/admin/featurelist'>
      <NavDropdown.Item>Feature Flags</NavDropdown.Item>
    </LinkContainer>
  </NavDropdown>
)}
```

- [ ] **Step 10.2: Smoke**

Войти как admin. В шапке открыть Admin → должен быть пункт `Feature Flags` четвёртым. Кликнуть → перейти на `/admin/featurelist`.
Expected: таблица грузится.

- [ ] **Step 10.3: Commit**

```bash
git add frontend/src/components/Header.js
git commit -m "feat(frontend): add Feature Flags entry to admin nav dropdown"
```

---

### Task 11: End-to-end smoke по acceptance criteria

Проверка по всему функционалу — без коммита (только наблюдение). Если что-то падает — фикс отдельным коммитом, продолжаем.

- [ ] **Step 11.1: AC1 — API shape**

```bash
curl -s http://localhost:5000/api/features | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert len(d) == 25, f'expected 25, got {len(d)}'
first = d[0]
for key in ['name','display_name','description','enabled','status']:
    assert key in first, f'missing {key}'
print('AC1 OK')
"
```
Expected: `AC1 OK`.

- [ ] **Step 11.2: AC2 — search_v2 toggle**

См. Steps 4.3-4.4. Уже должно работать. Просто повторить с любым keyword из seed (например `airpods` или `cannon`):
```bash
# Через MCP: get_feature_info("search_v2") — Testing
COUNT_ON=$(curl -s 'http://localhost:5000/api/products?keyword=lens' | python3 -c "import sys,json; print(len(json.load(sys.stdin)['products']))")
echo "on: $COUNT_ON"
# Через MCP: set_feature_state("search_v2", "Disabled")
sleep 6
COUNT_OFF=$(curl -s 'http://localhost:5000/api/products?keyword=lens' | python3 -c "import sys,json; print(len(json.load(sys.stdin)['products']))")
echo "off: $COUNT_OFF"
# Через MCP: set_feature_state("search_v2", "Testing")
```
Expected: `on >= off`. Если оба 0 — выбрать другой keyword, который точно встречается в `description` (`Sony Playstation 4 Pro White Version` имеет `Sony` в name и brand — взять `playstation`).

- [ ] **Step 11.3: AC3 — product_recommendations toggle**

```bash
# Testing → 5
curl -s http://localhost:5000/api/products/top | python3 -c "import sys,json; print('count:', len(json.load(sys.stdin)))"
# Через MCP: set_feature_state("product_recommendations", "Disabled")
sleep 6
# Disabled → 3
curl -s http://localhost:5000/api/products/top | python3 -c "import sys,json; print('count:', len(json.load(sys.stdin)))"
# Через MCP: set_feature_state("product_recommendations", "Testing")
```
Expected: 5 → 3.

- [ ] **Step 11.4: AC4 + AC5 — photo_reviews + gift_message**

Уже проверены в Task 6/7. Можно ещё раз пересеять и повторить если нужно.

- [ ] **Step 11.5: AC6 — существующие гейты не сломаны**

`admin_advanced_filters`:
```bash
# admin token
ADMIN=$(curl -s -X POST http://localhost:5000/api/users/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s 'http://localhost:5000/api/products?priceMin=100' | python3 -c "import sys,json; print('count:', len(json.load(sys.stdin)['products']))"
```
Expected: меньше чем без фильтра (фильтр применился).

`verified_purchase_badge`:
```bash
PID=$(curl -s 'http://localhost:5000/api/products' | python3 -c "import sys,json; print(json.load(sys.stdin)['products'][0]['_id'])")
curl -s "http://localhost:5000/api/products/$PID" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['reviews']; print('verified field present:', all('verified' in x for x in r) if r else 'no reviews')"
```
Expected: `verified field present: True` или `no reviews` (если у seed-продукта нет отзывов).

- [ ] **Step 11.6: AC7+AC8 — admin UI**

В браузере:
1. Login as admin. Header → Admin → Feature Flags → таблица 25 строк ✓
2. Через MCP `set_feature_state("dark_mode", "Disabled")` → жмём Refresh → строка `dark_mode` имеет Badge `Disabled` (красный) и `✗` в Enabled ✓
3. Через MCP `set_feature_state("dark_mode", "Testing")` → Refresh → Testing (жёлтый), `✓` ✓

- [ ] **Step 11.7: AC9 — Refresh кнопка**

В DevTools Network открыть вкладку, во вкладке таблицы нажать Refresh → видеть новый запрос `/api/features` 200.

- [ ] **Step 11.8: AC10 — общий smoke**

1. Открыть главную `/` — товары грузятся, ProductCarousel показывает 5 топ (флаг on по дефолту).
2. Поиск через SearchBox — работает.
3. Добавить товар в корзину, открыть `/cart` — корзина работает.
4. Залогиниться, дойти до `/placeorder`, оформить заказ — заказ создаётся (тестово, без оплаты).
5. Admin → Users / Products / Orders — все списки открываются.

Если что-то из этого упало — фиксим в отдельной задаче.

---

### Task 12: Финальный коммит и метаданные

- [ ] **Step 12.1: Восстановить состояние флагов**

Через MCP вернуть все 4 фичи в `Testing` (если что-то осталось `Disabled` после тестирования):
- `get_feature_info("search_v2")` → должен быть Testing
- `get_feature_info("product_recommendations")` → Testing
- `get_feature_info("photo_reviews")` → Testing
- `get_feature_info("gift_message")` → Testing

Если какой-то не Testing — `set_feature_state(name, "Testing")`.

- [ ] **Step 12.2: Финальная проверка git log**

```bash
git log --oneline | head -15
```
Expected: видны коммиты Task 1-10 с понятными сообщениями.

- [ ] **Step 12.3: Финальная проверка статуса**

```bash
git status
```
Expected: `nothing to commit, working tree clean`.

Готово.

---

## Глоссарий проверочных endpoint'ов

| Endpoint | Что показывает |
|---|---|
| `GET /api/features` | 25 объектов с `display_name`, `description`, `enabled`, `status` и т.д. |
| `GET /api/features/:name` | Один объект или 404 |
| `GET /api/products?keyword=...` | Поиск — зависит от `search_v2` |
| `GET /api/products/top` | Top — зависит от `product_recommendations` |
| `POST /api/products/:id/reviews` | Принимает `photos` — зависит от `photo_reviews` |
| `POST /api/orders` | Принимает `giftMessage` — зависит от `gift_message` |
