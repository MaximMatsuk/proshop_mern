import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');

const GROUPS = ['toplevel', 'features', 'runbooks', 'api', 'adrs', 'pages', 'incidents'] as const;

let totalFixed = 0;
let totalChunks = 0;

for (const g of GROUPS) {
  const path = join(DATA_DIR, `chunks.${g}.jsonl`);
  const raw = await readFile(path, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const fixed: string[] = [];
  let groupFixed = 0;
  for (let i = 0; i < lines.length; i++) {
    const obj = JSON.parse(lines[i]);
    const actual = obj.text.length;
    const expectedTok = Math.round(actual / 3.5);
    if (obj.metadata.char_count !== actual || obj.metadata.approx_tokens !== expectedTok) {
      groupFixed++;
      obj.metadata.char_count = actual;
      obj.metadata.approx_tokens = expectedTok;
    }
    fixed.push(JSON.stringify(obj));
  }
  totalChunks += lines.length;
  totalFixed += groupFixed;
  if (groupFixed > 0) {
    await writeFile(path, fixed.join('\n') + '\n', 'utf8');
    console.log(`  ${g}: ${groupFixed}/${lines.length} chunks corrected`);
  } else {
    console.log(`  ${g}: clean (${lines.length} chunks)`);
  }
}
console.log(`[normalize-chunks] ${totalFixed}/${totalChunks} chunks normalized`);
