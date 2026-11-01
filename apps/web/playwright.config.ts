import { defineConfig, devices } from '@playwright/test';

// Runs against the static demo export (pnpm build:demo first).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'node e2e/serve.mjs', url: 'http://localhost:3100/om/', reuseExistingServer: !process.env.CI },
});
