# Chunking Pipeline for ProShop Docs Corpus

**Date:** 2026-05-04
**Status:** Approved (brainstorming complete)
**Owner:** Maxim Matsuk
**Working dir:** `proshop_mern/mcp-server-demo`

## 1. Goal

Convert the markdown corpus under `proshop_mern/project-data/` into a single JSONL artifact (`proshop_mern/data/chunks.jsonl`) where each line is a semantically coherent chunk with rich metadata, ready for embedding-and-ingest into Qdrant in a subsequent pipeline stage.

Out of scope: embeddings, Qdrant ingest, incremental re-chunking, deletion of stale artifacts.

## 2. Inputs

- Source root: `proshop_mern/project-data/` (47 markdown files across 6 subdirs + 5 top-level).
- Skipped: `project-data/features.json` (structured JSON, intentionally excluded — noted in `report.md`).

| Group | Files | Path pattern |
|---|---|---|
| toplevel | 6 | `architecture.md`, `best-practices.md`, `feature-flags-spec.md`, `glossary.md`, `dev-history.md`, `features-analysis-ru.md` |
| features | 6 | `features/*.md` |
| runbooks | 6 | `runbooks/*.md` |
| api | 5 | `api/*.md` |
| adrs | 5 | `adrs/*.md` |
| pages | 14 | `pages/*.md` (incl. `INDEX.md`) |
| incidents | 3 | `incidents/*.md` |

## 3. Outputs

- `proshop_mern/data/chunks.jsonl` — final merged artifact (one chunk per line).
- `proshop_mern/data/chunks.<group>.jsonl` — 7 group fragments (kept, not deleted).
- `proshop_mern/data/report.md` — generated statistics + path to artifact + skipped files + git SHA + timestamp.
- `proshop_mern/.gitignore` — entry `data/` (the whole folder is generated).

## 4. Architecture

```
Main agent (current Claude Code session)
  ↓ dispatches 7×Agent(sonnet) IN ONE MESSAGE (true parallelism)
  ├── toplevel  agent → data/chunks.toplevel.jsonl
  ├── features  agent → data/chunks.features.jsonl
  ├── runbooks  agent → data/chunks.runbooks.jsonl
  ├── api       agent → data/chunks.api.jsonl
  ├── adrs      agent → data/chunks.adrs.jsonl
  ├── pages     agent → data/chunks.pages.jsonl
  └── incidents agent → data/chunks.incidents.jsonl
  ↓ all return
Main agent runs `npm run chunks:finalize` →
  validates fragments (zod schema) → merges in deterministic order →
  writes data/chunks.jsonl + data/report.md
```

**Subagent model:** Sonnet (cost/speed; task is mechanical structural splitting + 1-sentence summary).
**Subagent isolation:** each writes only its own fragment. No shared file, no contention.

## 5. Chunking Algorithm

**Budget (chars, not tokens — heuristic chars/3.5 chosen in design Q2):**
- `target = 1750` (≈500 tokens)
- `min = 1050` (≈300 tokens)
- `max = 2100` (≈600 tokens)

**Per-file procedure:**

1. **Title** = text of first `# H1`. Fallback: filename without extension.
2. **Heading hierarchy:** split body into blocks by `^## ` and `^### `. Each block knows its breadcrumb chain (H2 → H3).
3. **Greedy packing:** walk blocks top-down, accumulate into current chunk while `len + next_block ≤ max`. A block fully fitting goes whole. A new H2 always starts a new chunk (even if current is below `min`).
4. **Oversized block (> max):** split *inside* in priority order:
   - **a)** by `### H3` subheadings;
   - **b)** if no H3 — by paragraphs (blank-line separator);
   - **c)** if a paragraph still > max — by sentences (`. ! ?` + space/EOL); list items (`\n- `, `\n* `, `\n1. `) also count as sentence boundaries for Russian-heavy content.
5. **Protected blocks** (never split mid-block, even if they exceed max):
   - fenced code blocks (` ```...``` `);
   - markdown tables (consecutive `|`-prefixed lines);
   - blockquote chains (`> ...`).
   If a protected block alone > max, ship as a single chunk with `metadata.oversized = true`.
6. **Overlap:** only when step 4c forces splitting a long paragraph. In that case prepend the previous chunk's last ~150 chars (truncated to a sentence boundary) and set `metadata.has_overlap_prefix = true`. Otherwise overlap = 0.
7. **Min-merge:** if the last chunk of a section is < `min`, merge into the previous chunk **only if** combined ≤ `max`. Never violate semantic boundaries to satisfy `min`.
8. **Breadcrumb prefix in `text`:** every chunk's `text` begins with:
   ```
   # <title> > <H2> > <H3>

   <body>
   ```
   This gives the embedding model the document context even when the section is yanked out of the middle of a file.

## 6. Chunk Schema

Each line of `chunks.jsonl`:

```json
{
  "id": "architecture__data-layer__mongoose-schemas__0",
  "text": "# ProShop MERN — Architecture Overview > Data Layer > Mongoose Schemas\n\n...",
  "metadata": {
    "source_file": "architecture.md",
    "file_path": "project-data/architecture.md",
    "group": "toplevel",
    "title": "ProShop MERN — Architecture Overview",
    "parent_headings": ["Data Layer", "Mongoose Schemas"],
    "heading_path": "Data Layer > Mongoose Schemas",
    "chunk_index": 7,
    "chunk_total": 18,
    "char_count": 1632,
    "approx_tokens": 466,
    "language": "en",
    "keywords": ["mongoose", "schema", "product", "user", "order"],
    "summary": "Defines the three primary Mongoose schemas (User, Product, Order) and how Order embeds line items.",
    "oversized": false,
    "has_overlap_prefix": false
  }
}
```

**Field contracts:**

| Field | Rule |
|---|---|
| `id` | `<file-slug>__<heading-path-slug>__<chunk_index>`. Slug: lowercase, `[^a-z0-9]+ → -`, trim. Globally unique across the corpus (validator enforces). |
| `text` | Breadcrumb prefix (§5.8) + body. No trailing whitespace. |
| `metadata.source_file` | Basename, e.g. `architecture.md`. |
| `metadata.file_path` | Path relative to `proshop_mern/`, e.g. `project-data/features/cart.md`. |
| `metadata.group` | One of: `toplevel` \| `features` \| `runbooks` \| `api` \| `adrs` \| `pages` \| `incidents`. |
| `metadata.title` | First H1 text, or filename-without-ext if absent. |
| `metadata.parent_headings` | Array of H2/H3 chain (no H1 — that's `title`). Empty array for chunks before the first H2. |
| `metadata.heading_path` | `parent_headings.join(" > ")`. |
| `metadata.chunk_index` / `chunk_total` | 0-based index and total count **per file**. |
| `metadata.char_count` | `text.length` (after prefix). |
| `metadata.approx_tokens` | `Math.round(char_count / 3.5)`. |
| `metadata.language` | Let `C` = count of cyrillic letters `[а-яА-ЯёЁ]`, `L` = count of latin letters `[a-zA-Z]` in the body (excluding the breadcrumb prefix and excluding whitespace/punctuation/digits). If `C+L === 0` → `"en"` (numeric/symbolic chunks default to English). Else: `"ru"` if `C/(C+L) > 0.7`, `"en"` if `L/(C+L) > 0.7`, else `"mixed"`. |
| `metadata.keywords` | 3-7 lowercase lemmas, no stop-words, on the chunk's dominant language. Acronyms (`JWT`, `MERN`, `API`, `ADR`, `PR`) stay UPPERCASE. |
| `metadata.summary` | One sentence ≤ 150 chars, in the chunk's language, describing what the chunk is about. |
| `metadata.oversized` | `true` if `char_count > 2100` due to a protected block (§5.5). |
| `metadata.has_overlap_prefix` | `true` if the chunk starts with ~150 chars of overlap from the previous chunk (§5.6). |

## 7. Subagent Contract

All 7 subagents receive the same prompt skeleton with `{{group}}` and `{{files}}` substituted. They MUST be dispatched in a single message of the main agent for true parallelism (per `superpowers:dispatching-parallel-agents`).

```
You are a chunking worker for group "{{group}}" of the ProShop docs corpus.

INPUT (read via Read tool):
{{files}}              ← absolute paths in proshop_mern/project-data/

TASK:
Split each file into semantic chunks per §5 of the spec
(mcp-server-demo/docs/superpowers/specs/2026-05-04-chunking-pipeline-design.md).
Budget (chars): target=1750, min=1050, max=2100.
Protect code fences, markdown tables, blockquote chains (do NOT split mid-block).
Overlap = 0 except when forced by step 5.4c (long paragraph reslice).
Always start each chunk's `text` with:  "# <title> > <H2> > <H3>\n\n"

For each chunk, compute every metadata field per §6.
- language: count cyrillic letters C and latin letters L (excluding whitespace/punctuation/digits). If C+L=0 → "en". Else C/(C+L) > 0.7 → "ru"; L/(C+L) > 0.7 → "en"; else "mixed".
- keywords: 3-7 lowercase lemmas, no stop-words, dominant-language;
  KEEP acronyms uppercase (JWT, MERN, API, ADR, PR, MCP, CRA).
- summary: ONE sentence, ≤ 150 chars, in the chunk's language,
  describing what the chunk is about (not a paraphrase).

OUTPUT:
Write exactly one file via Write tool:
  /Users/maximmatsuk/Documents/Projects/AI-course.Homework2/proshop_mern/data/chunks.{{group}}.jsonl

Format: one JSON object per line, no blank lines, no BOM, no trailing commas.
Use JSON.stringify-equivalent serialization.

REPORT (final text message):
- files processed
- chunks emitted
- oversized chunks (with file paths if any)
- any edge cases (missing H1, very long code blocks, weird Markdown)

DO NOT:
- summarize whole files into context blindly — for large files, read in parts;
- spawn other agents;
- touch anything outside data/chunks.{{group}}.jsonl.
```

## 8. Main Agent: Validation, Merge, Report

After all 7 subagents return, the main agent runs `npm run chunks:finalize` (script: `mcp-server-demo/scripts/finalize-chunks.ts`).

**Step 1 — collect:** read all 7 group fragments. Missing or empty file → hard fail with explicit message.

**Step 2 — validate** every line via zod:
- parses as JSON, all required fields present and well-typed;
- `id` matches `^[a-z0-9]+(__[a-z0-9-]+)*__\d+$`;
- `id` globally unique (Set check);
- `language ∈ {ru, en, mixed}`;
- `1 ≤ keywords.length ≤ 10`;
- `1 ≤ summary.length ≤ 200`;
- `char_count === text.length`;
- `approx_tokens === Math.round(char_count / 3.5)`;
- `chunk_index < chunk_total`;
- if `oversized === false` then `char_count ≤ 2100`.

Any violation → hard fail naming file, line, and the failing rule.

**Step 3 — merge** into `data/chunks.jsonl` in deterministic order:
group order `toplevel → features → runbooks → api → adrs → pages → incidents`; within group sort by `source_file` (alphabetic) then by `chunk_index`. Deterministic order makes git diffs sane (even though `data/` is gitignored, local diffs help debugging).

**Step 4 — `data/report.md`** generated by the script, contains:
- explicit path to the final artifact: `data/chunks.jsonl`;
- file count, chunk count, breakdown by group (table);
- size histogram: `<min`, `min..target`, `target..max`, `>max(oversized)`;
- breakdown by `language`;
- list of oversized chunks (file + reason);
- list of skipped files (`features.json`);
- timestamp + project git SHA.

**Step 5 — cleanup:** group fragments are kept on disk for debugging and per-group re-runs. Re-running overwrites.

## 9. Code Footprint

New files / changes (kept minimal):

```
mcp-server-demo/scripts/finalize-chunks.ts     ← validator + merger + report (zod)
mcp-server-demo/package.json                    ← +script "chunks:finalize"
proshop_mern/.gitignore                         ← +line "data/"
```

`zod` is already in `mcp-server-demo` deps (used by MCP SDK). No new deps if confirmed; otherwise `npm i zod`.

## 10. Risks & Edge Cases

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | Subagent silently writes invalid JSONL (trailing comma, BOM, non-stringified). | Hard zod validator (§8 step 2) fails with line-level diagnostics. |
| 2 | Duplicate `id` between groups. | Slug includes file name; validator does global Set check. |
| 3 | Code block > 2100 chars (seen in `architecture.md`, `feature-flags-spec.md`). | §5.5 — keep whole, mark `oversized=true`. Listed in `report.md`. |
| 4 | File without H1 (e.g. `pages/INDEX.md`). | Fallback to filename-without-ext as `title`. |
| 5 | Subagent escapes cyrillic as `\uXXXX`. | Acceptable — JSON-valid. Validator parses as JSON. |
| 6 | Lowercase strips meaningful acronyms (JWT, MERN, API). | Prompt explicitly tells subagents to keep these uppercase in `keywords`. |
| 7 | A subagent crashes / returns empty fragment. | Main agent detects missing/empty file → fail. Re-dispatch only that one subagent. |
| 8 | `chars/3.5` heuristic drift. | Accepted ±15-20% per Q2 decision. If >25% out-of-budget, recalibrate constant. |
| 9 | Wide markdown table > max. | Protected (§5.5), `oversized=true`. |
| 10 | Russian text with long bullet lists, no `. ! ?`. | §5.4c also accepts `\n- `, `\n* `, `\n1. ` as fallback split points. |

## 11. Acceptance Criteria

- `data/chunks.jsonl` exists, every line is valid JSON conforming to §6 schema.
- All `id`s globally unique.
- 0 chunks with `char_count > max` unless `oversized=true`.
- ≥ 95% of chunks have `min ≤ char_count ≤ max`. (Sanity bound, not a hard pass.)
- `data/report.md` exists and explicitly states the path `data/chunks.jsonl`.
- `features.json` is listed under "Skipped" in the report.
- All 47 markdown files have at least one chunk attributed to them.
