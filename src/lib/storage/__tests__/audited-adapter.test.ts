import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditedStorageAdapter } from '../audited.adapter';
import type { StorageAdapter } from '../adapter';
import { ok, err } from '../adapter';
import type { AuditLogger } from '@/lib/audit';
import type { Client, Order, Product } from '@/types/crm';
import type { StockLevel, StockMovement, InventoryBatch } from '@/types/inventory';

function createMockAdapter(): StorageAdapter {
  return {
    isAvailable: vi.fn(() => Promise.resolve(true)),
    getClients: vi.fn(() => Promise.resolve(ok([]))),
    saveClient: vi.fn((c: Client) => Promise.resolve(ok(c))),
    deleteClient: vi.fn(() => Promise.resolve(ok(undefined as void))),
    getOrders: vi.fn(() => Promise.resolve(ok([]))),
    saveOrder: vi.fn((o: Order) => Promise.resolve(ok(o))),
    deleteOrder: vi.fn(() => Promise.resolve(ok(undefined as void))),
    getProducts: vi.fn(() => Promise.resolve(ok([]))),
    saveProduct: vi.fn((p: Product) => Promise.resolve(ok(p))),
    getStockLevels: vi.fn(() => Promise.resolve(ok([]))),
    saveStockLevel: vi.fn((l: StockLevel) => Promise.resolve(ok(l))),
    getStockMovements: vi.fn(() => Promise.resolve(ok([]))),
    saveStockMovement: vi.fn((m: StockMovement) => Promise.resolve(ok(m))),
    getInventoryBatches: vi.fn(() => Promise.resolve(ok([]))),
    saveInventoryBatch: vi.fn((b: InventoryBatch) => Promise.resolve(ok(b))),
    getSchemaVersion: vi.fn(() => Promise.resolve(ok('9'))),
    setSchemaVersion: vi.fn(() => Promise.resolve(ok(undefined as void))),
    exportAll: vi.fn(() => Promise.resolve(ok({
      clients: [], orders: [], products: [], stockLevels: [], stockMovements: [],
    }))),
  };
}

function createMockLogger(): AuditLogger {
  return {
    isEnabled: vi.fn(() => true),
    log: vi.fn(),
  } as unknown as AuditLogger;
}

const sampleClient: Client = {
  id: 'c1',
  businessName: 'מסעדת השף',
  contactPerson: 'יוסי',
  phone: '050-1234567',
  email: 'chef@example.com',
  address: 'תל אביב',
  area: 'center',
  clientType: 'business',
  status: 'active',
  tags: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const sampleOrder: Order = {
  id: 'o1',
  clientId: 'c1',
  clientName: 'מסעדת השף',
  items: [],
  subtotal: 100,
  totalDiscount: 0,
  total: 100,
  paymentStatus: 'pending',
  paymentMethod: 'transfer',
  fulfillmentStatus: 'pending',
  amountPaid: 0,
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const sampleProduct: Product = {
  id: 'p1',
  name: 'ויסקי ערבה',
  category: 'whiskey',
  basePrice: 250,
  unit: 'bottle',
  isActive: true,
};

describe('AuditedStorageAdapter', () => {
  let inner: StorageAdapter;
  let logger: AuditLogger;
  let adapter: AuditedStorageAdapter;

  beforeEach(() => {
    inner = createMockAdapter();
    logger = createMockLogger();
    adapter = new AuditedStorageAdapter(inner, logger);
  });

  // ── Read operations should NOT trigger audit ──────────────────────────────

  it('delegates getClients without auditing', async () => {
    await adapter.getClients();
    expect(inner.getClients).toHaveBeenCalledTimes(1);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('delegates getOrders without auditing', async () => {
    await adapter.getOrders();
    expect(inner.getOrders).toHaveBeenCalledTimes(1);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('delegates getProducts without auditing', async () => {
    await adapter.getProducts();
    expect(inner.getProducts).toHaveBeenCalledTimes(1);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('delegates exportAll without auditing', async () => {
    await adapter.exportAll();
    expect(inner.exportAll).toHaveBeenCalledTimes(1);
    expect(logger.log).not.toHaveBeenCalled();
  });

  // ── Successful writes SHOULD trigger audit ────────────────────────────────

  it('audits saveClient on success', async () => {
    const result = await adapter.saveClient(sampleClient);
    expect(result.ok).toBe(true);
    expect(inner.saveClient).toHaveBeenCalledWith(sampleClient);
    expect(logger.log).toHaveBeenCalledWith({
      action: 'save',
      collection: 'clients',
      recordId: 'c1',
      snapshot: expect.objectContaining({ businessName: 'מסעדת השף' }),
    });
  });

  it('audits deleteClient on success', async () => {
    const result = await adapter.deleteClient('c1');
    expect(result.ok).toBe(true);
    expect(inner.deleteClient).toHaveBeenCalledWith('c1');
    expect(logger.log).toHaveBeenCalledWith({
      action: 'delete',
      collection: 'clients',
      recordId: 'c1',
      snapshot: expect.objectContaining({ id: 'c1' }),
    });
  });

  it('audits saveOrder on success', async () => {
    const result = await adapter.saveOrder(sampleOrder);
    expect(result.ok).toBe(true);
    expect(logger.log).toHaveBeenCalledWith({
      action: 'save',
      collection: 'orders',
      recordId: 'o1',
      snapshot: expect.objectContaining({ clientName: 'מסעדת השף' }),
    });
  });

  it('audits deleteOrder on success', async () => {
    const result = await adapter.deleteOrder('o1');
    expect(result.ok).toBe(true);
    expect(logger.log).toHaveBeenCalledWith({
      action: 'delete',
      collection: 'orders',
      recordId: 'o1',
      snapshot: expect.objectContaining({ id: 'o1' }),
    });
  });

  it('audits saveProduct on success', async () => {
    const result = await adapter.saveProduct(sampleProduct);
    expect(result.ok).toBe(true);
    expect(logger.log).toHaveBeenCalledWith({
      action: 'save',
      collection: 'products',
      recordId: 'p1',
      snapshot: expect.objectContaining({ name: 'ויסקי ערבה' }),
    });
  });

  // ── Failed writes should NOT trigger audit ────────────────────────────────

  it('does not audit saveClient on failure', async () => {
    vi.mocked(inner.saveClient).mockResolvedValueOnce(err('Permission denied', 'VALIDATION_ERROR'));
    const result = await adapter.saveClient(sampleClient);
    expect(result.ok).toBe(false);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('does not audit deleteOrder on failure', async () => {
    vi.mocked(inner.deleteOrder).mockResolvedValueOnce(err('Not found', 'NOT_FOUND'));
    const result = await adapter.deleteOrder('o1');
    expect(result.ok).toBe(false);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('does not audit saveProduct on failure', async () => {
    vi.mocked(inner.saveProduct).mockResolvedValueOnce(err('Quota exceeded', 'QUOTA_EXCEEDED'));
    const result = await adapter.saveProduct(sampleProduct);
    expect(result.ok).toBe(false);
    expect(logger.log).not.toHaveBeenCalled();
  });

  // ── Return values should pass through unchanged ───────────────────────────

  it('returns the inner adapter result unchanged for writes', async () => {
    const result = await adapter.saveClient(sampleClient);
    expect(result).toEqual(ok(sampleClient));
  });

  it('returns the inner adapter error unchanged', async () => {
    const error = err('Permission denied', 'VALIDATION_ERROR');
    vi.mocked(inner.saveClient).mockResolvedValueOnce(error);
    const result = await adapter.saveClient(sampleClient);
    expect(result).toEqual(error);
  });

  // ── Schema operations should NOT trigger audit ────────────────────────────

  it('delegates setSchemaVersion without auditing', async () => {
    await adapter.setSchemaVersion('10');
    expect(inner.setSchemaVersion).toHaveBeenCalledWith('10');
    expect(logger.log).not.toHaveBeenCalled();
  });
});
