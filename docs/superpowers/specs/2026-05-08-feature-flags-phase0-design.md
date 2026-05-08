# Feature Flags — Phase 0: Infrastructure

**Дата:** 2026-05-08
**Скоуп:** Phase 0 из 5 (только инфраструктура; фичи не реализуются)
**Источник истины:** `config/features.json` (управляется MCP-сервером `feature-flags`)

## 1. Цель

Подключить `config/features.json` к ProShop как single source of truth для фиче-флагов. Дать инфраструктуру для гейтинга кода в обоих слоях (backend и frontend) — без реализации самих фичей. Phase 0 — фундамент для Phases 1–5.

## 2. Контекст и решения

Решения, принятые в брейнсторминге (фиксируем здесь, чтобы не плавали):

| Вопрос | Решение |
|---|---|
| Скоуп | Все 5 фаз; делаются последовательно; Phase 0 — этот спек |
| `traffic_percentage` | **Не реализуем.** Резолвер игнорирует процент. Поле читается и прокидывается в API-ответе как метаинформация, но не влияет на `enabled` |
| `targeted_segments` | **Не реализуем.** Поле читается и прокидывается, но не используется в резолюции |
| Зависимости (`dependencies`) | Учитываем рекурсивно. Если любая зависимость в `Disabled` → фича `false` |
| Аномалии в `features.json` | Файл не трогаем (текущее состояние: все 25 фич `Testing`/`90%`) |
| Декомпозиция | Phase 0 — отдельный design+plan; следующие фазы — свои отдельно |

## 3. Архитектура

```
config/features.json                           ← MCP пишет (atomic tmp+rename)
       │
       ▼
backend/utils/featureFlags.js                  ← loader + resolver + TTL cache (5s)
       │
       ├─→ программный API: isFeatureEnabled(name) для контроллеров/middleware (Phase 1+)
       │
       └─→ HTTP: GET /api/features
                      │
                      ▼
              frontend Redux slice (featureFlagsReducer)
                      │
                      ▼
              useFeatureFlag(name) hook → компоненты (Phase 1+)
```

**Принцип распределения гейтинга:**
- Backend = source of truth + защита данных/действий
- Frontend = UX-слой, скрывает UI там, где бэк не участвует
- Mixed-фичи гейтятся в обоих слоях
- Security-чувствительные действия (admin, write, payment) **обязательно** дублируются backend-гейтом

## 4. Backend компоненты

### 4.1. `backend/utils/featureFlags.js`

Единая точка работы с флагами. Экспортирует:

- `loadFeatures(): Promise<FeaturesFile>` — читает `config/features.json` через `fs.promises.readFile`. Путь резолвится относительно файла модуля. Так как проект использует ESM (`"type": "module"`), `__dirname` получаем через `fileURLToPath(import.meta.url)`. Из `backend/utils/featureFlags.js` путь к файлу: `path.resolve(__dirname, '../../config/features.json')`.
- `getFeature(name): Promise<Feature | null>` — сырой объект из файла или `null` если не найдено.
- `getAllFeatures(): Promise<ResolvedFeature[]>` — массив всех фичей с резолвед `enabled`.
- `isFeatureEnabled(name): Promise<boolean>` — резолвер.

**Резолвер `isFeatureEnabled`:**

```
isFeatureEnabled(name, visited = new Set()):
  if visited.has(name) → false (cycle protection, console.warn)
  visited.add(name)
  feature = await getFeature(name)
  if !feature → false (unknown flag → fail closed)
  if feature.status === "Disabled" → false
  for dep in (feature.dependencies ?? []):
    if !await isFeatureEnabled(dep, visited) → false
  return true   // status ∈ {Testing, Enabled} → on
```

**TTL cache:**
- В модуле — `let cache = { mtime: 0, data: null }`.
- При вызове любой функции — если прошло >5000ms с последнего чтения, читаем файл заново.
- Если чтение/парсинг упали — лог через `console.error`, кэш не обновляем (последнее валидное состояние сохраняется), при пустом кэше — `data = {}` (fail closed).

**Стабы:**
- `traffic_percentage` и `targeted_segments` читаются из файла и попадают в ответ API без изменений. В резолюции **игнорируются**. В коде — комментарий `// TODO Phase X: implement traffic rollout / segment targeting`.

### 4.2. `backend/controllers/featureController.js`

Контроллеры в стиле проекта (`express-async-handler`, `throw new Error` на ошибках):

- `getFeatures(req, res)` — возвращает массив `ResolvedFeature[]` через `getAllFeatures()`.
- `getFeatureByName(req, res)` — `req.params.name`. Если не найдено — `res.status(404); throw new Error('Feature not found')`.

### 4.3. `backend/routes/featureRoutes.js`

```js
router.get('/', getFeatures)
router.get('/:name', getFeatureByName)
```

Public — без `protect` middleware. Файл флагов не содержит секретов.

### 4.4. `backend/server.js`

Добавить:
```js
import featureRoutes from './routes/featureRoutes.js'
app.use('/api/features', featureRoutes)
```

## 5. API contract

### `GET /api/features`

**Response 200:**
```json
[
  {
    "name": "gift_message",
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

Поле `enabled` — резолвед булевый результат (учёт `status` + рекурсивных `dependencies`). Остальные поля — сырые из `features.json` для UI/дебага.

**Response 500** (файл недоступен / невалидный JSON):
```json
{ "message": "Feature flags file unavailable" }
```

### `GET /api/features/:name`

**Response 200:** один объект из массива выше.
**Response 404:**
```json
{ "message": "Feature not found" }
```

## 6. Frontend компоненты (классический Redux, без RTK)

### 6.1. `frontend/src/constants/featureFlagsConstants.js`
```js
export const FEATURE_FLAGS_REQUEST = 'FEATURE_FLAGS_REQUEST'
export const FEATURE_FLAGS_SUCCESS = 'FEATURE_FLAGS_SUCCESS'
export const FEATURE_FLAGS_FAIL = 'FEATURE_FLAGS_FAIL'
```

### 6.2. `frontend/src/actions/featureFlagsActions.js`
Thunk `loadFeatureFlags()` → `axios.get('/api/features')` → SUCCESS с массивом, FAIL с error message. Стандартный паттерн проекта (см. `productActions.js` как референс).

### 6.3. `frontend/src/reducers/featureFlagsReducer.js`
State shape:
```js
{
  loading: false,
  flags: { [name]: ResolvedFeature },   // объект для O(1) lookup
  error: null
}
```
Преобразование массива → объект делается в reducer'е на SUCCESS.

### 6.4. `frontend/src/store.js`
Подключить `featureFlagsReducer` в `combineReducers`. Гидратация из localStorage **не нужна** — флаги загружаем при каждом старте приложения, чтобы не работать со stale state.

### 6.5. `frontend/src/App.js`
В `useEffect(() => dispatch(loadFeatureFlags()), [])` при mount. До успешной загрузки `flags` будет `{}` — все хуки вернут `false`. Это намеренно: fail closed.

### 6.6. `frontend/src/hooks/useFeatureFlag.js`
```js
export const useFeatureFlag = (name) =>
  useSelector((state) => state.featureFlags.flags[name]?.enabled ?? false)
```

Без хука можно и через `useSelector` напрямую — но хук читабельнее в компонентах.

## 7. Data flow при изменении

1. MCP-tool (`set_feature_state` / `adjust_traffic_rollout`) → atomic write в `config/features.json` (tmp + rename, уже реализовано в `mcp-server-demo/src/index.ts`)
2. Backend: следующий запрос после истечения TTL (5s) → re-read → новые значения в кэше
3. Frontend: уже загруженные флаги остаются в Redux до перезагрузки страницы или явного `loadFeatureFlags()`. Auto-refresh (polling) — **не делаем** в Phase 0 (YAGNI). Если понадобится — дёшево добавить в Phase 1+.

## 8. Обработка ошибок

| Ситуация | Поведение | Где |
|---|---|---|
| `config/features.json` отсутствует | `console.error`, кэш data=`{}`, `getAllFeatures()`→`[]`, `isFeatureEnabled()`→`false` | `featureFlags.js` |
| Невалидный JSON | То же | `featureFlags.js` |
| Имя фичи неизвестно | `isFeatureEnabled()`→`false`; `getFeatureByName` → 404 | `featureFlags.js` / `featureController.js` |
| Циклическая зависимость | `console.warn` + `false` | резолвер |
| Backend недоступен на фронте | thunk диспатчит FAIL, `flags={}`, все хуки → `false` | `featureFlagsActions.js` |

**Принцип:** fail closed во всех путях ошибки. Лучше выключить фичу, чем включить «случайно».

## 9. Что НЕ делаем в Phase 0

- ❌ Не интегрируем флаги в существующие контроллеры (`productController` и т.п.). Все интеграции — Phases 1–5.
- ❌ Не реализуем фичи (`gift_message`, `search_autosuggest` и т.д.).
- ❌ Не делаем admin UI для управления флагами (управление — через MCP).
- ❌ Не реализуем `traffic_percentage` и `targeted_segments` (стабы с TODO).
- ❌ Не делаем тесты (по правилу из CLAUDE.md — добавляем только если попросят).
- ❌ Не делаем auto-refresh флагов на фронте (YAGNI).

## 10. Тестирование

По правилу из `CLAUDE.md`: тесты автоматически не добавляются. Если в плане реализации появится явный пункт «добавить тесты» — спросить пользователя.

Кандидаты на unit-тесты (если пользователь захочет):
- `isFeatureEnabled`: status=Disabled → false; неизвестная фича → false; зависимости (один уровень и рекурсивно); цикл.
- `getAllFeatures`: формат ответа, поля прокинуты.

Кандидаты на integration:
- `GET /api/features` отдаёт ожидаемый shape.
- `GET /api/features/:name` 404 на неизвестной.

Ручная проверка после имплементации:
1. `npm run dev` поднимает оба слоя.
2. `curl http://localhost:5000/api/features` → массив 25 объектов.
3. Через MCP `set_feature_state({feature_name: 'gift_message', state: 'Disabled'})` → через ≥5 секунд запрос возвращает `enabled: false` для `gift_message`.
4. Frontend в DevTools: Redux state `featureFlags.flags` — заполнен после монтирования App.

## 11. Изменения в существующих файлах

| Файл | Изменение |
|---|---|
| `backend/server.js` | +1 import, +1 `app.use(...)` |
| `frontend/src/store.js` | +1 import, +1 запись в `combineReducers` |
| `frontend/src/App.js` | +`useEffect` для `loadFeatureFlags()` |

## 12. Новые файлы

| Файл | Назначение |
|---|---|
| `backend/utils/featureFlags.js` | loader + resolver + TTL cache |
| `backend/controllers/featureController.js` | контроллеры getFeatures, getFeatureByName |
| `backend/routes/featureRoutes.js` | роутер `/api/features` |
| `frontend/src/constants/featureFlagsConstants.js` | action types |
| `frontend/src/actions/featureFlagsActions.js` | thunk `loadFeatureFlags` |
| `frontend/src/reducers/featureFlagsReducer.js` | reducer + initial state |
| `frontend/src/hooks/useFeatureFlag.js` | хук-обёртка |

## 13. Acceptance criteria

Phase 0 считается выполненной, когда:

1. ✅ `GET /api/features` возвращает 25 фичей с резолвед `enabled` для дефолтного состояния файла (все Testing/90% → все `enabled: true`).
2. ✅ `GET /api/features/:name` отдаёт 404 на неизвестное имя.
3. ✅ Изменение `status` через MCP отражается в API-ответе после истечения TTL (≤6 секунд).
4. ✅ Изменение зависимости в `Disabled` каскадом выключает зависимые фичи (`enabled: false`).
5. ✅ Frontend при загрузке App успешно дёргает `/api/features` и заполняет Redux state.
6. ✅ Hook `useFeatureFlag('any_known_name')` возвращает корректный boolean в любом компоненте.
7. ✅ Существующая функциональность ProShop не сломана (smoke-тест: главная грузится, корзина работает, можно залогиниться, чекаут проходит).

## 14. Следующая фаза

После одобрения и реализации Phase 0 переходим к **Phase 1 — Drift fixes** (`image_lazy_loading`, `recently_viewed`, `verified_purchase_badge`, `admin_advanced_filters`). Спек на Phase 1 пишется в момент перехода, не сейчас.
