# mcp-server-rag — design spec

**Дата:** 2026-05-04
**Статус:** approved (brainstorming → writing-plans)

## 1. Цель

Обернуть существующий query-скрипт к Qdrant (`scripts/query-qdrant.ts`) в отдельный MCP-сервер с одним тулом `search_project_docs`. Сервер должен повторять стек, сборку и стиль описаний из `mcp-server-demo/`.

## 2. Структура пакета

Новый пакет `mcp-server-rag/` создаётся как сосед `mcp-server-demo/`:

```
mcp-server-rag/
  package.json      # копия mcp-server-demo + @qdrant/js-client-rest
  tsconfig.json     # копия mcp-server-demo с ослабленным rootDir/include
  src/
    index.ts        # MCP-сервер, один тул search_project_docs
```

Никакого `features.json` (он специфичен для demo). Скрипты `dev` / `build` / `start` / `typecheck` совпадают с `mcp-server-demo`, кроме `build` — копирование `features.json` убирается.

## 3. Зависимости

`package.json`:
- `dependencies`:
  - `@modelcontextprotocol/sdk` — версия как в `mcp-server-demo`
  - `zod` — версия как в `mcp-server-demo`
  - `@qdrant/js-client-rest` `^1.17.0` — нужен на runtime, потому что транзитивно подтягивается из импортируемого `scripts/query-qdrant.ts`
- `devDependencies`:
  - `@types/node`, `tsx`, `typescript` — версии как в `mcp-server-demo`

Никаких других новых зависимостей не вводим. Никаких HTTP-клиентов, утилит для транслитерации и т.п.

## 4. tsconfig.json

Копия `mcp-server-demo/tsconfig.json` со следующими отличиями (это требование пользователя — «можно ослабить тайпскрипт, лишь бы работало»):

- Поле `rootDir` **удаляется** из `compilerOptions` (TS сам выведет общий корень из `include`).
- `include` расширяется до `["src/**/*", "../scripts/query-qdrant.ts"]`, чтобы `tsc` видел импортируемый файл и не падал на «file is outside rootDir».
- `outDir` остаётся `./dist` (билд складывается туда же).

Все остальные строгие флаги (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`) сохраняются по умолчанию. **Если** `npm run typecheck` упадёт на `../scripts/query-qdrant.ts` (файл писался без этого `tsconfig`), допустимо точечно ослабить **только** мешающие флаги (`noUncheckedIndexedAccess` и/или `exactOptionalPropertyTypes`) — это явное разрешение пользователя.

## 5. Доработка `scripts/query-qdrant.ts`

В текущем файле в самом конце безусловно вызывается CLI:

```ts
cli().catch((e) => { ... process.exit(1); });
```

При импорте `search()` из MCP-сервера этот блок выполнится при загрузке модуля и убьёт процесс. Меняем на «запускать `cli()` только если этот файл — entrypoint процесса»:

```ts
import { pathToFileURL } from "node:url";

const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  cli().catch((e) => {
    console.error(`\n[query] FATAL: ${(e as Error).message}\n`);
    process.exit(1);
  });
}
```

Поведение CLI (`tsx scripts/query-qdrant.ts "..."`) при этом не меняется. Импорт `search`/`rewriteQuery` извне становится безопасным.

## 6. Тул `search_project_docs`

### 6.1 Сигнатура (zod)

```ts
{
  query: z.string().min(1)
    .describe("Поисковый запрос на естественном языке (RU или EN)."),
  top_k: z.number().int().min(1).max(20).default(5)
    .describe("Сколько чанков вернуть. Целое 1..20, по умолчанию 5."),
  rewrite: z.boolean().default(false)
    .describe(
      "Если true и запрос содержит кириллицу — перевести в EN через локальный Ollama "
      + "(REWRITE_MODEL) перед эмбеддингом. По умолчанию false: запрос идёт как есть."
    ),
}
```

### 6.2 Контракт выхода (success)

JSON, обёрнутый в `asJsonContent(...)` — тот же паттерн, что в `mcp-server-demo`:

```ts
{
  query: string,                  // исходный
  rewritten_query: string | null, // не null только если rewrite сработал
  results: Array<{
    source_file: string,
    file_path: string,
    title: string,
    parent_headings: string[],    // напрямую из payload — массив уже хранится
    score: number,
    snippet: string,              // payload.text → collapseWhitespace → truncate(200, ellipsis)
  }>
}
```

`parent_headings` берётся прямо из `payload.parent_headings` без сплита (`scripts/finalize-chunks.ts:98` валидирует, что `heading_path === parent_headings.join(' > ')`).

### 6.3 Контракт ошибки

```ts
{
  error: "QDRANT_REQUEST_FAILED" | "EMBED_FAILED" | "REWRITE_FAILED",
  message: string,
  query: string,
}
```

Различение классов ошибок — по подстрокам в `error.message`, который бросает существующий код в `query-qdrant.ts`:
- `'/api/embed'` → `EMBED_FAILED`
- `'/api/chat'` → `REWRITE_FAILED`
- остальное (включая `qdrant`/network) → `QDRANT_REQUEST_FAILED`

### 6.4 Описание тула

В стиле `mcp-server-demo` (русский, многострочное `[...].join('\n')`), обязательные блоки:
1. Что делает (1–2 предложения).
2. Когда вызывать.
3. Когда НЕ вызывать.
4. Read-only — qdrant не пишется.
5. Формат входа и выхода.
6. Формат ошибки.
7. 2–3 примера (см. ниже).

**Примеры в описании (для модели):**
1. `search_project_docs({ query: "how does the order placement flow work" })` → топ-5 чанков из `project-data/features` про checkout.
2. `search_project_docs({ query: "JWT middleware", top_k: 3 })` → 3 чанка про auth.
3. `search_project_docs({ query: "оплата через PayPal", top_k: 5, rewrite: true })` → ребрайт RU→EN, дальше эмбед+поиск.

## 7. Окружение

ENV-переменные наследуются из `query-qdrant.ts` — в MCP-обёртке не дублируются:

| Переменная | Default |
|---|---|
| `QDRANT_URL` | `http://localhost:6333` |
| `QDRANT_API_KEY` | _(нет)_ |
| `OLLAMA_URL` | `http://localhost:11434` |
| `EMBED_MODEL` | `bge-m3` |
| `REWRITE_MODEL` | `qwen2.5:1.5b` |
| `QDRANT_COLLECTION` | `proshop_docs` |

Тул сам по себе ENV не читает.

## 8. Поток запроса

1. MCP-клиент вызывает `search_project_docs(query, top_k=5, rewrite=false)`.
2. Хендлер вызывает `search(query, { topK: top_k, rewrite })` из `scripts/query-qdrant.ts`.
3. `search()`:
   - если `rewrite=true` и в `query` есть кириллица → POST `OLLAMA_URL/api/chat` с `REWRITE_MODEL`;
   - POST `OLLAMA_URL/api/embed` с `EMBED_MODEL` → vector;
   - `QdrantClient.search(QDRANT_COLLECTION, { vector, limit: topK, with_payload: true })`.
4. Хендлер маппит `result.hits` → 6 публичных полей; `text` → `snippet` (схлопнуть пробелы, обрезать до 200 с `…`).
5. Возвращает `asJsonContent({ query, rewritten_query, results })`.
6. На любую брошенную ошибку — мапит на `QDRANT_REQUEST_FAILED` / `EMBED_FAILED` / `REWRITE_FAILED` и оборачивает в `asJsonContent`.

## 9. Out of scope (явный YAGNI)

- Фильтры `group` / `source_file` / `language` в публичной схеме тула — в требуемой сигнатуре их нет.
- Поля `chunk_id`, `group`, `summary`, `language`, полный `text`, `heading_path` — не возвращаем.
- Тесты — по правилам `CLAUDE.md` сначала спрашиваем у пользователя.
- Линт/форматирование — в проекте не настроены.
- Любые изменения в `mcp-server-demo/`.
- Резолверы путей TS, workspace-настройки на уровне корня — обходимся минимальной правкой `tsconfig.json` нового пакета.

## 10. Проверка работоспособности (acceptance)

После реализации:
- `cd mcp-server-rag && npm run typecheck` проходит без ошибок.
- `cd mcp-server-rag && npm run dev` запускает MCP-сервер по stdio.
- `tsx scripts/query-qdrant.ts "JWT middleware"` продолжает работать как CLI (регрессия по п. 5).
- При запущенных Qdrant + Ollama вызов тула с `query="how does the order flow work"` возвращает массив до 5 чанков с обещанной структурой.
- Вызов с `rewrite=true` и русским запросом возвращает `rewritten_query !== null`.
- При выключенном Qdrant — ответ с `error: "QDRANT_REQUEST_FAILED"` (тул не падает).
