/** Reviewed, additive migration. Defaults to dry-run; --apply commits with update-time preconditions. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const budgetSource = readFileSync(new URL('../src/utils/trialBudget.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(budgetSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { estimateTokens, getTrialInputLimit } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const base = 'https://firestore.googleapis.com/v1/projects/prompt-kit-7a67e/databases/(default)/documents';
const reviewed = JSON.parse(readFileSync(new URL('./data/prompt-usage-2026-10-03.json', import.meta.url), 'utf8'));
const res = await fetch(`${base}/prompts?pageSize=1000`);
if (!res.ok) throw new Error(`Read failed: ${res.status}`);
const snapshot = await res.json();
if (snapshot.nextPageToken) throw new Error('Pagination required; stop without writing.');
mkdirSync('.local-backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`.local-backups/prompts-${stamp}.json`, JSON.stringify(snapshot, null, 2));
const documents = new Map(snapshot.documents.map(d => [d.name.split('/').at(-1), d]));
const writes = [];
const report = [];
for (const row of reviewed) {
  const d = documents.get(row.id);
  if (!d || d.fields.title.stringValue !== row.title) throw new Error(`Document mismatch: ${row.id}`);
  const currentContent = d.fields.content?.stringValue || '';
  if (createHash('sha256').update(currentContent).digest('hex') !== row.contentSha256) throw new Error(`Content changed since review: ${row.id}`);
  const { id, title, contentSha256: _sourceHash, ...metadata } = row;
  metadata.trialInputMaxChars = row.usageMode === 'external' ? 0 : getTrialInputLimit(currentContent);
  if (d.fields.sampleInput?.stringValue) delete metadata.sampleInput;
  const fields = Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }]));
  writes.push({ update: { name: d.name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime: d.updateTime } });
  report.push({ id, title, ...metadata, estimatedPromptTokens: estimateTokens(currentContent), starred: d.fields.favorite?.booleanValue ?? false });
}
writeFileSync(`.local-backups/classification-${stamp}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', documents: writes.length, counts: report.reduce((a,r) => ({ ...a, [r.usageMode]: (a[r.usageMode] || 0) + 1 }), {}) }));
if (process.argv.includes('--apply')) {
  const commit = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  if (!commit.ok) throw new Error(`Atomic commit failed: ${commit.status} ${await commit.text()}`);
  const result = await commit.json();
  console.log(`Committed ${result.writeResults.length} metadata updates.`);
  const verify = await fetch(`${base}/prompts?pageSize=1000`);
  if (!verify.ok) throw new Error(`Verification read failed: ${verify.status}`);
  const after = await verify.json();
  for (const d of after.documents) {
    const before = documents.get(d.name.split('/').at(-1));
    if (!before) continue;
    for (const key of ['content', 'title', 'favorite', 'category', 'status', 'visibility']) {
      if (JSON.stringify(d.fields[key]) !== JSON.stringify(before.fields[key])) throw new Error(`Unexpected change: ${key} ${d.name}`);
    }
    const row = report.find(r => r.id === d.name.split('/').at(-1));
    if (row) for (const [key, value] of Object.entries(row)) {
      if (['id','title','estimatedPromptTokens','starred'].includes(key)) continue;
      const actual = d.fields[key]?.stringValue ?? Number(d.fields[key]?.integerValue);
      if (actual !== value) throw new Error(`Verification mismatch: ${key} ${row.id}`);
    }
  }
  writeFileSync(`.local-backups/prompts-after-${stamp}.json`, JSON.stringify(after, null, 2));
  console.log('Verified all metadata; original content, titles, categories, publication state and stars unchanged.');
}
