#!/usr/bin/env node
// Enforces CLAUDE.md module boundaries for apps/api/src/modules/<module>/**:
// a module may import another module ONLY through that module's `public-api.ts`.
// Dependency-free so it runs before `pnpm install` and in CI.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function moduleOf(file, modulesRoot) {
  const rel = relative(modulesRoot, file);
  if (rel.startsWith('..')) return null;
  return rel.split(sep)[0] ?? null;
}

/** @returns {{file:string, line:number, spec:string, from:string, to:string}[]} */
export function findViolations(modulesRoot) {
  const root = resolve(modulesRoot);
  const violations = [];
  for (const file of walk(root)) {
    const from = moduleOf(file, root);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!spec || !spec.startsWith('.')) continue;
      const target = resolve(dirname(file), spec);
      const to = moduleOf(target, root);
      if (!to || to === from) continue;
      const tail = relative(join(root, to), target).replace(/\.(ts|js)$/, '');
      if (tail === 'public-api') continue;
      const line = src.slice(0, m.index).split('\n').length;
      violations.push({ file: relative(process.cwd(), file), line, spec, from, to });
    }
  }
  return violations;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const target = process.argv[2] ?? 'apps/api/src/modules';
  const v = findViolations(target);
  if (v.length) {
    for (const x of v) console.error(`${x.file}:${x.line}  '${x.spec}' — module '${x.from}' may only import '${x.to}/public-api'`);
    console.error(`\n${v.length} module-boundary violation(s).`);
    process.exit(1);
  }
  console.log('Module boundaries OK');
}
