import { test, expect } from '@playwright/test';
import { login, seedClientAndReload, createOrder, TEST_CLIENT } from './helpers';

// End-to-end smoke coverage for the CRM's critical path. Runs in localStorage
// (dev) mode — hermetic, no Firebase. Guards the flows that had real runtime
// bugs (orders missing from the list / wrong payment status / missing time).

test.describe('CRM smoke', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    await login(page);
    await seedClientAndReload(page);
  });

  test('logs in and renders the app shell', async ({ page }) => {
    await expect(page.getByRole('button', { name: /הזמנות/ }).first()).toBeVisible();
  });

  test('navigates all main tabs without crashing', async ({ page }) => {
    for (const tab of ['לקוחות', 'הזמנות', 'מלאי', 'ניתוח']) {
      await page.getByRole('button', { name: new RegExp(tab) }).first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText('שגיאה בהפעלת המערכת')).toHaveCount(0);
    }
  });

  test('creates a pending order — appears in the list with correct status and time', async ({ page }) => {
    await createOrder(page, 'pending');

    // Persisted correctly (bug: pending was saved/shown as paid)
    const orders = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('distillery_crm_orders') || '[]'));
    expect(orders).toHaveLength(1);
    expect(orders[0].paymentStatus).toBe('pending');
    expect(orders[0].amountPaid).toBe(0);

    // Visible in the list (bug: new order didn't appear)
    await expect(page.getByText(TEST_CLIENT.businessName).first()).toBeVisible();
    // Correct badge, not "paid"
    await expect(page.getByText('ממתין').first()).toBeVisible();
    await expect(page.getByText('שולם')).toHaveCount(0);
    // Order time-of-day rendered (feature)
    await expect(page.locator('text=/^\\d{1,2}:\\d{2}$/').first()).toBeVisible();
  });

  test('creates a paid order — full amount recorded', async ({ page }) => {
    await createOrder(page, 'paid');
    type StoredOrder = { paymentStatus: string; amountPaid: number; total: number };
    const orders: StoredOrder[] = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('distillery_crm_orders') || '[]'));
    const paid = orders.find((o) => o.paymentStatus === 'paid');
    expect(paid).toBeTruthy();
    expect(paid!.amountPaid).toBe(paid!.total);
  });

  test('inventory and analytics screens render', async ({ page }) => {
    await page.getByRole('button', { name: /מלאי/ }).first().click();
    await page.waitForTimeout(800);
    await expect(page.getByText('שגיאה בהפעלת המערכת')).toHaveCount(0);

    await page.getByRole('button', { name: /ניתוח/ }).first().click();
    await page.waitForTimeout(800);
    await expect(page.getByText('שגיאה בהפעלת המערכת')).toHaveCount(0);
  });

  test.afterEach(async () => {
    const real = consoleErrors.filter((e) => !/favicon|DevTools|manifest|sourcemap/i.test(e));
    expect(real, `console errors:\n${real.join('\n')}`).toEqual([]);
  });
});
