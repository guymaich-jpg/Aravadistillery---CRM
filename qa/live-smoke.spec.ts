import { test, expect, Page } from '@playwright/test';

// Live, READ-ONLY smoke against a deployed URL (staging or prod). No data is
// ever created, edited, or deleted — safe to run against real environments.
// Configured by playwright.qa.config.ts via QA_TARGET_URL / QA_EMAIL / QA_PASSWORD.

const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;
const HAS_CREDS = !!(EMAIL && PASSWORD);

// Tabs expected in the app shell once logged in.
const TABS = ['לקוחות', 'הזמנות', 'מלאי', 'ניתוח', 'מוצרים', 'ניהול', 'מדריך'];

// Console errors that are environment noise, not real problems.
const IGNORED_CONSOLE = /favicon|DevTools|sourcemap|manifest|Content Security Policy|violates the following/i;

function collectConsole(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return errors;
}

async function login(page: Page) {
  await page.fill('input[type="email"]', EMAIL!);
  await page.fill('input[type="password"]', PASSWORD!);
  await page.click('button:has-text("כניסה")');
  await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 15_000 });
}

test.describe('live smoke', () => {
  test('root loads and renders (not blank)', async ({ page }) => {
    const resp = await page.goto('./', { waitUntil: 'domcontentloaded' });
    expect(resp?.status(), 'HTTP status').toBeLessThan(400);
    await expect(page).toHaveTitle(/Aravadistillery CRM/);
    // The clickjacking guard must never leave the body hidden on a top-level load.
    const display = await page.evaluate(() => getComputedStyle(document.body).display);
    expect(display, 'body must be visible').not.toBe('none');
  });

  test('favicon resolves (no 404)', async ({ page }) => {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    const href = await page.getAttribute('link[rel="icon"]', 'href');
    expect(href, 'favicon link present').toBeTruthy();
    const res = await page.request.get(new URL(href!, page.url()).toString());
    expect(res.status(), `favicon ${href}`).toBe(200);
  });

  test('accessibility basics', async ({ page }) => {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    const a11y = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.alt && i.getAttribute('aria-hidden') !== 'true').length,
    }));
    expect(a11y.lang).toBe('he');
    expect(a11y.dir).toBe('rtl');
    expect(a11y.imgsNoAlt, 'images missing alt').toBe(0);
  });

  test.describe('authenticated', () => {
    test.skip(!HAS_CREDS, 'QA_EMAIL / QA_PASSWORD not provided');

    test('logs in and shows the app shell', async ({ page }) => {
      await page.goto('./', { waitUntil: 'domcontentloaded' });
      await login(page);
      await expect(page.getByRole('button', { name: /לקוחות/ }).first()).toBeVisible();
    });

    test('navigates every tab without console errors', async ({ page }) => {
      const errors = collectConsole(page);
      await page.goto('./', { waitUntil: 'domcontentloaded' });
      await login(page);
      for (const tab of TABS) {
        await page.getByRole('button', { name: new RegExp(tab) }).first().click();
        await page.waitForTimeout(1200);
        await expect(page.getByText('שגיאה בהפעלת המערכת')).toHaveCount(0);
      }
      const real = errors.filter((e) => !IGNORED_CONSOLE.test(e));
      expect(real, `console errors:\n${real.join('\n')}`).toEqual([]);
    });

    test('status filter has an accessible name', async ({ page }) => {
      await page.goto('./', { waitUntil: 'domcontentloaded' });
      await login(page);
      const label = await page.locator('select').first().getAttribute('aria-label');
      expect(label, 'status <select> aria-label').toBeTruthy();
    });

    test('no horizontal overflow', async ({ page }) => {
      await page.goto('./', { waitUntil: 'domcontentloaded' });
      await login(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(overflow, 'page must not scroll horizontally').toBe(false);
    });
  });
});
