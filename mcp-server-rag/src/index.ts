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
  // scripts/finalize-chunks.ts:98 — heading_path === parent_headings.join(' > ')).
  // SearchHit only exposes heading_path, so split on the canonical separator.
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
