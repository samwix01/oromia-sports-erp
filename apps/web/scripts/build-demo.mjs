// Builds the static, fictional-data demo into apps/web/out.
// Middleware is a server feature and cannot run in a static export, so it is moved aside for the
// build and restored afterwards; a small index.html sends visitors to the Afaan Oromo home page.
import { execSync } from 'node:child_process';
import { existsSync, renameSync, writeFileSync } from 'node:fs';

const mw = 'src/middleware.ts';
const parked = 'src/middleware.ts.export-off';
const base = process.env.NEXT_BASE_PATH ?? '';

if (existsSync(mw)) renameSync(mw, parked);
try {
  execSync('next build', { stdio: 'inherit', env: { ...process.env, STATIC_EXPORT: '1' } });
  const target = `${base}/om/`;
  writeFileSync(
    'out/index.html',
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${target}"><title>Oromia Digital Sports Hub</title><a href="${target}">Afaan Oromoo</a> · <a href="${base}/en/">English</a> · <a href="${base}/am/">አማርኛ</a>\n`,
  );
  writeFileSync('out/.nojekyll', '');
} finally {
  if (existsSync(parked)) renameSync(parked, mw);
}
