# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ProShop — учебное eCommerce-приложение на стеке MERN (MongoDB, Express, React, Node) с классическим Redux. Включает корзину, отзывы и рейтинги товаров, поиск и пагинацию, профиль пользователя с историей заказов, админ-панель для управления товарами/пользователями/заказами и оплату через PayPal. Репозиторий помечен в README как deprecated; актуальная версия курса — `proshop-v2` на Redux Toolkit.

## Tech Stack

- **Backend**: Node.js (рекомендуется v16; v20 не работает), Express 4, Mongoose 5, JWT (`jsonwebtoken`), bcryptjs, multer, morgan, `express-async-handler`. В корневом `package.json` указано `"type": "module"` — backend использует нативные ES-модули.
- **Frontend**: Create React App (`react-scripts` 3.4), React 16, React Router v5, классический Redux 4 + `redux-thunk` (НЕ Redux Toolkit), axios, react-bootstrap, `react-paypal-button-v2`, `react-helmet`.
- **Инфраструктура**: `concurrently` + `nodemon` для dev-режима, скрипт `heroku-postbuild` для деплоя на Heroku.

### Обязательные переменные окружения (`.env` в корне)

```
NODE_ENV, PORT, MONGO_URI, JWT_SECRET, PAYPAL_CLIENT_ID
```

`PAYPAL_CLIENT_ID` отдаётся фронтенду через `GET /api/config/paypal` — клиент запрашивает его в рантайме перед инициализацией PayPal SDK.

## Architecture

Двухслойное приложение: Express/Mongoose JSON API под `/api/*` и SPA на CRA + Redux. В production-режиме Express одновременно отдаёт собранный фронтенд и делает fallback на `index.html` для клиентских маршрутов (`backend/server.js:38-43`).

### Backend (`backend/`)

Слои организованы классически: `routes/` → `controllers/` → `models/`. Каждый ресурс (`product`, `user`, `order`, `upload`) представлен соответствующими файлами во всех трёх папках.

- **Обработка ошибок**: контроллеры обёрнуты в `express-async-handler` и бросают ошибки через `throw new Error(...)` после вызова `res.status(...)`. Middleware `notFound` и `errorHandler` в `middleware/errorMiddleware.js` превращают их в JSON-ответы. Не оборачивайте контроллеры в try/catch — пусть ошибки идут в middleware.
- **Аутентификация**: `middleware/authMiddleware.js` экспортирует `protect` (читает JWT из `Authorization: Bearer <token>` и кладёт `req.user`) и `admin` (требует `req.user.isAdmin`). Админские маршруты комбинируют их в порядке `protect, admin`, например `.post(protect, admin, createProduct)` в `backend/routes/productRoutes.js`.
- **JWT**: выпускается в `userController.js` через `utils/generateToken.js`, подписывается `JWT_SECRET`, срок жизни 30 дней. Refresh-flow нет — фронтенд хранит `userInfo` (включая токен) в `localStorage` и шлёт его в каждом запросе.
- **Загрузка файлов**: `routes/uploadRoutes.js` использует `multer`, пишет в `/uploads` (только jpg/jpeg/png) и возвращает относительный путь. `/uploads` отдаётся статикой во всех окружениях.
- **БД**: `config/db.js` подключает Mongoose при старте. Модели: `productModel.js` (встраивает массив `reviews[]`), `userModel.js` (pre-save hook с bcrypt + метод `matchPassword`), `orderModel.js` (встраивает `orderItems[]`, `shippingAddress`, `paymentResult`).

### Frontend (`frontend/src/`)

Классический Redux (НЕ Redux Toolkit): параллельные папки `constants/`, `actions/`, `reducers/` для каждого домена (`product`, `cart`, `user`, `order`). Каждый асинхронный action — это thunk, диспатчащий триаду `_REQUEST` / `_SUCCESS` / `_FAIL` и обращающийся к API через axios. `store.js` подключает каждый reducer вручную.

- **Гидратация состояния**: `cartItems`, `shippingAddress` и `userInfo` восстанавливаются из `localStorage` в `initialState` в `store.js`. Действия, изменяющие их, обязаны записывать обратно в `localStorage` (ищите `setItem` в actions корзины и пользователя).
- **Роутинг**: `App.js` объявляет маршруты в стиле React Router v5 (`<Route component={...}/>`, а НЕ v6 `element`). Админские экраны живут под `/admin/*`. Главная поддерживает опциональные параметры `:keyword` и `:pageNumber` для поиска и пагинации.
- **API base URL**: фронтенд использует относительные пути (`/api/...`) и в dev полагается на поле `proxy` в `frontend/package.json`, которое проксирует на `http://127.0.0.1:5000`. В production те же запросы обрабатывает same-origin Express.
- **PayPal**: `OrderScreen` динамически подгружает PayPal SDK с client ID из `/api/config/paypal`, затем рендерит `react-paypal-button-v2`.

### Пример сквозного потока запроса

Размещение заказа: `PlaceOrderScreen` → thunk `createOrder` (`actions/orderActions.js`) → `POST /api/orders` с заголовком `Bearer` → middleware `protect` → контроллер `addOrderItems` → `Order.create(...)` → ответ диспатчит `ORDER_CREATE_SUCCESS` → переход на `/order/:id`.

## Commands

Все команды запускаются из корня репозитория, если не указано иное. У backend и frontend свои `package.json`; корневой `package.json` оркестрирует оба.

- `npm install` затем `cd frontend && npm install` — установка двумя шагами
- `npm run dev` — параллельный запуск backend (`:5000`) и CRA frontend (`:3000`)
- `npm run server` — только backend под nodemon
- `npm run client` — только frontend (проксирует `/api/*` на `127.0.0.1:5000`)
- `npm start` — backend без nodemon (используется в production)
- `npm run data:import` / `npm run data:destroy` — наполнить/очистить Mongo через `backend/seeder.js` и фикстуры из `backend/data/*.js`
- `cd frontend && npm run build` — production-сборка CRA (отдаётся Express при `NODE_ENV=production`)
- `cd frontend && npm test` — Jest-runner от CRA. Бэкенд-тестов в репозитории нет. Запуск одного теста: `cd frontend && npm test -- -t "название теста"` или указать путь к файлу: `cd frontend && npm test -- path/to/file.test.js`
- `heroku-postbuild` ставит зависимости фронтенда и собирает его — для деплоя на Heroku ручная сборка не нужна

### Тестовые учётные записи (после `data:import`)

```
admin@example.com / 123456 (Admin)
john@example.com  / 123456 (Customer)
jane@example.com  / 123456 (Customer)
```

## Conventions

- Backend импортирует локальные файлы **с расширением `.js`** — это требование нативного ESM в Node. Без него Node бросит "module not found".
- Контроллеры **бросают** ошибки через `throw new Error(...)`; не возвращайте ошибочные ответы вручную — это работа `errorHandler`.
- Админские маршруты всегда используют middleware в порядке `protect, admin`.
- При добавлении нового Redux-слайса проведите его через все четыре точки: `constants/` → `actions/` → `reducers/` → `combineReducers` в `store.js`.
- Если состояние должно переживать перезагрузку страницы — добавьте `localStorage.setItem(...)` в соответствующих actions и регидрацию в `store.js` (как сделано для `cartItems`, `shippingAddress`, `userInfo`).
- Используйте Node 16. README прямо отмечает, что Node 20 не работает.

- При изменениях в коде запускай тесты, которые касаются изменений. Если тестов нет - добавлять автоматически их не нужно. Спрашивай явно, необходимо ли их добавить.
- При изменениях в коде запускай линты и форматирование, если они настроены. 
- Если при работе с кодом ты видишь ошибки, которые не связаны с решением текущей задачи(например, старые ошибки Typescript, либо уязвимости), не нужно их автоматически исправлять. Необходимо явно дополнительно спрашивать, надо ли это исправлять. 
- При необходимости установки новых бибилотек явно спрашивай, нужно ли это. Также проверяй нельяз ли использовать уже установленные, а также потенциальную совместимость новой библиотеки с уже установленными. 

## What NOT to do

- **Не оборачивайте контроллеры в try/catch** — `express-async-handler` + `errorHandler` уже обрабатывают исключения; ручной try/catch ломает единый формат ответов.
- **Не опускайте `.js`** при импорте локальных модулей в backend — Node ESM упадёт с "module not found".
- **Не используйте API React Router v6** (`element={...}`, `Routes`) — здесь v5 с `component={...}` и `Switch`.
- **Не подключайте Redux Toolkit / `createSlice`** — здесь классический Redux с тройкой constants/actions/reducers; смешивание стилей создаст путаницу. Для современной версии существует отдельный репозиторий `proshop-v2`.
- **Не складывайте посторонние ассеты в `/uploads`** — папка отдаётся статикой и предназначена только для пользовательских загрузок (jpg/jpeg/png через multer).
- **Не забывайте про `localStorage`-гидратацию** при добавлении Redux-состояния, которое должно переживать перезагрузку.
- **Не добавляйте middleware `admin` без `protect`** перед ним — `admin` читает `req.user`, который выставляется только в `protect`.
- **Не апгрейдите Node до 20** в рамках текущего проекта без явной миграции — README прямо предупреждает о несовместимости.
