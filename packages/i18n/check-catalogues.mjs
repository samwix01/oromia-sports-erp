// Every locale must have exactly the same keys as en.json (the reference catalogue).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dir = fileURLToPath(new URL('./messages/', import.meta.url));
const flatten = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${p}${k}.`) : [`${p}${k}`]));

export function compareCatalogues(locales = ['om', 'am']) {
  const ref = new Set(flatten(JSON.parse(readFileSync(resolve(dir, 'en.json'), 'utf8'))));
  return locales.map((l) => {
    const keys = new Set(flatten(JSON.parse(readFileSync(resolve(dir, `${l}.json`), 'utf8'))));
    return { locale: l, missing: [...ref].filter((k) => !keys.has(k)), extra: [...keys].filter((k) => !ref.has(k)) };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const res = compareCatalogues();
  const bad = res.filter((r) => r.missing.length || r.extra.length);
  for (const r of bad) console.error(r);
  if (bad.length) process.exit(1);
  console.log('i18n catalogues in sync');
}
