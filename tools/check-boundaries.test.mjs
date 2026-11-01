import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations } from './check-boundaries.mjs';

test('flags a cross-module import that bypasses public-api', () => {
  const v = findViolations(new URL('./__fixtures__/bad/modules', import.meta.url).pathname);
  assert.equal(v.length, 1);
  assert.equal(v[0].from, 'people');
  assert.equal(v[0].to, 'competitions');
});

test('allows public-api and same-module imports', () => {
  assert.deepEqual(findViolations(new URL('./__fixtures__/good/modules', import.meta.url).pathname), []);
});
