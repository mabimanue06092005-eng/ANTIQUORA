import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

// Load ADMIN_EMAIL / ADMIN_PASSWORD (dev-only) from the root .env for the admin journeys.
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(ADMIN_EMAIL|ADMIN_PASSWORD)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  // Starts API + web if they are not already running (requires the database to be up and seeded).
  webServer: [
    { command: 'npm run dev:api', url: 'http://localhost:4000/api/health', reuseExistingServer: true, timeout: 120_000, env: { DISABLE_RATE_LIMIT: '1' } },
    { command: 'npm run dev:web', url: BASE_URL, reuseExistingServer: true, timeout: 120_000 },
  ],
});
