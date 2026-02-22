// Scalability tests — large dataset handling and performance

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../localStorage.adapter';
import type { Client, Order } from '@/types/crm';

describe('Scalability', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('handles 1000 clients correctly', async () => {
    const clients: Client[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `client-${i}`,
      name: `Client ${i}`,
      email: `client${i}@example.com`,
      phone: `050${String(i).padStart(7, '0')}`,
      company: `Company ${i}`,
      status: 'active' as const,
      notes: '',
      createdAt: '2026-01-01',
    }));

    // Bulk write
    for (const client of clients) {
      await adapter.saveClient(client);
    }

    // Read all
    const result = await adapter.getClients();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1000);
    }
  });

  it('reads and filters 5000 orders within 200ms', async () => {
    // Generate 5000 orders
    const orders: Order[] = Array.from({ length: 5000 }, (_, i) => ({
      id: `order-${i}`,
      clientId: `client-${i % 100}`,
      clientName: `Client ${i % 100}`,
      items: [{
        productId: '1',
        productName: 'Test',
        quantity: 1,
        unitPrice: 80,
        discount: 0,
        total: 80,
      }],
      subtotal: 80,
      totalDiscount: 0,
      total: 80,
      paymentStatus: (['paid', 'pending', 'partial'] as const)[i % 3],
      paymentMethod: 'cash' as const,
      amountPaid: i % 3 === 0 ? 80 : 0,
      notes: '',
      createdAt: `2026-${String((i % 12) + 1).padStart(2, '0')}-01`,
    }));

    // Write all orders at once via localStorage
    localStorage.setItem('distillery_crm_orders', JSON.stringify(orders));

    // Measure read time
    const start = performance.now();
    const result = await adapter.getOrders();
    const readTime = performance.now() - start;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(5000);
    }
    expect(readTime).toBeLessThan(200);

    // Measure filter time
    const filterStart = performance.now();
    if (result.ok) {
      const paidOrders = result.data.filter(o => o.paymentStatus === 'paid');
      expect(paidOrders.length).toBeGreaterThan(0);
    }
    const filterTime = performance.now() - filterStart;
    expect(filterTime).toBeLessThan(200);
  });

  it('handles localStorage quota exceeded gracefully', async () => {
    // Mock localStorage.setItem to throw QuotaExceededError
    const originalSetItem = localStorage.setItem;
    let callCount = 0;
    localStorage.setItem = (key: string, value: string) => {
      callCount++;
      if (callCount > 5) {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      }
      originalSetItem.call(localStorage, key, value);
    };

    // First few saves should work
    const client: Client = {
      id: 'quota-test',
      name: 'Test',
      email: '',
      phone: '',
      company: '',
      status: 'active',
      notes: '',
      createdAt: '2026-01-01',
    };
    await adapter.saveClient(client);

    // Eventually should get a QUOTA_EXCEEDED error
    let gotQuotaError = false;
    for (let i = 0; i < 20; i++) {
      const result = await adapter.saveClient({ ...client, id: `quota-${i}` });
      if (!result.ok && result.code === 'QUOTA_EXCEEDED') {
        gotQuotaError = true;
        break;
      }
    }
    expect(gotQuotaError).toBe(true);

    // Restore
    localStorage.setItem = originalSetItem;
  });

  it('exportAll works with large datasets', async () => {
    // Add 100 clients and 500 orders
    const clients = Array.from({ length: 100 }, (_, i) => ({
      id: `c-${i}`, name: `Client ${i}`, email: '', phone: '', company: '',
      status: 'active' as const, notes: '', createdAt: '2026-01-01',
    }));
    localStorage.setItem('distillery_crm_clients', JSON.stringify(clients));

    const orders = Array.from({ length: 500 }, (_, i) => ({
      id: `o-${i}`, clientId: `c-${i % 100}`, clientName: `Client ${i % 100}`,
      items: [], subtotal: 100, totalDiscount: 0, total: 100,
      paymentStatus: 'paid' as const, paymentMethod: 'cash' as const,
      amountPaid: 100, notes: '', createdAt: '2026-01-01',
    }));
    localStorage.setItem('distillery_crm_orders', JSON.stringify(orders));

    const result = await adapter.exportAll();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.clients).toHaveLength(100);
      expect(result.data.orders).toHaveLength(500);
    }
  });

  it('upsert correctly updates existing records', async () => {
    const client: Client = {
      id: 'upsert-test',
      name: 'Original Name',
      email: 'test@example.com',
      phone: '',
      company: '',
      status: 'active',
      notes: '',
      createdAt: '2026-01-01',
    };
    await adapter.saveClient(client);

    // Update
    const updated = { ...client, name: 'Updated Name' };
    await adapter.saveClient(updated);

    const result = await adapter.getClients();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1); // Not duplicated
      expect(result.data[0].name).toBe('Updated Name');
    }
  });
});
