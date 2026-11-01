import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC is needed so Nest decorator metadata is emitted in tests.
export default defineConfig({ plugins: [swc.vite()], test: { include: ['test/**/*.test.ts'] } });
