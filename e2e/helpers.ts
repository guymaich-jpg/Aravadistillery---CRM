import { Page, expect } from '@playwright/test';

// Dev-mode credentials (import.meta.env.DEV only — stripped from prod builds).
export const DEV_ADMIN = { email: 'admin@dev.local', password: 'Admin1234' };

/** A single active client, seeded directly so order tests don't depend on the client dialog. */
export const TEST_CLIENT = {
  id: 'e2e-client-1',
  businessName: 'לקוח בדיקה',
  contactPerson: 'דני',
  phone: '0501234567',
  email: '',
  address: '',
  area: 'center',
  clientType: 'business',
  status: 'active',
  tags: [] as string[],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
};

/** Log in with the dev admin account and wait for the app shell. */
export async function login(page: Page) {
  await page.goto('./');
  await page.fill('input[type="email"]', DEV_ADMIN.email);
  await page.fill('input[type="password"]', DEV_ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page.locator('input[type="email"]')).toHaveCount(0, { timeout: 8000 });
}

/** Seed one client + empty orders, then reload so the app picks them up. */
export async function seedClientAndReload(page: Page) {
  await page.evaluate((client) => {
    localStorage.setItem('distillery_crm_clients', JSON.stringify([client]));
    localStorage.setItem('distillery_crm_orders', JSON.stringify([]));
  }, TEST_CLIENT);
  await page.reload();
  await page.waitForTimeout(600);
}

/** Walk the 3-step New Order wizard and save with the given payment status. */
export async function createOrder(page: Page, status: 'paid' | 'pending' | 'partial') {
  await page.getByRole('button', { name: /הזמנות/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /הזמנה חדשה/ }).first().click();
  await page.waitForTimeout(400);
  // Step 1 — client
  await page.getByRole('button', { name: new RegExp(TEST_CLIENT.businessName) }).click();
  await page.getByRole('button', { name: /הבא/ }).click();
  await page.waitForTimeout(300);
  // Step 2 — add a line item
  const addItem = page.getByRole('button', { name: /הוסף פריט/ });
  if (await addItem.count()) await addItem.first().click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /הבא/ }).click();
  await page.waitForTimeout(300);
  // Step 3 — payment status + save
  await page.locator('#order-paymentStatus').selectOption(status);
  await page.getByRole('button', { name: /שמור הזמנה/ }).click();
  await page.waitForTimeout(1000);
}
