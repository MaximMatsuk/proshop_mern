import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const COLLECTION = process.env.QDRANT_COLLECTION ?? 'proshop_docs';
const MODEL = process.env.EMBED_MODEL ?? 'bge-m3';
const REWRITE_MODEL = process.env.REWRITE_MODEL ?? 'qwen2.5:1.5b';
const VECTOR_SIZE = 1024;

const REWRITE_SYSTEM = [
  'You translate technical search queries from Russian to English for a documentation retrieval system.',
  'The corpus is a MERN e-commerce app (MongoDB, Express, React, Node) with ADRs, runbooks, incidents, API docs.',
  '',
  'Rules:',
  '- Output ONLY the English query. No preamble, no quotes, no explanation, no notes.',
  '- Keep technical identifiers EXACTLY as-is: variable/flag names (payment_stripe_v3), file names, ADR-XXX codes, code snippets, URLs.',
  '- Preserve technical terms (database, MongoDB, JWT, checkout, incident, etc).',
  '- If the query is already in English, return it unchanged.',
  '- One sentence, no more than ~25 words.',
].join('\n');

function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

function cleanRewrite(raw: string): string {
  let out = raw.trim();
  const firstNl = out.indexOf('\n');
  if (firstNl >= 0) out = out.slice(0, firstNl).trim();
  out = out.replace(/^["'`]+|["'`]+$/g, '').trim();
  out = out.replace(/^(English|Translation|Rewritten):\s*/i, '').trim();
  return out;
}

export async function rewriteQuery(query: string): Promise<{ rewritten: string; changed: boolean }> {
  if (!hasCyrillic(query)) return { rewritten: query, changed: false };
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: REWRITE_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: REWRITE_SYSTEM },
        { role: 'user', content: query },
      ],
      options: { temperature: 0, num_predict: 80 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama /api/chat failed: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content ?? '';
  const cleaned = cleanRewrite(content);
  if (!cleaned) return { rewritten: query, changed: false };
  return { rewritten: cleaned, changed: cleaned !== query };
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama /api/embed failed: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { embeddings?: number[][] };
  const v = data.embeddings?.[0];
  if (!v || v.length !== VECTOR_SIZE) {
    throw new Error(`bad embedding (length ${v?.length}, expected ${VECTOR_SIZE})`);
  }
  return v;
}

export interface SearchFilter {
  group?: string | string[];
  source_file?: string | string[];
  language?: string | string[];
}

export interface SearchOpts {
  topK?: number;
  filter?: SearchFilter;
  rewrite?: boolean;
}

export interface SearchResult {
  hits: SearchHit[];
  query: string;
  rewrittenQuery: string;
  rewritten: boolean;
}

export interface SearchHit {
  id: string;
  score: number;
  chunk_id: string;
  source_file: string;
  file_path: string;
  group: string;
  title: string;
  heading_path: string;
  summary: string;
  language: string;
  text: string;
}

function buildMustClauses(filter: SearchFilter | undefined): Array<Record<string, unknown>> {
  if (!filter) return [];
  const must: Array<Record<string, unknown>> = [];
  for (const key of ['group', 'source_file', 'language'] as const) {
    const v = filter[key];
    if (v === undefined) continue;
    must.push({
      key,
      match: Array.isArray(v) ? { any: v } : { value: v },
    });
  }
  return must;
}

export async function search(query: string, opts: SearchOpts = {}): Promise<SearchResult> {
  const topK = opts.topK ?? 5;
  const rewriteEnabled = opts.rewrite ?? true;
  const client = new QdrantClient({
    url: QDRANT_URL,
    ...(QDRANT_API_KEY ? { apiKey: QDRANT_API_KEY } : {}),
  });

  let queryForEmbed = query;
  let rewritten = false;
  if (rewriteEnabled) {
    const r = await rewriteQuery(query);
    queryForEmbed = r.rewritten;
    rewritten = r.changed;
  }

  const vector = await embedQuery(queryForEmbed);

  const must = buildMustClauses(opts.filter);
  const result = await client.search(COLLECTION, {
    vector,
    limit: topK,
    with_payload: true,
    ...(must.length > 0 ? { filter: { must } } : {}),
  });

  const hits = result.map((p) => {
    const pl = (p.payload ?? {}) as Record<string, unknown>;
    return {
      id: String(p.id),
      score: p.score,
      chunk_id: String(pl.chunk_id ?? ''),
      source_file: String(pl.source_file ?? ''),
      file_path: String(pl.file_path ?? ''),
      group: String(pl.group ?? ''),
      title: String(pl.title ?? ''),
      heading_path: String(pl.heading_path ?? ''),
      summary: String(pl.summary ?? ''),
      language: String(pl.language ?? ''),
      text: String(pl.text ?? ''),
    };
  });

  return { hits, query, rewrittenQuery: queryForEmbed, rewritten };
}

interface CliArgs {
  query?: string;
  topK: number;
  group?: string[];
  source_file?: string[];
  rewrite: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { topK: 5, rewrite: true };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--top-k' || a === '-k') {
      args.topK = Number(argv[++i]);
    } else if (a === '--group' || a === '-g') {
      const next = argv[++i] ?? '';
      args.group = (args.group ?? []).concat(next.split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a === '--source-file' || a === '-s') {
      const next = argv[++i] ?? '';
      args.source_file = (args.source_file ?? [])
        .concat(next.split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a === '--no-rewrite') {
      args.rewrite = false;
    } else if (a === '--rewrite') {
      args.rewrite = true;
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: tsx query-qdrant.ts [--top-k N] [--group g,..] [--source-file f,..] [--no-rewrite] "<query>"',
      );
      process.exit(0);
    } else if (!args.query) {
      args.query = a;
    } else {
      args.query = `${args.query} ${a}`;
    }
    i++;
  }
  return args;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

function printResults(filter: SearchFilter, topK: number, result: SearchResult): void {
  console.log('='.repeat(80));
  console.log(`Query:     ${result.query}`);
  if (result.rewritten) console.log(`Rewritten: ${result.rewrittenQuery}`);
  if (filter.group) console.log(`  filter group       = ${JSON.stringify(filter.group)}`);
  if (filter.source_file) console.log(`  filter source_file = ${JSON.stringify(filter.source_file)}`);
  if (filter.language) console.log(`  filter language    = ${JSON.stringify(filter.language)}`);
  console.log(`  top-k              = ${topK}`);
  console.log('='.repeat(80));
  if (result.hits.length === 0) {
    console.log('(no results)\n');
    return;
  }
  for (let i = 0; i < result.hits.length; i++) {
    const r = result.hits[i]!;
    console.log(
      `\n#${i + 1}  score=${r.score.toFixed(4)}  source=${r.source_file}  group=${r.group}`,
    );
    console.log(`    chunk_id : ${r.chunk_id}`);
    console.log(`    title    : ${r.title}${r.heading_path ? ' › ' + r.heading_path : ''}`);
    console.log(`    summary  : ${truncate(r.summary, 180)}`);
    console.log(`    snippet  : ${truncate(r.text.replace(/\s+/g, ' ').trim(), 280)}`);
  }
  console.log('');
}

async function cli(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.query) {
    console.error('error: query is required');
    console.error(
      'usage: tsx query-qdrant.ts [--top-k N] [--group g1,g2] [--source-file f1,f2] "<query>"',
    );
    process.exit(2);
  }
  const filter: SearchFilter = {};
  if (args.group) filter.group = args.group;
  if (args.source_file) filter.source_file = args.source_file;

  const result = await search(args.query, {
    topK: args.topK,
    rewrite: args.rewrite,
    ...(Object.keys(filter).length > 0 ? { filter } : {}),
  });
  printResults(filter, args.topK, result);
}

cli().catch((e) => {
  console.error(`\n[query] FATAL: ${(e as Error).message}\n`);
  process.exit(1);
});
