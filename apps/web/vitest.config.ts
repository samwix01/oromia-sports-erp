import { defineConfig } from 'vitest/config';

// Unit tests only; Playwright specs in e2e/ run via `pnpm test:e2e`.
export default defineConfig({ test: { include: ['test/**/*.test.ts'] } });
