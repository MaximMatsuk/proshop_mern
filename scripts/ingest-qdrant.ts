import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const CHUNKS_PATH = join(PROJECT_ROOT, 'data', 'chunks.jsonl');

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const COLLECTION = process.env.QDRANT_COLLECTION ?? 'proshop_docs';
const MODEL = process.env.EMBED_MODEL ?? 'bge-m3';
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 16);
const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 3);

const VECTOR_SIZE = 1024;
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const ChunkSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  metadata: z.object({
    source_file: z.string(),
    file_path: z.string(),
    group: z.string(),
    title: z.string(),
    parent_headings: z.array(z.string()),
    heading_path: z.string(),
    chunk_index: z.number().int(),
    chunk_total: z.number().int(),
    char_count: z.number().int(),
    approx_tokens: z.number().int(),
    language: z.enum(['ru', 'en', 'mixed']),
    keywords: z.array(z.string()),
    summary: z.string(),
    oversized: z.boolean(),
    has_overlap_prefix: z.boolean(),
  }),
});
type Chunk = z.infer<typeof ChunkSchema>;

function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) throw new Error(`bad uuid: ${uuid}`);
  return Buffer.from(hex, 'hex');
}
function bytesToUuid(b: Buffer): string {
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
function uuidv5(name: string, namespace: string): string {
  const ns = uuidToBytes(namespace);
  const hash = createHash('sha1').update(ns).update(name).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

async function readChunks(): Promise<Chunk[]> {
  const raw = await readFile(CHUNKS_PATH, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const out: Chunk[] = [];
  for (let i = 0; i < lines.length; i++) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[i]);
    } catch (e) {
      throw new Error(`chunks.jsonl:${i + 1}: invalid JSON — ${(e as Error).message}`);
    }
    const r = ChunkSchema.safeParse(parsed);
    if (!r.success) {
      const issues = r.error.issues.map((z) => `${z.path.join('.')}: ${z.message}`).join('; ');
      throw new Error(`chunks.jsonl:${i + 1}: schema violation — ${issues}`);
    }
    out.push(r.data);
  }
  return out;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama /api/embed failed: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { embeddings?: number[][] };
  if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
    throw new Error(`Ollama returned ${data.embeddings?.length ?? 0} vectors, expected ${texts.length}`);
  }
  for (let i = 0; i < data.embeddings.length; i++) {
    const v = data.embeddings[i];
    if (!Array.isArray(v) || v.length !== VECTOR_SIZE) {
      throw new Error(`vector #${i} has length ${v?.length}, expected ${VECTOR_SIZE}`);
    }
  }
  return data.embeddings;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === MAX_RETRIES) break;
      const wait = 2 ** (attempt - 1) * 500;
      console.warn(
        `  [retry ${attempt}/${MAX_RETRIES - 1}] ${label}: ${(e as Error).message} — wait ${wait}ms`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function ensureCollection(client: QdrantClient): Promise<void> {
  const { exists } = await client.collectionExists(COLLECTION);
  if (exists) {
    const info = await client.getCollection(COLLECTION);
    const params = info.config?.params?.vectors;
    const size = params && 'size' in params ? params.size : undefined;
    if (size !== undefined && size !== VECTOR_SIZE) {
      throw new Error(
        `collection "${COLLECTION}" exists with vector size ${size}, expected ${VECTOR_SIZE}. ` +
          `Drop the collection or set QDRANT_COLLECTION to a new name.`,
      );
    }
    console.log(`[ingest] collection "${COLLECTION}" already exists — reusing`);
    return;
  }
  console.log(`[ingest] creating collection "${COLLECTION}" (size=${VECTOR_SIZE}, distance=Cosine)`);
  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
  });
}

function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '–';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m === 0 ? `${s}s` : `${m}m${s.toString().padStart(2, '0')}s`;
}

function buildPayload(c: Chunk): Record<string, unknown> {
  return {
    chunk_id: c.id,
    source_file: c.metadata.source_file,
    file_path: c.metadata.file_path,
    group: c.metadata.group,
    title: c.metadata.title,
    parent_headings: c.metadata.parent_headings,
    heading_path: c.metadata.heading_path,
    keywords: c.metadata.keywords,
    summary: c.metadata.summary,
    language: c.metadata.language,
    chunk_index: c.metadata.chunk_index,
    chunk_total: c.metadata.chunk_total,
    char_count: c.metadata.char_count,
    text: c.text,
  };
}

async function main(): Promise<void> {
  console.log(`[ingest] reading ${CHUNKS_PATH}`);
  const chunks = await readChunks();
  console.log(`[ingest] loaded ${chunks.length} chunks`);
  console.log(`[ingest] qdrant=${QDRANT_URL}  ollama=${OLLAMA_URL}  model=${MODEL}  batch=${BATCH_SIZE}`);

  const client = new QdrantClient({
    url: QDRANT_URL,
    ...(QDRANT_API_KEY ? { apiKey: QDRANT_API_KEY } : {}),
  });
  await ensureCollection(client);

  const total = chunks.length;
  let processed = 0;
  const errors: { id: string; stage: 'embed' | 'upsert'; error: string }[] = [];
  const start = Date.now();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchStart = Date.now();
    const range = `${i}-${i + batch.length - 1}`;

    let vectors: number[][];
    try {
      vectors = await withRetry(`embed ${range}`, () => embedBatch(batch.map((c) => c.text)));
    } catch (e) {
      const msg = (e as Error).message;
      for (const c of batch) errors.push({ id: c.id, stage: 'embed', error: msg });
      console.error(`  [batch ${range}] embed FAILED — ${msg}`);
      continue;
    }

    const points = batch.map((c, idx) => ({
      id: uuidv5(c.id, UUID_NAMESPACE),
      vector: vectors[idx]!,
      payload: buildPayload(c),
    }));

    try {
      await withRetry(`upsert ${range}`, () =>
        client.upsert(COLLECTION, { wait: true, points }),
      );
      processed += batch.length;
    } catch (e) {
      const msg = (e as Error).message;
      for (const c of batch) errors.push({ id: c.id, stage: 'upsert', error: msg });
      console.error(`  [batch ${range}] upsert FAILED — ${msg}`);
      continue;
    }

    const elapsed = Date.now() - start;
    const seen = processed + errors.length;
    const rate = elapsed > 0 ? processed / (elapsed / 1000) : 0;
    const eta = rate > 0 ? ((total - seen) / rate) * 1000 : Infinity;
    const pct = ((seen / total) * 100).toFixed(1);
    const batchMs = Date.now() - batchStart;
    console.log(
      `  [${seen}/${total} ${pct}%] +${batch.length} in ${fmtDuration(batchMs)} | rate ${rate.toFixed(1)}/s | ETA ${fmtDuration(eta)} | errors ${errors.length}`,
    );
  }

  const totalMs = Date.now() - start;
  console.log('');
  console.log(`[ingest] done in ${fmtDuration(totalMs)}`);
  console.log(`  processed: ${processed}/${total}`);
  console.log(`  errors:    ${errors.length}`);

  if (errors.length > 0) {
    console.log('');
    console.log('Failed chunks:');
    const shown = errors.slice(0, 20);
    for (const e of shown) console.log(`  - [${e.stage}] ${e.id}: ${e.error}`);
    if (errors.length > shown.length) {
      console.log(`  ... and ${errors.length - shown.length} more`);
    }
    process.exit(1);
  }

  try {
    const info = await client.getCollection(COLLECTION);
    console.log(`[ingest] collection "${COLLECTION}" now has ${info.points_count ?? '?'} points`);
  } catch {
    /* informational only */
  }
}

main().catch((e) => {
  console.error(`\n[ingest] FATAL: ${(e as Error).stack ?? String(e)}\n`);
  process.exit(1);
});
