import { defineConfig, devices } from '@playwright/test';

// Live QA smoke — runs READ-ONLY against a *deployed* URL (staging or prod),
// unlike the hermetic e2e suite (which uses the dev server + localStorage).
// Drives the real app through Firebase auth; never creates/edits/deletes data.
//
//   QA_TARGET_URL   full URL of the deployment to test (required)
//   QA_EMAIL        login email   (optional — unauthenticated checks run without it)
//   QA_PASSWORD     login password
//
// Usage:
//   QA_TARGET_URL=https://…-staging.vercel.app QA_EMAIL=… QA_PASSWORD=… npm run qa:live
const target = process.env.QA_TARGET_URL;
if (!target) throw new Error('QA_TARGET_URL is required (the deployed URL to smoke-test).');

export default defineConfig({
  testDir: './qa',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: target.endsWith('/') ? target : target + '/',
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
