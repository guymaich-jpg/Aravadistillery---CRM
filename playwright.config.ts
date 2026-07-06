import { defineConfig, devices } from '@playwright/test';

// CRM E2E — runs against the Vite dev server in localStorage mode (no Firebase
// env → LocalStorageAdapter), so the suite is hermetic and never touches
// production. CI installs chromium via `npx playwright install`; locally set
// PW_CHANNEL=chrome to use the system browser.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173/Aravadistillery---CRM/',
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/Aravadistillery---CRM/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
