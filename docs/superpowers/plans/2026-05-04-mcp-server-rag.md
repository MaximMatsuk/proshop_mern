# mcp-server-rag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать новый MCP-сервер `mcp-server-rag/` с одним тулом `search_project_docs(query, top_k=5, rewrite=false)`, который оборачивает существующую функцию `search()` из `scripts/query-qdrant.ts`.

**Architecture:** Отдельный пакет рядом с `mcp-server-demo/`, идентичный по сборке и стилю. Импортирует `search()` напрямую из `../scripts/query-qdrant.ts` через ослабленный `tsconfig`. Перед этим в `query-qdrant.ts` гейтится автозапуск CLI, чтобы импорт не убивал процесс. Тул возвращает массив чанков с 6 полями (`source_file`, `file_path`, `title`, `parent_headings`, `score`, `snippet`).

**Tech Stack:** Node.js (ESM), TypeScript, `@modelcontextprotocol/sdk`, `zod`, `@qdrant/js-client-rest`, `tsx` для dev. Embedding/rewrite через локальный Ollama (используется уже существующий код в `scripts/`).

**Spec:** `docs/superpowers/specs/2026-05-04-mcp-server-rag-design.md`

---

## File Structure

**Создаются:**
- `mcp-server-rag/package.json` — манифест нового пакета (клон demo + qdrant client).
- `mcp-server-rag/tsconfig.json` — клон demo с `include` на `../scripts/query-qdrant.ts`.
- `mcp-server-rag/src/index.ts` — сервер + единственный тул.
- `mcp-server-rag/.gitignore` — `node_modules`, `dist`.

**Модифицируется:**
- `scripts/query-qdrant.ts` — гейт автозапуска `cli()` за `isMain`-проверкой (минимум 4 строки правки).

**Не трогается:**
- `mcp-server-demo/` — никаких изменений.
- `scripts/ingest-qdrant.ts`, `scripts/finalize-chunks.ts`, `scripts/normalize-chunks.ts` — не трогаем.

---

## Task 1: Гейт CLI в `scripts/query-qdrant.ts`

**Files:**
- Modify: `scripts/query-qdrant.ts:266-269` (последний блок `cli().catch(...)`)

- [ ] **Step 1: Добавить импорт `pathToFileURL`**

В верхней части файла, рядом с существующим `import { QdrantClient } ...`, добавить:

```ts
import { pathToFileURL } from 'node:url';
```

- [ ] **Step 2: Заменить безусловный `cli()` на `isMain`-гейт**

Найти в конце файла:

```ts
cli().catch((e) => {
  console.error(`\n[query] FATAL: ${(e as Error).message}\n`);
  process.exit(1);
});
```

Заменить на:

```ts
const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  cli().catch((e) => {
    console.error(`\n[query] FATAL: ${(e as Error).message}\n`);
    process.exit(1);
  });
}
```

- [ ] **Step 3: Проверить регрессию CLI**

Run: `cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern && tsx scripts/query-qdrant.ts --help`

Expected: вывод `Usage: tsx query-qdrant.ts [--top-k N] ...` и завершение `process.exit(0)` (как и раньше).

Если Qdrant/Ollama не запущены — это нормально для `--help`, который не делает сетевых вызовов.

- [ ] **Step 4: Проверить, что импорт без CLI больше не убивает процесс**

Run:
```bash
cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern && \
  node --input-type=module -e "import('./scripts/query-qdrant.ts').then(m => console.log('OK keys:', Object.keys(m).join(','))).catch(e => { console.error('FAIL:', e.message); process.exit(1); })"
```

Expected: вывод `OK keys: rewriteQuery,search` (или аналогичный список экспортов; главное — нет «error: query is required» от CLI и `exit(2)`).

Прим.: `node` не понимает `.ts` напрямую. Этот шаг — **не обязателен** для финального merge. Если нет работающего лоадера ts, шаг можно пропустить и вместо него убедиться визуально, что новый блок `if (isMain)` обёрнут вокруг `cli().catch(...)`.

- [ ] **Step 5: Commit**

```bash
git add scripts/query-qdrant.ts
git commit -m "$(cat <<'EOF'
refactor(scripts): gate query-qdrant CLI behind isMain check

Allows other packages to import { search, rewriteQuery } without
triggering the CLI's argv parsing and process.exit. CLI behavior is
unchanged when invoked via `tsx scripts/query-qdrant.ts ...`.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Скелет пакета `mcp-server-rag/`

**Files:**
- Create: `mcp-server-rag/package.json`
- Create: `mcp-server-rag/.gitignore`
- Create: `mcp-server-rag/tsconfig.json`

- [ ] **Step 1: Создать `mcp-server-rag/package.json`**

```json
{
  "name": "mcp-server-rag",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "watch": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "MCP server exposing search_project_docs over the Qdrant project-data corpus.",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@qdrant/js-client-rest": "^1.17.0",
    "zod": "^4.4.2"
  },
  "devDependencies": {
    "@types/node": "^25.6.0",
    "tsx": "^4.21.0",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Создать `mcp-server-rag/.gitignore`**

```
node_modules/
dist/
*.log
```

- [ ] **Step 3: Создать `mcp-server-rag/tsconfig.json`**

Идентичен `mcp-server-demo/tsconfig.json` за двумя исключениями: убран `rootDir`, расширен `include`.

```json
{
  "compilerOptions": {
    "outDir": "./dist",

    "module": "nodenext",
    "target": "esnext",
    "types": ["node"],

    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,

    "moduleResolution": "NodeNext",
    "esModuleInterop": true
  },
  "include": ["src/**/*", "../scripts/query-qdrant.ts"]
}
```

- [ ] **Step 4: Установить зависимости**

```bash
cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/mcp-server-rag && npm install
```

Expected: создаётся `node_modules/`, `package-lock.json`. Никаких ошибок установки.

- [ ] **Step 5: Commit**

```bash
git add mcp-server-rag/package.json mcp-server-rag/package-lock.json mcp-server-rag/.gitignore mcp-server-rag/tsconfig.json
git commit -m "$(cat <<'EOF'
feat(mcp-server-rag): scaffold package with tsconfig and deps

Mirrors mcp-server-demo layout. tsconfig.json drops rootDir and adds
../scripts/query-qdrant.ts to include so the search() function can be
imported directly. Adds @qdrant/js-client-rest as a runtime dep.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Минимальный `src/index.ts` с одним тулом

**Files:**
- Create: `mcp-server-rag/src/index.ts`

- [ ] **Step 1: Создать `mcp-server-rag/src/index.ts`**

Файл целиком:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { search, type SearchHit } from "../../scripts/query-qdrant.ts";

interface Chunk {
  source_file: string;
  file_path: string;
  title: string;
  parent_headings: string[];
  score: number;
  snippet: string;
}

const SNIPPET_MAX = 200;

function asJsonContent(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function makeSnippet(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= SNIPPET_MAX) return collapsed;
  return `${collapsed.slice(0, SNIPPET_MAX - 1)}…`;
}

function classifyError(err: unknown): "EMBED_FAILED" | "REWRITE_FAILED" | "QDRANT_REQUEST_FAILED" {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("/api/embed")) return "EMBED_FAILED";
  if (msg.includes("/api/chat")) return "REWRITE_FAILED";
  return "QDRANT_REQUEST_FAILED";
}

function hitToChunk(hit: SearchHit): Chunk {
  // payload.parent_headings is hydrated by ingest pipeline (see
  // scripts/finalize-chunks.ts:98 — heading_path === parent_headings.join(' > '))
  // but the SearchHit type from query-qdrant.ts only exposes heading_path. We
  // recover the array by splitting on the canonical ' > ' separator.
  const parent_headings = hit.heading_path
    ? hit.heading_path.split(" > ").filter((s) => s.length > 0)
    : [];
  return {
    source_file: hit.source_file,
    file_path: hit.file_path,
    title: hit.title,
    parent_headings,
    score: hit.score,
    snippet: makeSnippet(hit.text),
  };
}

const server = new McpServer({
  name: "mcp-server-rag",
  version: "0.1.0",
});

const searchProjectDocsSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Поисковый запрос на естественном языке (RU или EN)."),
  top_k: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Сколько чанков вернуть. Целое 1..20, по умолчанию 5."),
  rewrite: z
    .boolean()
    .default(false)
    .describe(
      "Если true и в запросе есть кириллица — перевести его в EN через локальный Ollama"
        + " (REWRITE_MODEL) перед эмбеддингом. По умолчанию false: запрос идёт как есть.",
    ),
});

server.tool(
  "search_project_docs",
  [
    "Семантический поиск по корпусу документации проекта (project-data: features, ADRs,",
    "runbooks, incidents, API, pages) через Qdrant + Ollama-эмбеддинги. Возвращает топ-K",
    "чанков с метаданными и кратким сниппетом текста.",
    "",
    "Когда вызывать: пользователь спрашивает про устройство фичи/потока, ищет ADR или",
    "runbook, хочет цитату из инцидента, узнаёт детали API/страницы.",
    "Когда НЕ вызывать: для чтения исходного кода (используйте обычные file/grep инструменты);",
    "для запросов к БД приложения; для модификации документации — это read-only поиск.",
    "",
    "Read-only — Qdrant не модифицируется.",
    "",
    "Формат входа: { query: string (1+), top_k?: integer 1..20 = 5, rewrite?: boolean = false }.",
    "Формат выхода (success): { query: string, rewritten_query: string | null,",
    "  results: Array<{ source_file, file_path, title, parent_headings: string[],",
    "  score: number, snippet: string }> }. Поле rewritten_query не null только если",
    "  rewrite=true и запрос реально был переведён.",
    "Формат ошибки: { error: 'QDRANT_REQUEST_FAILED' | 'EMBED_FAILED' | 'REWRITE_FAILED',",
    "  message: string, query: string }.",
    "",
    "Примеры:",
    "1) search_project_docs({ query: 'how does the order placement flow work' })",
    "   → results: топ-5 чанков из project-data/features про checkout.",
    "2) search_project_docs({ query: 'JWT middleware', top_k: 3 })",
    "   → results: 3 чанка про auth.",
    "3) search_project_docs({ query: 'оплата через PayPal', top_k: 5, rewrite: true })",
    "   → rewritten_query: 'PayPal payment integration', далее эмбед+поиск.",
  ].join("\n"),
  searchProjectDocsSchema.shape,
  async (args) => {
    const { query, top_k, rewrite } = args;

    try {
      const result = await search(query, { topK: top_k, rewrite });
      const chunks = result.hits.map(hitToChunk);
      return asJsonContent({
        query: result.query,
        rewritten_query: result.rewritten ? result.rewrittenQuery : null,
        results: chunks,
      });
    } catch (err) {
      return asJsonContent({
        error: classifyError(err),
        message: err instanceof Error ? err.message : String(err),
        query,
      });
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Запустить typecheck**

Run: `cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/mcp-server-rag && npm run typecheck`

Expected: завершение с кодом 0, без ошибок.

**Если упадёт** на `../scripts/query-qdrant.ts` (под флагами `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`):

1. Прочесть сообщение об ошибке.
2. Если оно про индексный доступ или optional properties — точечно отключить ровно тот флаг в `mcp-server-rag/tsconfig.json` (поставить `false`). Это явно разрешено пользователем.
3. Повторить typecheck до зелёного.
4. Не трогать сами `scripts/query-qdrant.ts` ради typecheck — там работающий код.

- [ ] **Step 3: Smoke-тест — сервер стартует и отдаёт список тулов через MCP**

В этом проекте нет MCP-клиента, поэтому проверяем минимально: запускаем сервер на 1 секунду и убеждаемся, что он не падает на старте (любой ранний crash вылезет в stderr).

Run:
```bash
cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/mcp-server-rag && \
  timeout 1 npm run dev 2>&1; \
  echo "exit_code=$?"
```

Expected: `timeout` пришлёт `SIGTERM`, exit code будет `124` или `143`. **Главное — никаких stack trace про import errors, missing modules, syntax errors в выводе.** Stdout молчит (это stdio-транспорт, ждёт MCP-сообщений).

Если в stderr появится reference error / module not found — починить и повторить.

- [ ] **Step 4: Smoke-тест ошибки — сервер не падает при выключенном Qdrant**

Этот шаг проверяет руками логику классификации ошибок без полноценного MCP-клиента. Запустить временно через node REPL:

```bash
cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern && \
  npx -p tsx tsx -e "
    import('./scripts/query-qdrant.ts').then(async (m) => {
      try {
        const r = await m.search('test query', { topK: 1, rewrite: false });
        console.log('ok:', r.hits.length);
      } catch (e) {
        console.log('thrown:', (e as Error).message.slice(0, 200));
      }
    });
  "
```

Expected (если Qdrant/Ollama не запущены): строка `thrown: ...` с описанием ошибки (например, `fetch failed` или ECONNREFUSED). **Не должно быть unhandled rejection / процесс не должен висеть.**

Если оба сервиса запущены и в коллекции есть данные — будет `ok: 1`. Тоже валидно.

- [ ] **Step 5: Commit**

```bash
git add mcp-server-rag/src/index.ts
git commit -m "$(cat <<'EOF'
feat(mcp-server-rag): implement search_project_docs tool

Single-tool MCP server wrapping search() from scripts/query-qdrant.ts.
Returns up to top_k chunks with source_file, file_path, title,
parent_headings, score, and a 200-char snippet. Optional rewrite flag
(default false) triggers RU->EN translation via Ollama for Cyrillic
queries. Errors classified into QDRANT_REQUEST_FAILED, EMBED_FAILED,
REWRITE_FAILED.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Acceptance check

**Files:** none modified — только верификация.

- [ ] **Step 1: typecheck зелёный**

Run: `cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/mcp-server-rag && npm run typecheck`

Expected: exit 0.

- [ ] **Step 2: build зелёный**

Run: `cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/mcp-server-rag && npm run build && ls dist/`

Expected: exit 0; в `dist/` появляются как минимум `index.js` (плюс `index.d.ts`, `.map`-файлы).

- [ ] **Step 3: запущенный билд не падает**

Run:
```bash
cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/mcp-server-rag && \
  timeout 1 node dist/index.js 2>&1; echo "exit_code=$?"
```

Expected: `exit_code=124` или `143`, stderr пустой.

- [ ] **Step 4: регрессия CLI**

Run: `cd /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern && tsx scripts/query-qdrant.ts --help`

Expected: справочный вывод и `exit 0` — как до Task 1.

- [ ] **Step 5: финальный отчёт**

Подтвердить пользователю:
- созданы 4 файла в `mcp-server-rag/`;
- `scripts/query-qdrant.ts` гейтит CLI;
- `mcp-server-demo/` не тронут;
- typecheck/build зелёные;
- CLI `query-qdrant.ts` продолжает работать;
- сервер стартует без ошибок (полная проверка end-to-end через MCP-клиент — за пользователем, нужны живые Qdrant + Ollama + индексированный корпус).

---

## Самопроверка плана

- [x] Все требования спека покрыты задачами (структура — Task 2; tsconfig — Task 2; правка query-qdrant.ts — Task 1; тул, схема, ошибки, описание — Task 3; acceptance — Task 4).
- [x] Нет «TBD»/«TODO»/«implement later».
- [x] Все типы согласованы (`Chunk`, `SearchHit`, `top_k`/`topK`).
- [x] Имя `parent_headings` строится одинаково везде (через split `' > '` от `heading_path`, с фильтрацией пустых строк).
- [x] Зависимости пакетов (`@modelcontextprotocol/sdk`, `zod`, `@qdrant/js-client-rest`, `tsx`, `typescript`, `@types/node`) перечислены явно с версиями.

**Расхождение со спекой, исправленное в плане:** в спеке §6.2 написано «`parent_headings` берётся прямо из `payload.parent_headings`». Однако `SearchHit` из `scripts/query-qdrant.ts:99-111` экспортирует только `heading_path: string`, а `parent_headings` в payload, но не в типе. Чтобы не править `scripts/`, в Task 3 восстанавливаем массив сплитом по канониченому `' > '` (валидируется в `scripts/finalize-chunks.ts:98` — это безопасный round-trip). Эквивалентно по смыслу, не требует менять API существующего модуля.
