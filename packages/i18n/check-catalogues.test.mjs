import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareCatalogues } from './check-catalogues.mjs';

test('om and am catalogues have exactly the en keys', () => {
  for (const r of compareCatalogues()) assert.deepEqual({ missing: r.missing, extra: r.extra }, { missing: [], extra: [] }, r.locale);
});
