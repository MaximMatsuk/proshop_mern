import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const SOURCE_DIR = join(PROJECT_ROOT, 'project-data');
const FINAL = join(DATA_DIR, 'chunks.jsonl');
const REPORT = join(DATA_DIR, 'report.md');

const GROUPS = ['toplevel', 'features', 'runbooks', 'api', 'adrs', 'pages', 'incidents'] as const;
type Group = (typeof GROUPS)[number];

const MAX = 2100;
const MIN = 1050;
const TARGET = 1750;

const ChunkSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+(__[a-z0-9-]+)*__\d+$/, 'invalid id format'),
  text: z.string().min(1),
  metadata: z.object({
    source_file: z.string().min(1),
    file_path: z.string().min(1),
    group: z.enum(GROUPS),
    title: z.string().min(1),
    parent_headings: z.array(z.string()),
    heading_path: z.string(),
    chunk_index: z.number().int().nonnegative(),
    chunk_total: z.number().int().positive(),
    char_count: z.number().int().nonnegative(),
    approx_tokens: z.number().int().nonnegative(),
    language: z.enum(['ru', 'en', 'mixed']),
    keywords: z.array(z.string()).min(1).max(10),
    summary: z.string().min(1).max(200),
    oversized: z.boolean(),
    has_overlap_prefix: z.boolean(),
  }),
});

type Chunk = z.infer<typeof ChunkSchema>;

function fail(msg: string): never {
  console.error(`\n[finalize-chunks] FAIL: ${msg}\n`);
  process.exit(1);
}

async function readJsonl(path: string): Promise<Chunk[]> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (e) {
    fail(`could not read fragment: ${path}\n  ${(e as Error).message}`);
  }
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) fail(`fragment is empty: ${path}`);
  const out: Chunk[] = [];
  for (let i = 0; i < lines.length; i++) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[i]);
    } catch (e) {
      fail(
        `${path}:${i + 1}: not valid JSON\n  ${(e as Error).message}\n  text: ${lines[i].slice(0, 200)}`,
      );
    }
    const result = ChunkSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((z) => `    - ${z.path.join('.')}: ${z.message}`)
        .join('\n');
      fail(`${path}:${i + 1}: schema violation\n${issues}`);
    }
    out.push(result.data);
  }
  return out;
}

function validateBusinessRules(chunks: Chunk[], path: string): void {
  for (const c of chunks) {
    const meta = c.metadata;
    const where = `${path} (chunk id=${c.id})`;
    if (c.text.length !== meta.char_count) {
      fail(`${where}: char_count=${meta.char_count} but text.length=${c.text.length}`);
    }
    const expectedTok = Math.round(meta.char_count / 3.5);
    if (meta.approx_tokens !== expectedTok) {
      fail(`${where}: approx_tokens=${meta.approx_tokens} expected ${expectedTok}`);
    }
    if (meta.chunk_index >= meta.chunk_total) {
      fail(`${where}: chunk_index ${meta.chunk_index} >= chunk_total ${meta.chunk_total}`);
    }
    if (!meta.oversized && meta.char_count > MAX) {
      fail(`${where}: char_count ${meta.char_count} > MAX ${MAX} but oversized=false`);
    }
    if (meta.heading_path !== meta.parent_headings.join(' > ')) {
      fail(`${where}: heading_path "${meta.heading_path}" mismatches parent_headings`);
    }
  }
}

async function listSourceFiles(): Promise<Map<Group, string[]>> {
  const map = new Map<Group, string[]>();
  const top = (await readdir(SOURCE_DIR, { withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith('.md'))
    .map((d) => d.name)
    .sort();
  map.set('toplevel', top);
  for (const g of ['features', 'runbooks', 'api', 'adrs', 'pages', 'incidents'] as Group[]) {
    const dir = join(SOURCE_DIR, g);
    const files = (await readdir(dir, { withFileTypes: true }))
      .filter((d) => d.isFile() && d.name.endsWith('.md'))
      .map((d) => d.name)
      .sort();
    map.set(g, files);
  }
  return map;
}

function sortChunks(chunks: Chunk[]): Chunk[] {
  return chunks.slice().sort((a, b) => {
    if (a.metadata.source_file !== b.metadata.source_file) {
      return a.metadata.source_file.localeCompare(b.metadata.source_file);
    }
    return a.metadata.chunk_index - b.metadata.chunk_index;
  });
}

function buildReport(opts: {
  byGroup: Map<Group, Chunk[]>;
  expectedFiles: Map<Group, string[]>;
  totalChunks: number;
  gitSha: string;
  timestamp: string;
}): string {
  const { byGroup, expectedFiles, totalChunks, gitSha, timestamp } = opts;
  const lines: string[] = [];
  lines.push(`# Chunking Report`);
  lines.push('');
  lines.push(`**Artifact:** \`data/chunks.jsonl\`  `);
  lines.push(`**Generated:** ${timestamp}  `);
  lines.push(`**Git SHA:** \`${gitSha}\`  `);
  lines.push(`**Total chunks:** ${totalChunks}`);
  lines.push('');
  lines.push(`## Skipped`);
  lines.push('');
  lines.push(`- \`project-data/features.json\` — structured JSON, intentionally excluded.`);
  lines.push('');
  lines.push(`## By group`);
  lines.push('');
  lines.push(`| Group | Files | Chunks |`);
  lines.push(`|---|---:|---:|`);
  for (const g of GROUPS) {
    const files = expectedFiles.get(g) ?? [];
    const chs = byGroup.get(g) ?? [];
    lines.push(`| ${g} | ${files.length} | ${chs.length} |`);
  }
  lines.push('');

  const buckets = { under_min: 0, min_to_target: 0, target_to_max: 0, oversized: 0 };
  for (const list of byGroup.values()) {
    for (const c of list) {
      const cc = c.metadata.char_count;
      if (c.metadata.oversized) buckets.oversized++;
      else if (cc < MIN) buckets.under_min++;
      else if (cc <= TARGET) buckets.min_to_target++;
      else buckets.target_to_max++;
    }
  }
  lines.push(`## Size histogram`);
  lines.push('');
  lines.push(`| Bucket | Count |`);
  lines.push(`|---|---:|`);
  lines.push(`| < ${MIN} chars | ${buckets.under_min} |`);
  lines.push(`| ${MIN}..${TARGET} chars | ${buckets.min_to_target} |`);
  lines.push(`| ${TARGET + 1}..${MAX} chars | ${buckets.target_to_max} |`);
  lines.push(`| oversized (> ${MAX}, protected) | ${buckets.oversized} |`);
  lines.push('');

  const lang = { ru: 0, en: 0, mixed: 0 };
  for (const list of byGroup.values()) for (const c of list) lang[c.metadata.language]++;
  lines.push(`## Language`);
  lines.push('');
  lines.push(`| Language | Chunks |`);
  lines.push(`|---|---:|`);
  lines.push(`| ru | ${lang.ru} |`);
  lines.push(`| en | ${lang.en} |`);
  lines.push(`| mixed | ${lang.mixed} |`);
  lines.push('');

  const oversized: { id: string; file_path: string; char_count: number }[] = [];
  for (const list of byGroup.values()) {
    for (const c of list) {
      if (c.metadata.oversized) {
        oversized.push({
          id: c.id,
          file_path: c.metadata.file_path,
          char_count: c.metadata.char_count,
        });
      }
    }
  }
  lines.push(`## Oversized chunks`);
  lines.push('');
  if (oversized.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(`| id | file | char_count |`);
    lines.push(`|---|---|---:|`);
    for (const o of oversized) {
      lines.push(`| \`${o.id}\` | \`${o.file_path}\` | ${o.char_count} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  console.log('[finalize-chunks] reading group fragments...');
  const byGroup = new Map<Group, Chunk[]>();
  const allIds = new Set<string>();

  for (const g of GROUPS) {
    const path = join(DATA_DIR, `chunks.${g}.jsonl`);
    const chunks = await readJsonl(path);
    validateBusinessRules(chunks, path);
    for (const c of chunks) {
      if (c.metadata.group !== g) {
        fail(
          `${path} (id=${c.id}): metadata.group="${c.metadata.group}" but file is for group "${g}"`,
        );
      }
      if (allIds.has(c.id)) fail(`duplicate id across corpus: ${c.id} (in ${path})`);
      allIds.add(c.id);
    }
    byGroup.set(g, sortChunks(chunks));
    console.log(`  ${g}: ${chunks.length} chunks ✓`);
  }

  console.log('[finalize-chunks] verifying source-file coverage...');
  const expected = await listSourceFiles();
  for (const g of GROUPS) {
    const expectedFiles = expected.get(g) ?? [];
    const seenFiles = new Set((byGroup.get(g) ?? []).map((c) => c.metadata.source_file));
    for (const f of expectedFiles) {
      if (!seenFiles.has(f)) fail(`source file has no chunks: ${g}/${f}`);
    }
  }

  console.log('[finalize-chunks] merging...');
  const merged: Chunk[] = [];
  for (const g of GROUPS) merged.push(...(byGroup.get(g) ?? []));

  const out = merged.map((c) => JSON.stringify(c)).join('\n') + '\n';
  await writeFile(FINAL, out, 'utf8');
  console.log(`  wrote ${FINAL} (${merged.length} chunks)`);

  let gitSha = 'unknown';
  try {
    gitSha = execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT }).toString().trim();
  } catch {
    /* not in a git repo */
  }
  const report = buildReport({
    byGroup,
    expectedFiles: expected,
    totalChunks: merged.length,
    gitSha,
    timestamp: new Date().toISOString(),
  });
  await writeFile(REPORT, report, 'utf8');
  console.log(`  wrote ${REPORT}`);
  console.log('[finalize-chunks] OK');
}

main().catch((e) => fail(e?.stack ?? String(e)));
