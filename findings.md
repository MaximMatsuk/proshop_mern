# ProShop MERN — Senior Quality Review

**Дата ревью:** 2026-04-26
**Ветка:** `master`
**Скоуп:** backend (Express/Mongoose), frontend (CRA/Redux), корневой `package.json`.

Цель: найти hotspots, edge cases, устаревшие зависимости, хардкод и dead code.
Методология: проверка ключевых контроллеров/middleware/роутов напрямую, чтения `package.json` обоих воркспейсов, верификация утверждений по исходникам (без доверия к номерам строк).

---

## Топ-5 находок (по риску)

| # | Где | Что не так | Уровень | Как исправить |
|---|-----|------------|---------|----------------|
| 1 | ~~`backend/server.js` (монтирование `/api/upload`) + `backend/routes/uploadRoutes.js`~~ | ~~Эндпоинт загрузки файлов **не защищён** middleware `protect, admin`, не ограничен `limits.fileSize`, а `checkFileType` доверяет `mimetype` и расширению (оба подконтрольны клиенту). Любой анонимный клиент может заливать произвольные файлы в `/uploads`, который раздаётся статикой → DoS по диску + потенциальный stored-XSS через svg/html, замаскированный под jpg.~~ | ✅ **FIXED** (commit `ad349dd`) | ~~Поставить `protect, admin` перед `upload.single('image')`, добавить `multer({ limits: { fileSize: 2_000_000 } })` и проверять magic bytes (`file-type`), а не mimetype.~~ |
| 2 | `backend/controllers/orderController.js:updateOrderToPaid` | Маршрут `/api/orders/:id/pay` использует только `protect` — **нет проверки владельца** (`order.user === req.user._id`), любой залогиненный юзер помечает чужой заказ оплаченным (IDOR). Дополнительно `req.body.payer.email_address` упадёт, если `payer` отсутствует, и нет идемпотентности — повторный вызов перезаписывает `paidAt`. | 🔴 critical | Добавить проверку `order.user.equals(req.user._id)` (или admin), guard `if (order.isPaid) throw …`, и опциональный chaining/валидацию `payer`. |
| 3 | Корневой `package.json` + `frontend/package.json` (весь стек) | Зависимости очень устарели и часть имеет публичные CVE: `mongoose ^5.10` (EOL, `.remove()` уже зовётся в `deleteProduct`/`deleteUser` — сломается на v7+), `jsonwebtoken ^8.5` (CVE-2022-23529 — algorithm confusion), `axios ^0.20` (SSRF/prototype-pollution), `bcryptjs ^2.4.3` (2016), `react ^16.13` + `react-scripts 3.4.3`, `react-router-dom ^5`, `react-paypal-button-v2` — пакет архивирован автором. | 🔴 critical | Спланировать поэтапный апгрейд: jsonwebtoken→9, axios→1.x, mongoose→8 (с заменой `.remove()` на `.deleteOne()`), отдельной вехой — react/CRA→Vite+React 18, router→v6, PayPal→`@paypal/react-paypal-js`. |
| 4 | `backend/controllers/productController.js:getProducts` | `req.query.keyword` пробрасывается прямо в `$regex` без экранирования → regex-injection и ReDoS на специально сформированной строке (`(a+)+$` и т.п.). | 🟡 medium | Экранировать ввод (`escape-string-regexp`) или анкорить `^…` + ограничить длину keyword до ~64 символов. |
| 5 | `frontend/src/screens/PlaceOrderScreen.js` (расчёт цен) + `backend/utils/generateToken.js` + `backend/controllers/productController.js:getProducts` | Магические числа бизнес-логики разбросаны по фронту и бэку: налог `0.15`, порог бесплатной доставки `100`/`shipping=100`, `pageSize=10`, JWT `expiresIn '30d'`, дефолтная картинка `/images/sample.jpg`. Серверу и клиенту легко разойтись (фронт считает total, бэк ему верит — см. `addOrderItems`, который принимает `totalPrice` из тела запроса). | 🟡 medium | Вынести константы в `backend/config/pricing.js` + `.env` (`JWT_EXPIRES_IN`, `PAGE_SIZE`, `TAX_RATE`, `FREE_SHIPPING_THRESHOLD`); итоговую сумму **пересчитывать на сервере** в `addOrderItems`, а не доверять клиенту. |

---

## Дополнительные находки (вне топ-5)

### HOTSPOTS

- **`backend/middleware/authMiddleware.js:protect`** — поток управления допускает `next()` внутри `try`, после чего код всё равно проваливается на `if (!token)`. Если токен валиден, эта ветка просто не сработает (token уже set), но сама структура хрупкая и провоцирует баги при рефакторинге. 🟢 cosmetic. Перейти на ранний `return next()` после успешной верификации.
- **`frontend/src/screens/OrderScreen.js`** — компонент совмещает динамическую загрузку PayPal SDK, обработку оплаты и отображение деталей заказа; `useEffect` с самописным `addPayPalScript` добавляет `<script>` в `<body>` без удаления при размонтировании. 🟡 medium. Разбить на хуки/компоненты, использовать `@paypal/react-paypal-js`.

### EDGE CASES

- **`backend/controllers/orderController.js:addOrderItems`** — guard `if (orderItems && orderItems.length === 0)` срабатывает только на пустом массиве; `null`/`undefined`/не-массив проскакивает дальше и падает в Mongoose. Плюс недостижимый `return` после `throw`. 🟡 medium. Заменить на `if (!Array.isArray(orderItems) || orderItems.length === 0) { … }`.
- **`backend/controllers/userController.js:registerUser` / `updateUserProfile`** — нет валидации формата email и сложности пароля; пустая строка/одиночный символ принимаются. 🟡 medium. Подключить `express-validator` или Joi с минимальной длиной 8 и regex для email.
- **`backend/controllers/userController.js:deleteUser`** — нет защиты от удаления самого себя или единственного админа. 🟡 medium. Добавить guard на `req.user._id !== user._id` и/или флаг «последний админ».
- **`backend/controllers/productController.js:createProductReview`** — деление `reduce(...) / product.reviews.length` безопасно (после `push` длина ≥ 1), но `Number(rating)` без `isNaN`/clamp в [1..5] — можно записать рейтинг 999. 🟢 cosmetic. Валидировать диапазон.
- **Все контроллеры с `findById(req.params.id)`** — невалидный ObjectId роняет запрос с CastError → 500 вместо 404. 🟢 cosmetic. Глобально обрабатывать CastError в `errorMiddleware` или валидировать ID.

### OUTDATED DEPS (детально)

- `mongoose ^5.10.6` — EOL с 2024; `product.remove()` / `user.remove()` удалены в v7. Миграция: `findByIdAndDelete` или `doc.deleteOne()`.
- `jsonwebtoken ^8.5.1` — CVE-2022-23529 (algorithm confusion). Обновить до `^9.0.2`.
- `axios ^0.20.0` — серия CVE (SSRF, prototype pollution в `formToJSON`). Обновить до `^1.7.x`.
- `bcryptjs ^2.4.3` — последний релиз 2017. Альтернатива: native `bcrypt ^5` или Argon2.
- `react ^16.13.1` + `react-dom` — отсутствуют concurrent features, automatic batching, Suspense for data. CRA `react-scripts 3.4.3` тащит за собой устаревший webpack 4 и десятки уязвимостей в transitive deps.
- `react-router-dom ^5.2.0` — API v6 принципиально другое (`Routes`, `element=`, `useParams`). Миграция плановая, но обязательная.
- `react-paypal-button-v2` — npm-пакет помечен deprecated. Канон: `@paypal/react-paypal-js`.
- `redux ^4` без Redux Toolkit — много boilerplate. Миграция опциональна (есть отдельный `proshop-v2`), но желательна для новых фич.
- Корневой `package.json` не пинит Node engine — README требует Node 16, но это не enforced. 🟢 cosmetic. Добавить `"engines": { "node": ">=16 <21" }`.

### HARDCODED VALUES

- `backend/utils/generateToken.js` — `expiresIn: '30d'`.
- `backend/controllers/productController.js:getProducts` — `pageSize = 10`.
- `backend/controllers/productController.js:createProduct` — стрэинговые заглушки `'Sample name' / 'Sample brand' / 'Sample category' / '/images/sample.jpg'`.
- `frontend/src/screens/PlaceOrderScreen.js` — налог 0.15, бесплатная доставка от 100, shipping = 100.
- `frontend/package.json` — `proxy: "http://127.0.0.1:5000"` (для dev — приемлемо, но стоит хотя бы прокомментировать).
- `backend/server.js` — `PORT || 5000` дублируется в README/proxy/env — единая точка истины желательна.

### DEAD CODE / ЛИШНИЕ КОНСТРУКЦИИ

- `backend/controllers/orderController.js:addOrderItems` — `else` обнимает основное тело (всё, что после `throw`, недостижимо без `else`). Плюс `return` после `throw new Error`.
- `frontend/src/serviceWorker.js` — стандартный CRA boilerplate, в `index.js` вызов закомментирован (`serviceWorker.unregister()` не зовётся), файл не используется. Удалить.
- `backend/server.js` — `app.listen(PORT, console.log(...))` — `console.log` вызывается **немедленно**, а не как callback (передаётся `undefined`). 🟢 cosmetic. Заменить на стрелку: `() => console.log(...)`.
- В нескольких контроллерах — паттерн `if (entity) { … } else { res.status(404); throw … }` повторяется 6+ раз. Можно вынести в helper `requireEntity(entity, name)`.

---

## Сводная статистика

| Категория | 🔴 critical | 🟡 medium | 🟢 cosmetic |
|-----------|:-----------:|:---------:|:-----------:|
| Hotspots | 0 | 1 | 1 |
| Edge cases | 0 | 3 | 2 |
| Outdated deps | 1 (общий стек) | — | 1 |
| Hardcoded | — | 1 (топ-5) | 5 |
| Dead code | — | — | 4 |

Критических, требующих фикса до прод-релиза: **2** (см. топ-5 №2–3; №1 закрыт коммитом `ad349dd`). Остальное — нормальный технический долг.

## Рекомендуемая последовательность работ

1. Закрыть IDOR в `updateOrderToPaid`. ~~Навесить auth на `/api/upload`~~ — сделано в `ad349dd`.
2. Перевести расчёт `totalPrice` на сервер (фронт перестаёт быть source of truth).
3. Bump security-критичных зависимостей: `jsonwebtoken`, `axios`, `mongoose` (с заменой `.remove()`).
4. Отдельной вехой — миграция фронта (CRA→Vite, React 16→18, router v5→v6, классический Redux→RTK или переход на `proshop-v2`).
