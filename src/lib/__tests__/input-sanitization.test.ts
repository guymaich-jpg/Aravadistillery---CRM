// Security tests — input sanitization at data layer

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../storage/localStorage.adapter';
import type { Client, Order, OrderItem } from '@/types/crm';
import type { StockMovement } from '@/types/inventory';

describe('Input Sanitization', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  it('handles empty string fields in clients gracefully', async () => {
    const client: Client = {
      id: 'empty-fields',
      businessName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      area: '',
      clientType: 'business',
      status: 'active',
      tags: [],
      notes: '',
      createdAt: '2026-01-01',
    };
    const result = await adapter.saveClient(client);
    expect(result.ok).toBe(true);
    const fetched = await adapter.getClients();
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.data[0].businessName).toBe('');
    }
  });

  it('handles extremely long strings without crashing', async () => {
    const longString = 'א'.repeat(100_000);
    const client: Client = {
      id: 'long-name',
      businessName: longString,
      contactPerson: '',
      email: 'test@example.com',
      phone: '',
      address: '',
      area: '',
      clientType: 'business',
      status: 'active',
      tags: [],
      notes: longString,
      createdAt: '2026-01-01',
    };
    const result = await adapter.saveClient(client);
    expect(result.ok).toBe(true);
    const fetched = await adapter.getClients();
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.data[0].businessName).toBe(longString);
    }
  });

  it('stores orders with zero amounts correctly', async () => {
    const order: Order = {
      id: 'zero-order',
      clientId: 'c1',
      clientName: 'Test',
      items: [],
      subtotal: 0,
      totalDiscount: 0,
      total: 0,
      paymentStatus: 'pending',
      paymentMethod: 'cash',
      amountPaid: 0,
      notes: '',
      createdAt: '2026-01-01',
    };
    const result = await adapter.saveOrder(order);
    expect(result.ok).toBe(true);
    const fetched = await adapter.getOrders();
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.data[0].total).toBe(0);
      expect(fetched.data[0].amountPaid).toBe(0);
    }
  });

  it('handles order items with negative discount (edge case)', async () => {
    const item: OrderItem = {
      productId: '1',
      productName: 'Test',
      quantity: 1,
      unitPrice: 100,
      discount: -10, // negative discount = surcharge
      total: 110,
    };
    const order: Order = {
      id: 'negative-discount',
      clientId: 'c1',
      clientName: 'Test',
      items: [item],
      subtotal: 110,
      totalDiscount: -10,
      total: 110,
      paymentStatus: 'pending',
      paymentMethod: 'cash',
      amountPaid: 0,
      notes: '',
      createdAt: '2026-01-01',
    };
    const result = await adapter.saveOrder(order);
    expect(result.ok).toBe(true);
  });

  it('handles unicode and RTL characters in all text fields', async () => {
    const client: Client = {
      id: 'unicode-test',
      businessName: 'יניב אינסטלטור 🔧',
      contactPerson: 'יניב כהן',
      email: 'יניב@example.com',
      phone: '+972-50-123-4567',
      address: '',
      area: 'north',
      clientType: 'business',
      status: 'active',
      tags: [],
      notes: 'הערות עם תווים מיוחדים: @#$%^&*()',
      createdAt: '2026-01-01',
    };
    const result = await adapter.saveClient(client);
    expect(result.ok).toBe(true);
    const fetched = await adapter.getClients();
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.data[0].businessName).toBe('יניב אינסטלטור 🔧');
      expect(fetched.data[0].contactPerson).toBe('יניב כהן');
    }
  });

  it('stock movements maintain correct delta sign', async () => {
    const inbound: StockMovement = {
      id: 'inbound-1',
      productId: '1',
      productName: 'Test',
      type: 'inbound',
      quantity: 10,
      delta: 10,
      createdAt: '2026-01-01',
    };
    const outbound: StockMovement = {
      id: 'outbound-1',
      productId: '1',
      productName: 'Test',
      type: 'outbound',
      quantity: 5,
      delta: -5,
      createdAt: '2026-01-01',
    };
    await adapter.saveStockMovement(inbound);
    await adapter.saveStockMovement(outbound);
    const result = await adapter.getStockMovements();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].delta).toBe(10);
      expect(result.data[1].delta).toBe(-5);
    }
  });
});
