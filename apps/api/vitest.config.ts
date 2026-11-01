import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC is needed so Nest decorator metadata is emitted in tests.
// Integration tests share one database, so files run one at a time.
export default defineConfig({
  plugins: [swc.vite()],
  test: { include: ['test/**/*.test.ts'], fileParallelism: false, testTimeout: 30_000, hookTimeout: 60_000 },
});
