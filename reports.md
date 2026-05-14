## M3
Claude code CLI. Делал в cursor, но не использовали никаких его "плюшек". Пока думаю, нужно ли продлевать его подписку

Rules diff: 
добавил 4 правила работы с кодом в Conventions (через пустую строку от сгенеренных). Зачем - для точности работы с кодом, основываясь на опыте предыдущем. 

запустил локально через docker mongo + npm run dev
обновил readme

добавил mermaid диаграму

## M3
Использовал cursor
часть 1 - photos

- часть 2 
 выбрал qdrant - бесплатная, предлагается как "основная" + "дефолтная на 2026 год"
 выбрал bge-m3. поставил через ollama
 injection script через @qdrant/qdrant-js
 скрипты в scripts, чанки в data
тест запросов:
                                                                                                                                                                                                                                                               
  Результаты 3 запросов (top-3, без фильтров кроме отмеченного)                                                                                
                                                                                                                                               
  Q1 — «Какая БД используется в proshop_mern и почему именно она?»                                                                             
                                                                                                                                               
  ┌─────┬────────┬───────────────────┬──────────────────────────────────────────────────────────────────┐                                      
  │  #  │ score  │      source       │                             chunk_id                             │                                      
  ├─────┼────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤                                      
  │ 1   │ 0.6832 │ architecture.md   │ architecture__0                                                  │
  ├─────┼────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ 2   │ 0.6543 │ best-practices.md │ best-practices__1-introduction-why-proshop-mern-is-deprecated__1 │                                      
  ├─────┼────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤                                      
  │ 3   │ 0.6430 │ dev-history.md    │ dev-history__0                                                   │                                      
  └─────┴────────┴───────────────────┴──────────────────────────────────────────────────────────────────┘                                      
                                         
  Ожидали ADR-001 — он не попал даже в top-10. Все 10 первых из toplevel. Это miss.                                                            
                                           
  Q2 — «Какие фичи зависят от payment_stripe_v3?»                                                                                              
                                       
  ┌─────┬────────┬─────────────────────────────┬──────────────────────────────────────────────────────────┐                                    
  │  #  │ score  │           source            │                         chunk_id                         │
  ├─────┼────────┼─────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ 1   │ 0.6767 │ adr-004-paypal-vs-stripe.md │ …alternatives-considered__3                              │
  ├─────┼────────┼─────────────────────────────┼──────────────────────────────────────────────────────────┤
  │ 2   │ 0.6647 │ adr-004-paypal-vs-stripe.md │ …alternatives-considered__4                              │                                    
  ├─────┼────────┼─────────────────────────────┼──────────────────────────────────────────────────────────┤                                    
  │ 3   │ 0.6334 │ feature-flags-spec.md       │ …4-feature-flag-catalog__16 (про paypal_express_buttons) │                                    
  └─────┴────────┴─────────────────────────────┴──────────────────────────────────────────────────────────┘                                    
                                         
  Корня "странности" нет: grep payment_stripe_v3 по корпусу пустой — сущности не существует. Модель честно вернула семантически близкое        
  (Stripe-альтернатива в ADR + спека флагов платежей). Это разумная деградация на запросе про несуществующее.
                                                                                                                                               
  Q3 — «Что случилось во время последнего incident с checkout?» (--group incidents)                                                            
                                         
  ┌─────┬────────┬───────────────────────────────┬─────────────────────────┐                                                                   
  │  #  │ score  │            source             │        chunk_id         │
  ├─────┼────────┼───────────────────────────────┼─────────────────────────┤
  │ 1   │ 0.5724 │ i-001-paypal-double-charge.md │ …timeline__1            │
  ├─────┼────────┼───────────────────────────────┼─────────────────────────┤
  │ 2   │ 0.5576 │ i-001-paypal-double-charge.md │ …summary__0             │                                                                   
  ├─────┼────────┼───────────────────────────────┼─────────────────────────┤                                                                   
  │ 3   │ 0.5500 │ i-001-paypal-double-charge.md │ …root-cause-analysis__3 │                                                                   
  └─────┴────────┴───────────────────────────────┴─────────────────────────┘                                                                   
                                         
  Hit, и довольно чистый. Все 3 — секции одного инцидента (PayPal double-charge), который и есть единственный checkout-релевантный (других про 
  checkout в корпусе нет). Слово "последнего" модель проигнорировала — dense vector retrieval не умеет в recency, в payload даты тоже нет, для
  recency нужен score-by-payload или sort-by-field. Если важно — добавим.                                                                      
                                           
  ---                                    
  Что починить                             
                                         
  Q1 — это реальный bug ранжирования. Я разобрал причину. Дополнительно прогнал тот же запрос:
                                                                                                                                               
  - На английском ("MongoDB Mongoose database choice") → ADR-001 на #1, #2, #3 со score 0.65                                                   
  - С фильтром --group adrs → ADR-001 на #1 со score 0.5843                                                                                    
  - Без фильтра по-русски → ADR-001 ниже #10 ❌                                                                                                
                                                                                                                                               
  Корневая причина — cross-lingual gap + структура чанков:                                                                                     
                                                                                                                                               
  1. Чанки ADR-001 — на английском (language: 'en', text/summary/keywords тоже EN). BGE-M3 кросс-язычен, но штраф на ru→en есть: тот же чанк по
   EN-запросу получает 0.65, по RU-запросу — 0.58.
  2. architecture.md доминирует на широких запросах. Чанк architecture__0 — общий обзор, в нём упомянуто всё (включая MongoDB+Mongoose), и он  
  начинается с буквальной строки "ProShop MERN" (имя репо есть в запросе → бонус). ADR-001 имени репозитория не содержит вообще.               
  3. Topic-specific вопросы тонут в "общих" документах — это известная слабость pure dense retrieval на смешанных корпусах.
                                                                                                                                               
  Что я бы предложил, по убыванию ROI (всё — обсудить, не делаю молча):                                                                        
                                                                                                                                               
  - (A) Hybrid retrieval (BM25 + dense, RRF) — самый надёжный фикс. Слово "БД" отдельной леммы, "MongoDB" — точное совпадение, BM25 поднимет   
  ADR-001 наверх. Qdrant поддерживает sparse-векторы нативно через named vectors. Добавит к ingest второй вектор (BGE-M3 у вас в Ollama
  dense-only, sparse надо отдельно — bge-m3 через FlagEmbedding или Qdrant FastEmbed).                                                         
  - (B) Query rewriting: переводить ru→en перед эмбеддингом (Ollama тем же bge-m3 или мелкий LLM). Дёшево и чинит именно этот класс случаев.
  Минус — сломается на смешанных запросах.                                                                                                     
  - (C) Inject source_file и title как префикс в текст чанка перед эмбеддингом — сейчас они только в payload. Это поднимет recall по запросам с
   именами артефактов ("proshop_mern", "ADR-001"). Требует ре-ingest.                                                                          
  - (D) Score threshold + "no good answer" сигнал — на Q2 макс score 0.67 при отсутствии сущности; разумный порог ~0.70 для cosine на BGE-M3
  даст fallback "не знаю" вместо галлюцинирующих результатов.                                                                                  
  - (E) Multilingual summaries в чанках: при формировании чанков добавить русский summary/keywords для документов на EN. Это работа на стороне
  finalize-chunks, не retrieval.                                                                                                               
                                           
  Какой из вариантов делаем? Я бы начал с (B) query rewriting — 30 строк кода, не трогает ingest, и проверит гипотезу про язык. Если после него
   Q1 ловит ADR-001 — значит, хватит. Если нет — проблема глубже, делаем (A) hybrid.
                                        

 я выбрал вариант б, с использованием Qwen  Qwen 1.5B. Он выполняет переводы перед запросом(хотя это не лучишй вариант, я думаю). + Словил баг, что на вопрос "какая бд" он сразу ответил сам,вместо простого перевода и запроса.

### Search-docs MCP

Прогон трёх вопросов через MCP-тул `search_project_docs` (Qdrant + Ollama bge-m3, опциональный RU→EN rewrite через Qwen). Для каждого вопроса — лог запросов, top‑K чанков (score / source / parent_headings / snippet) и синтез ответа.

---

#### Q1. Какая БД используется и почему?

**Запрос #1.1**
```json
{ "query": "Какая база данных используется в проекте и почему выбрали именно её", "top_k": 5 }
```
`rewritten_query`: `null` (rewrite=false).

| # | score | source_file | parent_headings | snippet (срез) |
|---|-------|-------------|-----------------|----------------|
| 1 | 0.5833 | `adr-001-mongodb-vs-postgres.md` | Context | "ADR-001: Use MongoDB (via Mongoose) as the Primary Database … Status: Accepted, Date: 2023-01-10 … Before the first commit…" |
| 2 | 0.5218 | `adr-001-mongodb-vs-postgres.md` | Alternatives Considered | "PostgreSQL (with Sequelize or Prisma ORM) … team's existing experience base. It would have…" |
| 3 | 0.5190 | `dev-history.md` | 3. Major Decisions | "Decision 1: MongoDB over PostgreSQL. Made in January 2023 before the first commit. The rationale: the product catalog has variable attribu…" |
| 4 | 0.5170 | `dev-history.md` | 3. Major Decisions | "Decision 3: Rejecting SSR / Next.js (late 2024) …" (мимо темы) |
| 5 | 0.5055 | `adr-005-bootstrap-vs-tailwind.md` | Alternatives Considered | мимо темы (Bootstrap/Tailwind) |

**Синтез ответа.** Чанки 1–3 дают полный ответ — fallback на `Read` не понадобился.

> Используется **MongoDB через Mongoose** (ADR-001, Accepted 2023-01-10). Причины (из ADR-001 + `dev-history.md` §3, «Decision 1»):
> 1. **Гибкая схема под каталог товаров** — у продуктов разный набор атрибутов, embedded-документы убирают необходимость в join‑таблицах.
> 2. **Скорость прототипирования** на MERN-стеке: тот же JSON в API, в БД и в React‑state, минимум маппинга.
> 3. **Соответствие учебному формату** — туториал и стандартные ресурсы по MERN ориентированы на MongoDB.
> Альтернативой был **PostgreSQL + Sequelize/Prisma** (у команды был опыт), но решили в пользу Mongo до первого коммита.

---

#### Q2. Какие фичи зависят от `payment_stripe_v3`?

Сделал последовательность запросов, потому что в первом ответе подходящий чанк не вернулся со снипетом, содержащим явный список зависимостей.

**Запрос #2.1**
```json
{ "query": "Какие фичи зависят от payment_stripe_v3", "top_k": 5 }
```

| # | score | source_file | parent_headings | snippet (срез) |
|---|-------|-------------|-----------------|----------------|
| 1 | 0.6583 | `adr-004-paypal-vs-stripe.md` | Alternatives Considered | "Stripe is now the team's preferred payment processor for new projects. Key advantages over PayPal…" |
| 2 | 0.6453 | `adr-004-paypal-vs-stripe.md` | Alternatives Considered | "Braintree (PayPal subsidiary) … offers Stripe-like developer experi…" |
| 3 | 0.6297 | `feature-flags-spec.md` | 4. Feature Flag Catalog | "Payments → `paypal_express_buttons` — PayPal Express Checkout Buttons. Default state: Enabled (100%)…" |
| 4 | 0.6238 | `features-analysis-ru.md` | 1. Что считать «обязательной» фичей… | "`multi_step_checkout_v2` …" |
| 5 | 0.5855 | `feature-flags-spec.md` | 3. MCP Server Tool Contract | таблица error-кодов (нерелевантно) |

**Запрос #2.2** (узкий)
```json
{ "query": "payment_stripe_v3 dependencies depends on feature flag", "top_k": 8 }
```
| # | score | source_file | parent_headings | snippet |
|---|-------|-------------|-----------------|---------|
| 1 | 0.6377 | `payments.md` | Feature 1: PayPal SDK Dynamic Loading → Зависимости | "Зависит от: `PAYPAL_CLIENT_ID` env var на сервере…" |
| 2 | 0.6271 | `feature-flags-spec.md` | 4. Feature Flag Catalog | `paypal_express_buttons` |
| 3 | 0.6194 | `feature-flags-spec.md` | 6. Best Practices | Flag Lifecycle and Cleanup Policy |
| 4 | 0.5984 | `feature-flags-spec.md` | 3. MCP Server Tool Contract | error codes |
| 5 | 0.5965 | `feature-flags-spec.md` | 4. Feature Flag Catalog | "**Typical rollout:** Already fully enabled. If the banner causes UX complaints…" |
| 6 | 0.5957 | `feature-flags-spec.md` | 3. MCP Server Tool Contract | `set_feature_state` |
| 7 | 0.5948 | `feature-flags-spec.md` | 4. Feature Flag Catalog | **"Start at 5% of all orders (canary). If payment success rate matches PayPal's baseline (~98%), expand to 25%"** ← это секция `stripe_alternative` |
| 8 | 0.5908 | `feature-flags-spec.md` | 3. MCP Server Tool Contract | `adjust_traffic_rollout` |

**Запрос #2.3** (с rewrite)
```json
{ "query": "список фич зависящих от stripe payment processor migration plan", "top_k": 5, "rewrite": true }
```
`rewritten_query`: `"list features dependent on stripe payment processor migration plan"`. Вернулись те же ADR‑004 + `feature-flags-spec` чанки про каталог Payments. Точного списка зависимостей в снипетах не было.

**Fallback: `Read`/`grep`.** Vector search дал нужный файл (`feature-flags-spec.md`) и метаданные, но снипеты обрезаны до **«Dependencies: …»**. По правилу из CLAUDE.md (vector search → если нужно полное содержимое исходника, fallback на Read) сделал точечный `grep` по `feature-flags-spec.md` и `mcp-server-demo/src/features.json`:

```
grep -n "payment_stripe_v3\|stripe" project-data/feature-flags-spec.md
grep -n "stripe\|payment"          mcp-server-demo/src/features.json
```

Результат: **флага `payment_stripe_v3` в проекте не существует**. Есть `stripe_alternative` (Stripe as Alternative Payment Processor) и `apple_pay`. В `feature-flags-spec.md:457–466` явно сказано: `stripe_alternative` → **Dependencies: None.** В `feature-flags-spec.md:444–453` для `apple_pay`: «Payment processor: Stripe (requires `stripe_alternative` to be in Testing or Enabled). **Dependencies: `stripe_alternative` must be active.**»

**Синтез ответа.**
> В корпусе **нет фичи `payment_stripe_v3`** — ни в `feature-flags-spec.md`, ни в `mcp-server-demo/src/features.json`. Ближайшая по смыслу — `stripe_alternative` («Stripe as Alternative Payment Processor», Testing 5%). От неё зависит ровно одна фича каталога:
> - **`apple_pay`** — нужен Stripe-бэкенд для платёжных интентов; `feature-flags-spec.md` прямо требует `stripe_alternative` в состоянии Testing/Enabled.
>
> Сама `stripe_alternative` зависимостей не имеет. Если имелась в виду какая‑то другая «v3»‑итерация Stripe — её в спеке не задокументировано; уточни ID. (Vector search корректно подтянул весь стрип-кластер, но именно несуществование флага видно только при чтении исходников — это разумная деградация семантического поиска по несуществующей сущности.)

---

#### Q3. Что случилось во время последнего incident с checkout?

**Запрос #3.1**
```json
{ "query": "последний incident с checkout что случилось", "top_k": 5 }
```
| # | score | source_file | parent_headings | snippet |
|---|-------|-------------|-----------------|---------|
| 1 | 0.6246 | `runbooks/incident-response.md` | Phase 6: Communication | таблица timeline (общий runbook, не сам инцидент) |
| 2 | 0.5877 | `runbooks/incident-response.md` | Phase 7: Post-Incident → Postmortem | шаблон постмортема |
| 3 | 0.5697 | `i-001-paypal-double-charge.md` | Timeline | **"2023-11-03 21:14 — PayPal sandbox receives payment for order `63c4a…`"** |
| 4 | 0.5569 | `i-001-paypal-double-charge.md` | Resolution | "A guard was added to the backend handler … `payOrder = asyncHandler` …" |
| 5 | 0.5523 | `i-001-paypal-double-charge.md` | Summary | "**Severity:** P1 (production financial impact) … **Date detected:** 2023-11-04 … **Date resolved:** 2023-11-06" |

**Запрос #3.2**
```json
{ "query": "checkout incident postmortem latest", "top_k": 5 }
```
| # | score | source_file | parent_headings | snippet |
|---|-------|-------------|-----------------|---------|
| 1 | 0.5941 | `runbooks/incident-response.md` | Phase 7 | шаблон постмортема |
| 2 | 0.5608 | `runbooks/incident-response.md` | Phase 6 | timeline |
| 3 | 0.5285 | `i-001-paypal-double-charge.md` | Postmortem — Action Items | "Add idempotency c…" |
| 4 | 0.5178 | `i-002-mongo-connection-pool-exhaustion.md` | Postmortem — Action Items | таблица action items |
| 5 | 0.5156 | `i-001-paypal-double-charge.md` | Resolution | guard в `payOrder` |

**Запрос #3.3** (уточнение по i-002)
```json
{ "query": "Black Friday MongoDB connection pool exhaustion checkout", "top_k": 5 }
```
| # | score | source_file | parent_headings | snippet |
|---|-------|-------------|-----------------|---------|
| 1 | 0.7957 | `i-002-mongo-connection-pool-exhaustion.md` | Timeline | "2023-11-24 08:00 — Black Friday sale begins; marketi…" |
| 2 | 0.7942 | `i-002-mongo-connection-pool-exhaustion.md` | Summary | "**Severity:** P0 (full service outage) … **Date detected:** 2023-11-24 08:47 UTC" |
| 3 | 0.7499 | `i-002-mongo-connection-pool-exhaustion.md` | Technical Deep Dive | "Each product page …" |
| 4 | 0.7451 | `i-002-mongo-connection-pool-exhaustion.md` | Resolution | "Mongoose `maxPoolSize` set to 25 via environment variable…" |
| 5 | 0.7422 | `i-002-mongo-connection-pool-exhaustion.md` | Postmortem | таблица action items |

Дополнительно проверил, есть ли более свежий инцидент через `ls project-data/incidents/` — нашёл `i-003-jwt-secret-leak.md`. Запросом #3.4 (`"i-003 incident JWT secret leak summary date"`) подтвердил: i‑003 датирован **2024-07-18**, severity P1, тема — JWT secret в git, **не checkout**.

**Синтез ответа.** Vector search не умеет в recency (в payload нет даты), поэтому даты вытащил из чанков `Summary`. По датам в корпусе:
- `i-001` PayPal double-charge — 2023-11-04 → 2023-11-06 (P1, **checkout/payments**)
- `i-002` Mongo pool exhaustion — 2023-11-24 (Black Friday, **P0, чекаут лежал вместе со всем API**)
- `i-003` JWT secret leak — 2024-07-18 (P1, auth — не checkout)

> Самый свежий инцидент, **затронувший checkout**, — **i-002: MongoDB Connection Pool Exhaustion, Black Friday 2023-11-24** (P0, полный outage). Что произошло (по чанкам Summary / Timeline / Technical Deep Dive / Resolution):
> - 08:00 UTC началась Black Friday‑распродажа, маркетинг разогнал трафик.
> - 08:47 UTC задетектили: API перестал отвечать, чекаут падал — все запросы упирались в исчерпанный пул соединений Mongoose.
> - Корневая причина: дефолтный `maxPoolSize` Mongoose (5) против резко выросшего concurrency; каждая страница продукта/чекаута брала несколько соединений (агрегаты + сессии).
> - Resolution (immediate): подняли `maxPoolSize` до 25 через env‑переменную; в постмортеме — план по pooling‑метрикам и нагрузочному тесту перед сейлами.
>
> Если под «checkout» понимать только **payments‑пайплайн**, то ближайший к нему — **i-001 PayPal Sandbox Webhook Double-Charge (2023-11-03 → 2023-11-06)**: SDK `@paypal/react-paypal-js` вызывал `onApprove` дважды, бэкенд писал два `paymentResult`, 7 заказов получили двойную оплату. Починили идемпотентным гардом в `payOrder` (`if (order.isPaid) return …`).

### End-to-end

Сценарий: «найди фичу `payment_stripe_v3` через search-docs, проверь её состояние через feature-flags, при `Disabled + deps != Disabled` переведи в `Testing` с трафиком 25%, процитируй назначение из доков».

#### Шаг 1. search-docs MCP — что в документации?

**Tool call**
```json
mcp__project-docs__search_project_docs({
  "query": "payment_stripe_v3 feature description dependencies purpose",
  "top_k": 5
})
```

**Ответ** (`rewritten_query: null`):

| # | score | source_file | parent_headings | snippet (срез) |
|---|-------|-------------|-----------------|----------------|
| 1 | 0.6167 | `adr-004-paypal-vs-stripe.md` | Alternatives Considered | "Braintree (PayPal subsidiary). Braintree is PayPal's developer-oriented payment SDK. It offers Stripe-like developer experi…" |
| 2 | 0.6010 | `adr-004-paypal-vs-stripe.md` | Alternatives Considered | "Stripe is now the team's preferred payment processor for new projects. Key advantages over PayPal: Test mode is…" |
| 3 | 0.6001 | `feature-flags-spec.md` | 4. Feature Flag Catalog | "Payments → `paypal_express_buttons` — PayPal Express Checkout Buttons. Default state: Enabled (100%). The PayPal Smart…" |
| 4 | 0.5945 | `payments.md` | Feature 4: Payment Status Display → Назначение | "Визуальное отображение статуса оплаты заказа в нескольких местах UI…" |
| 5 | 0.5857 | `payments.md` | Feature 1: PayPal SDK Dynamic Loading → Назначение | "Динамическая загрузка PayPal JavaScript SDK при открытии страницы незаплаченного заказа…" |

**Интерпретация.** Ни в одном из top-5 чанков нет токена `payment_stripe_v3`. Все совпадения — семантически близкий стрип/payments‑контекст (ADR-004 о выборе процессора, каталог Payments в `feature-flags-spec.md`, секции из `payments.md`). Score 0.6 для top-1 — заметно ниже типичного «hit»‑порога ~0.70 на BGE-M3, что сам по себе сигнал «такой сущности в корпусе нет». Из топа видно, что реальный «Stripe-флаг» в каталоге называется иначе.

Дополнительно подтвердил по сырому корпусу: `grep -nr "payment_stripe_v3" project-data/` пуст; ближайший задокументированный флаг — **`stripe_alternative`** (`feature-flags-spec.md:457–466`).

#### Шаг 2. feature-flags MCP — что в `features.json`?

**Tool call**
```json
mcp__feature-flags__get_feature_info({ "feature_name": "payment_stripe_v3" })
```

**Ответ**
```json
{
  "error": "FEATURE_NOT_FOUND",
  "message": "No feature with ID 'payment_stripe_v3' exists in features.json.",
  "feature_name": "payment_stripe_v3"
}
```

Оба MCP подтверждают независимо: `payment_stripe_v3` **не существует** ни в документации, ни в `mcp-server-demo/src/features.json`.

#### Шаг 3. Условный переход в Testing — НЕ выполнен

Предусловие из задачи — «**если** она в статусе `Disabled` **и** все зависимости не в `Disabled`» — недостижимо: у несуществующей фичи нет ни статуса, ни списка зависимостей. Любой вызов `set_feature_state("payment_stripe_v3", "Testing")` вернёт `FEATURE_NOT_FOUND` (это и подтверждает `set_feature_state` контракт). Создавать новый флаг через прямую правку `features.json` запрещено CLAUDE.md, и пользователь этого не просил. Поэтому **никаких мутаций состояния не сделано**.

Для контекста сходил read-only в `stripe_alternative` (ближайший существующий аналог):

**Tool call**
```json
mcp__feature-flags__get_feature_info({ "feature_name": "stripe_alternative" })
```

**Ответ**
```json
{
  "feature_name": "stripe_alternative",
  "status": "Testing",
  "traffic_percentage": 90,
  "last_modified": "2026-05-03",
  "dependencies": []
}
```

Заметка: `stripe_alternative` уже в `Testing` (90%), не в `Disabled` — сценарий «перевести из Disabled в Testing/25%» не применим и к нему. Если это и была фича, которую имели в виду, понадобилось бы скорее `adjust_traffic_rollout(stripe_alternative, 25)` — но сначала нужно явное подтверждение, что речь действительно о ней.

#### Шаг 4. Цитата из документации

Прямой цитаты про `payment_stripe_v3` нет — фичи нет. Привожу зафиксированное в спеке назначение для ближайшего соседа `stripe_alternative` (`project-data/feature-flags-spec.md:457–466`):

> **`stripe_alternative` — Stripe as Alternative Payment Processor**
> **Default state:** Testing (5%)
>
> The `PaymentScreen` currently has a Stripe radio button that is commented out. This flag enables the Stripe payment path: the user selects Stripe, enters card details in a Stripe Elements form, and payment is confirmed via a backend webhook. Acts as a redundant payment path when PayPal is unavailable.
>
> **System impact:** `PaymentScreen.js` (uncomment + wrap in flag check), new backend route `POST /api/orders/stripe-pay`, Stripe webhook handler.
>
> **Typical rollout:** Start at 5% of all orders (canary). If payment success rate matches PayPal's baseline (~98%), expand to 25% then 50%.
>
> **Dependencies:** None.

И пояснение зависимостей в `feature-flags-spec.md:444–453` — `apple_pay` поверх него: «Payment processor: Stripe (requires `stripe_alternative` to be in Testing or Enabled). … **Dependencies:** `stripe_alternative` must be active.»

#### Итог

| Этап | Tool | Результат |
|------|------|-----------|
| 1. Поиск в документации | `search_project_docs` | top-1 score 0.6167; **0 чанков с токеном `payment_stripe_v3`** |
| 2. Состояние в каталоге | `get_feature_info(payment_stripe_v3)` | `FEATURE_NOT_FOUND` |
| 3. Переход в Testing 25% | — | **не выполнен**, предусловие недостижимо |
| 4. Цитата | — | Нет про `payment_stripe_v3`; цитирован `stripe_alternative` |
| (контекст) | `get_feature_info(stripe_alternative)` | `Testing`, traffic 90%, deps `[]` |

**Финальное состояние `payment_stripe_v3`:** не существует. **Финальное состояние `stripe_alternative`:** не менялось (`Testing`, 90%, `last_modified=2026-05-03`).

Если задача имелась в виду применительно к `stripe_alternative` — подтверди, и я через `adjust_traffic_rollout` поставлю 25% (статус уже `Testing`, перевод через `set_feature_state` не нужен).

почему-то везде просит фичу payment_stripe_v3, хотя ее нет. Запускаю с той, которая есть - `save_for_later`

---

#### Прогон №2 — `save_for_later`

Тот же сценарий, но с реально существующей фичей.

##### Шаг 1. project-docs MCP — что в документации?

**Tool call**
```json
mcp__project-docs__search_project_docs({
  "query": "save_for_later feature description dependencies purpose wishlist cart",
  "top_k": 5
})
```

**Ответ** (`rewritten_query: null`):

| # | score | source_file | parent_headings | snippet (срез) |
|---|-------|-------------|-----------------|----------------|
| 1 | 0.5884 | `cart.md` (features) | Feature 4: Cart Persistence (localStorage) | "Корзина сохраняется между сессиями браузера…" |
| 2 | 0.5784 | `feature-flags-spec.md` | 4. Feature Flag Catalog → Cart | "`cart_redesign` — Redesigned Cart UI. Default state: Testing (10%). The `CartScreen` currently uses a two-column…" |
| 3 | 0.5715 | `glossary.md` | Domain Terms | "Wishlist (Optional). Personal list of products a customer wants to purchase later. Not fully implemented in base proshop…" |
| 4 | 0.5594 | `catalog.md` | Feature 4: Product Detail Page → Зависимости | "Зависит от: Product model, Rating component…" |
| 5 | 0.5563 | `cart.md` (features) | Feature 6: Cart Clear After Order | автоочистка корзины после заказа |

Точная секция `save_for_later` из `feature-flags-spec.md` в top‑5 не пришла — вернулся соседний чанк про `cart_redesign` (на котором она зависит). Я переспросил уже‑затреп.

**Tool call (уточнение)**
```json
mcp__project-docs__search_project_docs({
  "query": "save_for_later move item from cart to saved list",
  "top_k": 8
})
```
Top-1 — снова `cart.md` Feature 4 (0.5571). Чанка с самим заголовком `#### \`save_for_later\`` ни один из 8 результатов не содержал.

**Tool call (с rewrite RU→EN)**
```json
mcp__project-docs__search_project_docs({
  "query": "отложить товар на потом из корзины wishlist",
  "top_k": 5,
  "rewrite": true
})
```
`rewritten_query: "Move item to wishlist for later"`. Лучший хит — `glossary.md` про Wishlist (0.5215). Снова мимо нужной секции.

**Fallback на `grep`** (по правилу из CLAUDE.md: vector search дал нужный файл и метаданные, но не сам чанк → читаем исходник):

```
grep -n "save_for_later" project-data/feature-flags-spec.md
# 358:**Dependencies:** `save_for_later` depends on this flag.
# 362:#### `save_for_later` — Save Items for Later
```

И второе упоминание в обзорной таблице фич:
```
project-data/features-analysis-ru.md:73:| 5 | `save_for_later` — Отложить на потом | 🔴 Disabled / 0% | authenticated | Канарейка | 2026-02-28 | `cart_redesign` | …
```
Заметка: `features-analysis-ru.md` фиксирует **дефолт** из спеки (Disabled / 0%), а не текущее runtime‑состояние из `features.json`.

##### Шаг 2. feature-flags MCP — текущее состояние

**Tool call**
```json
mcp__feature-flags__get_feature_info({ "feature_name": "save_for_later" })
```

**Ответ**
```json
{
  "feature_name": "save_for_later",
  "status": "Testing",
  "traffic_percentage": 90,
  "last_modified": "2026-05-03",
  "dependencies": [
    { "feature_name": "cart_redesign", "status": "Testing" }
  ]
}
```

##### Шаг 3. Условный переход в Testing 25% — НЕ выполнен

Условие из задачи: `status == "Disabled"` **и** все зависимости **не** в `Disabled` → перевести в `Testing`, трафик 25%.

| Проверка | Факт | Результат |
|----------|------|-----------|
| `status == "Disabled"` | `status == "Testing"` | ❌ false |
| Все deps не в `Disabled` | `cart_redesign: Testing` | ✅ true |
| Итого предусловие | false ∧ true | **false** |

Предусловие не выполняется (фича уже не в `Disabled`, она в `Testing` 90%), поэтому **никаких мутаций не сделано** — ни `set_feature_state`, ни `adjust_traffic_rollout`. Если бы я всё равно вызвал `set_feature_state(save_for_later, "Testing")`, сервер бы оставил `traffic_percentage` тем же (90%, потому что значение уже в диапазоне 1..99 — это поведение из контракта `set_feature_state`), что не совпало бы с целевыми 25%. Принудительное снижение трафика без предусловия — изменение shared state без явного запроса; по правилам про risky actions не делаю молча.

##### Шаг 4. Цитата из документации

Из `project-data/feature-flags-spec.md:362–371`:

> **`save_for_later` — Save Items for Later**
> **Default state:** Disabled
>
> Adds a "Save for Later" button next to each cart item. Saved items are persisted to the authenticated user's profile in MongoDB (requires a `savedItems` array field added to `userModel`). Items appear in a separate "Saved for Later" section below the active cart and can be moved back with one click.
>
> **System impact:** `userModel.js` schema extension, new API route `POST /api/users/saved-items`, update to CartScreen UI.
>
> **Typical rollout:** Requires `cart_redesign` to be in Testing or Enabled for UI consistency. Release to authenticated users only. Start at 10% canary.
>
> **Dependencies:** `cart_redesign`.

Зачем это нужно (своими словами на основе цитаты): даёт авторизованному покупателю возможность отложить товар из корзины «на потом» вместо того, чтобы удалять его и терять контекст; сохранённые позиции хранятся в профиле пользователя в Mongo (`userModel.savedItems`) и переживают сессии и устройства. UX‑смысл — снизить отказы в корзине: «не уверен сейчас» больше не означает «удалить».

##### Итог

| Этап | Tool | Результат |
|------|------|-----------|
| 1. Поиск в документации | `search_project_docs` × 3 | Точная секция в top‑K не пришла (top‑1 ≈ 0.59 на соседних чанках); fallback `grep` нашёл `feature-flags-spec.md:362` |
| 2. Состояние в каталоге | `get_feature_info(save_for_later)` | `Testing`, 90%, `cart_redesign: Testing` |
| 3. Переход в Testing 25% | — | **не выполнен**: предусловие `status==Disabled` не сработало |
| 4. Цитата | — | `feature-flags-spec.md:362–371` (Save Items for Later) |

**Финальное состояние `save_for_later`:** без изменений — `status=Testing`, `traffic_percentage=90`, `last_modified=2026-05-03`, `dependencies=[cart_redesign:Testing]`.

Если хочется привести фичу к «целевым» 25% независимо от предусловия — это `adjust_traffic_rollout(save_for_later, 25)` (статус уже `Testing`, `set_feature_state` не нужен, файл будет переписан и `last_modified` обновится на сегодня). Готов сделать по подтверждению.

---

## Интеграция `config/features.json` в backend + frontend (Phase 0 + Phase 1)

`config/features.json` стал **single source of truth** для feature-флагов. MCP-сервер `feature-flags` пишет в файл, бэкенд и фронт его читают.

### Phase 0 — инфраструктура

**Backend** (`backend/utils/featureFlags.js`):
- `loadFeatures()` читает `config/features.json` (TTL-кэш 5 секунд).
- `isFeatureEnabled(name)` — резолвер: `status === Disabled` → `false`; рекурсивная проверка `dependencies` (если любая зависимость в `Disabled` → каскадно `false`); cycle protection. `traffic_percentage` и `targeted_segments` — стабы (читаются, прокидываются в API, но не влияют на резолюцию).
- Public endpoint `GET /api/features` (все фичи с резолвед `enabled`) и `GET /api/features/:name` (одна, 404 если нет).
- Fail closed: если файл недоступен — все фичи считаются off.

**Frontend** (`frontend/src/`):
- Redux slice (`constants/featureFlagsConstants.js`, `actions/featureFlagsActions.js`, `reducers/featureFlagsReducer.js`) — thunk `loadFeatureFlags()` дёргает `/api/features` на маунт `App`, сохраняет как `state.featureFlags.flags[name].enabled`.
- Хук `useFeatureFlag('name')` возвращает boolean — единая точка чтения в компонентах.

**Принцип распределения гейтинга:** backend гейтит данные/действия (источник истины + защита), frontend гейтит UI (скрытие там, где бэк не участвует). Mixed-фичи проверяются в обоих слоях (defense in depth — Redux state можно подделать в DevTools).

### Phase 1 — drift fixes (4 фичи, реализованные через инфраструктуру)

| Фича | Backend | Frontend | Поведение OFF |
|---|---|---|---|
| `image_lazy_loading` | — | `useFeatureFlag` в `Product.js`, `ProductCarousel.js` | `<img>` без `loading="lazy"` |
| `recently_viewed` | — | `useFeatureFlag` в `RecentlyViewed.js` + `ProductScreen.js` (трекинг) | Полка не рендерится, localStorage не пишется |
| `verified_purchase_badge` | `isFeatureEnabled` в `getProductById` (skip `Order.find` если off) | `useFeatureFlag` в `ProductScreen.js` (`<Badge>Verified Purchase</Badge>`) | Бек не делает cross-ref запрос; фронт не рисует бейдж |
| `admin_advanced_filters` | `isFeatureEnabled` в `getProducts` + `getOrders` (skip filter params если off) | `useFeatureFlag` в `ProductListScreen` + `OrderListScreen` (фильтр-панели) | Бек игнорит query params; фронт не рендерит панель |

### End-to-end цепочка

```
config/features.json
   ↓ readFile (TTL 5s, atomic write от MCP)
backend/utils/featureFlags.js
   ├─→ isFeatureEnabled(name) ← contollers (productController, orderController)
   └─→ getAllFeatures() → GET /api/features
                              ↓ axios on App mount
                          state.featureFlags.flags
                              ↓
                          useFeatureFlag(name) ← компоненты
```

**Проверка end-to-end (на Phase 0):** прямая правка `search_v2.status = "Disabled"` в `config/features.json` → через ≥5s `GET /api/features/search_v2` отдаёт `enabled: false`, и `semantic_search` (зависит от `search_v2`) тоже `enabled: false` каскадом, хотя сама в `Testing`. После восстановления — оба `true`. TTL и каскад работают.

**Прогресс:** 5/20 реализуемых фич (25%). Skip — 4 (`search_v2`, `semantic_search`, `apple_pay`, `stripe_alternative`, по analysis-doc §6 — внешние зависимости). Осталось 4 фазы (Phase 2 — дешёвые backend-изменения; Phase 3 — UX редизайн + якорная `multi_step_checkout_v2`; Phase 4 — новые endpoints; Phase 5 — тяжёлые/опциональные).

---

## Доп. изменения

- **MCP-тул `list_features`** (`mcp-server-demo/src/index.ts`): read-only, без параметров, возвращает `{ count, features: [...] }` — каждая фича в том же формате, что отдаёт `get_feature_info`. Закрывает раннее ограничение «отдельного `list_features` тула нет, делай `Read`».
- **Админ-страница `/admin/featurelist`** (`frontend/src/screens/FeatureListScreen.js`): read-only дашборд для админа — таблица всех фич (status, traffic %, last_modified, зависимости) поверх стора `featureFlags`. Подключена в `App.js` и в админ-меню навбара. Мутации только через MCP-тулы.

---

## M4 — Прототипирование. Редизайн публичной воронки

Цель этапа — привести публичные экраны магазина к языку `DESIGN.md` (cream + forest + Cormorant Garamond + DM Sans), снять `react-bootstrap` и Font Awesome из публичной воронки. Эталон — уже редизайненный в M3 `FeatureListScreen.jsx` и компоненты `Header.jsx`, `Button.jsx`, `Badge.jsx`, `Form.jsx`, `Icons.jsx`.

### Какие страницы попали под редизайн

| Экран | Маршруты | Что было | Что стало |
|---|---|---|---|
| **HomeScreen** | `/`, `/search/:keyword`, `/page/:n`, `/search/:keyword/page/:n` | `react-bootstrap` `<Row>/<Col>/<Card>` + `<Carousel>` (Bootstrap) + Font Awesome звёзды через `Rating.js` + `<h1>Latest Products</h1>` | Editorial hero (Cormorant H1 «Considered things, well kept.» + photo 4:5 с glass caption-strip) → top-rated rail (scroll-snap) → 4-колоночный grid latest → пагинация-пилюли → recently viewed. На search/page>1 hero скрывается, остаются breadcrumb + Cormorant H1 «Results for …» / «All products» + lede со счётчиком и «Clear search». |
| **ProductScreen** | `/product/:id` | `<Row>` с `<Image fluid>` (col-6) + `<ListGroup>` инфы (col-3) + buy-box `<Card>` (col-3) + Reviews ниже. FA-звёзды. | Editorial 1fr 1fr: sticky-фото слева, справа eyebrow «Category · Brand» + Cormorant H1 + lede + meta-row (Stars + reviews link + In stock pill + Brand) + buy-box на `bone-50` surface (Price tnum / Status badge / Quantity-pill / Add to cart `primary lg`). Reviews — 1fr 1fr под продуктом: список с Stars (clay-500) + Verified-purchase badge (флаг), форма «Share your view» c keyboard-accessible StarPicker. |

### Чего НЕ касались (остался Bootstrap)

CartScreen, Login/RegisterScreen, ProfileScreen, ShippingScreen/PaymentScreen/PlaceOrderScreen, OrderScreen, все `/admin/*` экраны кроме `FeatureListScreen` (он уже на новом языке после M3).

### Новые / переписанные компоненты

| Файл | Действие | Что это |
|---|---|---|
| `frontend/src/components/Breadcrumb.jsx` | NEW | `<nav aria-label='Breadcrumb'><ol>` с `aria-current='page'` на последнем узле |
| `frontend/src/components/ProductCard.jsx` | NEW | Единая голая editorial-карточка, sizes `md`/`sm`, флаг `image_lazy_loading`, out-of-stock через `<Badge tone='critical' dot>` + dim фото |
| `frontend/src/components/Hero.jsx` | NEW | 1fr 1fr секция, фото-тайл 4:5 с glass caption-strip (единственное место в системе, где DESIGN.md §6 разрешает glass) |
| `frontend/src/components/ProductRail.jsx` | NEW | Горизонтальный scroll-snap rail; заменяет `react-bootstrap Carousel` для top-rated и recently-viewed |
| `frontend/src/components/Paginate.jsx` | REWRITE (`.js` → `.jsx`) | Пилюли 36×36, `<Link>` вместо `LinkContainer`, `IconChevronRight` + `rotate-180` для стрелки prev. Тот же интерфейс пропсов — `ProductListScreen.js` (админский) продолжает работать |
| `frontend/src/components/RecentlyViewed.jsx` | REWRITE (`.js` → `.jsx`) | Тонкая обёртка над `ProductRail`, тот же `useRecentlyViewed` хук + `useFeatureFlag('recently_viewed')` |
| `frontend/src/components/Stars.jsx` | NEW | Lucide-style звёзды (clay-500), sizes `sm`/`md`/`lg`. Заменяет `Rating.js` (Font Awesome) |
| `frontend/src/components/Icons.jsx` | MODIFY | Добавлены `IconStar` (с `filled` пропом) и `IconStarHalf` (clipPath) |
| `frontend/src/components/Form.jsx` | MODIFY | Добавлены `TextArea` и `Select` по контракту существующего `TextInput` (`label` + `hideLabel` + auto-id, `t-eyebrow` label, `bg-bone-50 border-line rounded-pill`/`rounded-lg`, focus → `border-forest-700`) |
| `frontend/src/screens/HomeScreen.jsx` | NEW (заменяет `HomeScreen.js`) | Собирает hero + rail + grid + paginate + recently viewed + сам рендерит `<main id='main-content'>` |
| `frontend/src/screens/ProductScreen.jsx` | NEW (заменяет `ProductScreen.js`) | Inline `BuyBox`/`Reviews`/`ReviewItem`/`ReviewForm`/`StarPicker`/`DetailSkeleton`/`DetailErrorState` (паттерн `Stat`/`Tab`/`FlagCard` из `FeatureListScreen.jsx`) |
| `frontend/src/App.js` | MODIFY | 5 маршрутов (4 home + product) вытащены из-под `react-bootstrap Container` на верхний уровень `<Switch>` — как `/admin/featurelist`. Container теперь обслуживает только cart/profile/order/admin |

### Удалено

`screens/HomeScreen.js`, `screens/ProductScreen.js`, `components/Product.js`, `components/ProductCarousel.js`, `components/Paginate.js`, `components/RecentlyViewed.js`, `components/Rating.js`. Font Awesome из этих экранов уходит полностью (но `index.html` по-прежнему линкует FA CDN — остальные Bootstrap-экраны могут его ещё использовать).

### Дисциплина

- **Все отступы — из шкалы DESIGN.md §5** (`4/8/12/16/24/32/48/64/96`). Аудит v2 мокапа нашёл 14 мест с off-scale значениями (`14/28/40/56/6`) — все исправлены до коммита.
- **WCAG 2.1/2.2 AA** — все правила §9: один `<h1>` на экран, `<ul role='list'>`, breadcrumb через `<nav><ol>`, навигация через `<Link>`, иконки `aria-hidden`, focus-visible outline forest-500, disabled через disabled-палитру (не `opacity-50`), `role='status'`/`role='alert'`, touch target ≥ 24×24.
- **Никаких новых тестов** (CLAUDE.md). Проверка — визуальный чекпойнт пользователя после P1 и после P2.
- **Feature flags не задеты функционально** — `image_lazy_loading`, `recently_viewed`, `verified_purchase_badge` продолжают работать через те же `useFeatureFlag` хуки.

### Артефакты

- Спека дизайна: `docs/superpowers/specs/2026-05-14-storefront-redesign-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-14-storefront-redesign.md`
- Workflow: 12 коммитов на `master` (от `c5075ae` до `45bbf1a`), визуальные чекпойнты между P1 (`dad5b28`) и P2 (`45bbf1a`).

### Что осталось вне M4

- CartScreen и checkout-флоу (Shipping/Payment/PlaceOrder/Order) — следующий логичный кусок воронки.
- Login/Register/Profile — auth-стек.
- Admin lists (users/orders/products) кроме уже редизайненной FeatureListScreen.
- Footer (на главной он остаётся Bootstrap-овским).
- Категории/фильтры/brand-фильтры — backend не группирует продукты, добавление вне scope.

----

страницу админа с фичами + design.md делал через claude design. После этого прогнал через агента по accessability. Затем через агента ux-designer сказал доработать главную и карточку продукта