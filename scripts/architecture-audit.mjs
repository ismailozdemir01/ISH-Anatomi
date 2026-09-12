import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['desktop', 'local-ai', 'clinical', 'imaging', 'probe', 'knowledge', 'camera'];
const EXTENSIONS = new Set(['.mjs', '.cjs']);
const TEST_RE = /(?:^|[\\/])[^\\/]+\.test\.(?:mjs|cjs)$/;
const IMPORT_RE = /(?:import\\s+(?:[^'";]+?\\s+from\\s+)?|import\\s*\\(|require\\s*\()\\s*['"]([^'"]+)['"]/g;
const DYNAMIC_ROOT_RE = /path\.join\\(root\\(\\),\\s*'([^']+)'\\s*,\\s*'([^']+)'\\)/g;

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function normalize(p) { return p.split(path.sep).join('/'); }
function relativeId(file) { return normalize(path.relative(ROOT, file)); }

async function resolveLocal(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [base, `${base}.mjs`, `${base}.cjs`, path.join(base, 'index.mjs'), path.join(base, 'index.cjs')];
  for (const candidate of candidates) {
    try { if ((await fs.stat(candidate)).isFile()) return candidate; } catch {}
  }
  return { broken: `${relativeId(from)} -> ${specifier}` };
}

const files = (await Promise.all(SCAN_DIRS.map(async dir => {
  try { return await walk(path.join(ROOT, dir)); } catch { return []; }
}))).flat();
const production = files.filter(f => !TEST_RE.test(relativeId(f)));
const graph = new Map(production.map(f => [f, new Set()]));
const broken = [];

for (const file of production) {
  const text = await fs.readFile(file, 'utf8');
  for (const match of text.matchAll(IMPORT_RE)) {
    const target = await resolveLocal(file, match[1]);
    if (!target) continue;
    if (target.broken) broken.push(target.broken);
    else if (graph.has(target)) graph.get(file).add(target);
  }
  for (const match of text.matchAll(DYNAMIC_ROOT_RE)) {
    const target = path.join(ROOT, match[1], match[2]);
    if (graph.has(target)) graph.get(file).add(target);
    else broken.push(`${relativeId(file)} -> ${match[1]}/${match[2]}`);
  }
}

const rootPaths = [
  path.join(ROOT, 'desktop', 'main.cjs'),
  path.join(ROOT, 'desktop', 'preload.cjs')
].filter(f => graph.has(f));

const reachable = new Set(rootPaths);
const queue = [...rootPaths];
while (queue.length) {
  const current = queue.shift();
  for (const target of graph.get(current) ?? []) {
    if (!reachable.has(target)) { reachable.add(target); queue.push(target); }
  }
}

const orphan = production.filter(f => !reachable.has(f)).map(relativeId).filter(id => !id.startsWith('scripts/'));
const report = {
  status: broken.length || orphan.length ? 'FAIL' : 'PASS',
  productionModules: production.length,
  reachableModules: reachable.size,
  brokenImports: [...new Set(broken)].sort(),
  disconnectedModules: orphan.sort()
};

console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') {
  console.error('ARCHITECTURE_AUDIT_FAILED');
  if (report.brokenImports.length) console.error(`Broken imports: ${report.brokenImports.length}`);
  if (report.disconnectedModules.length) console.error(`Disconnected production modules: ${report.disconnectedModules.length}`);
  process.exit(1);
}
console.log('ARCHITECTURE_AUDIT_PASSED');
