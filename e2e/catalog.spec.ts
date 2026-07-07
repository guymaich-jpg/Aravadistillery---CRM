import { test, expect } from '@playwright/test';
import { login } from './helpers';

// Coverage for the catalog / wholesale-pricing / Products screen features.
// Runs hermetically in localStorage (dev) mode.

const WHOLESALER_CLIENT = {
  id: 'e2e-wholesaler', businessName: 'סיטונאי בדיקה', contactPerson: '', phone: '0500000000',
  email: '', address: '', area: 'center', clientType: 'wholesaler', status: 'active',
  tags: [], notes: '', createdAt: '2026-01-01T00:00:00.000Z',
};

// One product with a wholesale price distinct from the regular price, so the
// test can observe which one the order flow applies.
const TEST_PRODUCTS = [
  { id: '1', name: 'מוצר בדיקה', category: 'other', basePrice: 100, wholesalePrice: 70, unit: 'בקבוק', isActive: true },
];

async function seed(page: import('@playwright/test').Page, clientType: 'business' | 'wholesaler') {
  await page.evaluate(([products, wholesaler, ct]) => {
    localStorage.setItem('distillery_crm_products', JSON.stringify(products));
    localStorage.setItem('distillery_crm_orders', JSON.stringify([]));
    localStorage.setItem('distillery_crm_clients', JSON.stringify([{ ...wholesaler, clientType: ct, businessName: ct === 'wholesaler' ? 'סיטונאי בדיקה' : 'לקוח רגיל' }]));
  }, [TEST_PRODUCTS, WHOLESALER_CLIENT, clientType] as const);
  await page.reload();
  await page.waitForTimeout(600);
}

async function makeOrder(page: import('@playwright/test').Page, clientBusinessName: string) {
  await page.getByRole('button', { name: /הזמנות/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /הזמנה חדשה/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: new RegExp(clientBusinessName) }).click();
  await page.getByRole('button', { name: /הבא/ }).click();
  await page.waitForTimeout(300);
  const add = page.getByRole('button', { name: /הוסף פריט/ });
  if (await add.count()) await add.first().click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /הבא/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /שמור הזמנה/ }).click();
  await page.waitForTimeout(1000);
}

test('wholesaler client → order line defaults to the wholesale price', async ({ page }) => {
  await login(page);
  await seed(page, 'wholesaler');
  await makeOrder(page, 'סיטונאי בדיקה');
  const orders = await page.evaluate(() => JSON.parse(localStorage.getItem('distillery_crm_orders') || '[]'));
  expect(orders).toHaveLength(1);
  expect(orders[0].items[0].unitPrice).toBe(70); // wholesale, not 100
});

test('non-wholesaler client → order line uses the regular price', async ({ page }) => {
  await login(page);
  await seed(page, 'business');
  await makeOrder(page, 'לקוח רגיל');
  const orders = await page.evaluate(() => JSON.parse(localStorage.getItem('distillery_crm_orders') || '[]'));
  expect(orders[0].items[0].unitPrice).toBe(100); // regular
});

test('new order defaults to "waiting for payment" (ממתין לתשלום)', async ({ page }) => {
  await login(page);
  await seed(page, 'business');
  await makeOrder(page, 'לקוח רגיל'); // never touches the status selector
  const orders = await page.evaluate(() => JSON.parse(localStorage.getItem('distillery_crm_orders') || '[]'));
  expect(orders[0].paymentStatus).toBe('pending');
  expect(orders[0].amountPaid).toBe(0);
  await expect(page.getByText('ממתין לתשלום').first()).toBeVisible();
});

test('Products screen: manager can edit a wholesale price', async ({ page }) => {
  await login(page);
  await seed(page, 'business');
  await page.getByRole('button', { name: /מוצרים/ }).first().click();
  await page.waitForTimeout(600);
  await expect(page.getByText('מוצר בדיקה')).toBeVisible();
  // Edit the wholesale price (2nd price input in the row) to 55
  const priceInputs = page.locator('input[type="number"]');
  await priceInputs.nth(1).fill('55');
  await priceInputs.nth(1).blur();
  await page.waitForTimeout(400);
  const products = await page.evaluate(() => JSON.parse(localStorage.getItem('distillery_crm_products') || '[]'));
  expect(products[0].wholesalePrice).toBe(55);
});
