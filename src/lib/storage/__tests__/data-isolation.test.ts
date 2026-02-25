// Privacy tests — data isolation between collections

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../localStorage.adapter';
import type { Client, Product, Order } from '@/types/crm';

describe('Data Isolation', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  const mockClient: Client = {
    id: 'test-client-1',
    businessName: 'Test Client',
    contactPerson: '',
    email: 'test@example.com',
    phone: '0501234567',
    address: '',
    area: '',
    clientType: 'business',
    status: 'active',
    tags: [],
    notes: '',
    createdAt: '2026-01-01',
  };

  const mockProduct: Product = {
    id: 'test-product-1',
    name: 'Test Product',
    category: 'other',
    basePrice: 100,
    unit: 'bottle',
    isActive: true,
  };

  it('client data does not appear in orders collection', async () => {
    await adapter.saveClient(mockClient);
    const orders = await adapter.getOrders();
    expect(orders.ok).toBe(true);
    if (orders.ok) {
      expect(orders.data).toHaveLength(0);
    }
  });

  it('product data does not appear in clients collection', async () => {
    await adapter.saveProduct(mockProduct);
    const clients = await adapter.getClients();
    expect(clients.ok).toBe(true);
    if (clients.ok) {
      expect(clients.data).toHaveLength(0);
    }
  });

  it('soft-deleted clients still appear in raw data but with deletedAt', async () => {
    await adapter.saveClient(mockClient);
    await adapter.deleteClient(mockClient.id);
    const clients = await adapter.getClients();
    expect(clients.ok).toBe(true);
    if (clients.ok) {
      expect(clients.data).toHaveLength(1);
      expect(clients.data[0].deletedAt).toBeDefined();
    }
  });

  it('soft-deleted orders still appear in raw data but with deletedAt', async () => {
    const mockOrder: Order = {
      id: 'test-order-1',
      clientId: 'c1',
      clientName: 'Test Client',
      items: [],
      subtotal: 100,
      totalDiscount: 0,
      total: 100,
      paymentStatus: 'pending',
      paymentMethod: 'cash',
      fulfillmentStatus: 'pending',
      amountPaid: 0,
      notes: '',
      createdAt: '2026-01-01',
    };
    await adapter.saveOrder(mockOrder);
    await adapter.deleteOrder(mockOrder.id);
    const orders = await adapter.getOrders();
    expect(orders.ok).toBe(true);
    if (orders.ok) {
      expect(orders.data).toHaveLength(1);
      expect(orders.data[0].deletedAt).toBeDefined();
    }
  });

  it('exportAll returns data from all collections', async () => {
    await adapter.saveClient(mockClient);
    await adapter.saveProduct(mockProduct);
    const exported = await adapter.exportAll();
    expect(exported.ok).toBe(true);
    if (exported.ok) {
      expect(exported.data.clients).toHaveLength(1);
      expect(exported.data.products).toHaveLength(1);
      expect(exported.data.orders).toHaveLength(0);
      expect(exported.data.stockLevels).toHaveLength(0);
      expect(exported.data.stockMovements).toHaveLength(0);
    }
  });
});
