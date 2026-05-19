import type { Client, Product, Order } from '@/types/crm';
import type { StockLevel, StockMovement, InventoryBatch } from '@/types/inventory';
import type { StorageAdapter, StorageResult, ExportPayload } from './adapter';
import type { AuditLogger } from '../audit';

export class AuditedStorageAdapter implements StorageAdapter {
  constructor(
    private inner: StorageAdapter,
    private logger: AuditLogger,
  ) {}

  private audit(action: 'save' | 'delete', collection: string, recordId: string, snapshot: Record<string, unknown>): void {
    this.logger.log({ action, collection, recordId, snapshot });
  }

  // ── Delegated reads (no auditing) ──────────────────────────────────────────

  isAvailable(): Promise<boolean> {
    return this.inner.isAvailable();
  }

  getClients(): Promise<StorageResult<Client[]>> {
    return this.inner.getClients();
  }

  getOrders(): Promise<StorageResult<Order[]>> {
    return this.inner.getOrders();
  }

  getProducts(): Promise<StorageResult<Product[]>> {
    return this.inner.getProducts();
  }

  getStockLevels(): Promise<StorageResult<StockLevel[]>> {
    return this.inner.getStockLevels();
  }

  getStockMovements(productId?: string): Promise<StorageResult<StockMovement[]>> {
    return this.inner.getStockMovements(productId);
  }

  getInventoryBatches(): Promise<StorageResult<InventoryBatch[]>> {
    return this.inner.getInventoryBatches();
  }

  getSchemaVersion(): Promise<StorageResult<string>> {
    return this.inner.getSchemaVersion();
  }

  exportAll(): Promise<StorageResult<ExportPayload>> {
    return this.inner.exportAll();
  }

  // ── Delegated writes (no auditing) — infrastructure only ───────────────────

  setSchemaVersion(version: string): Promise<StorageResult<void>> {
    return this.inner.setSchemaVersion(version);
  }

  // ── Audited writes ─────────────────────────────────────────────────────────

  async saveClient(client: Client): Promise<StorageResult<Client>> {
    const result = await this.inner.saveClient(client);
    if (result.ok) this.audit('save', 'clients', client.id, client as unknown as Record<string, unknown>);
    return result;
  }

  async deleteClient(id: string): Promise<StorageResult<void>> {
    const result = await this.inner.deleteClient(id);
    if (result.ok) this.audit('delete', 'clients', id, { id, deletedAt: new Date().toISOString() });
    return result;
  }

  async saveOrder(order: Order): Promise<StorageResult<Order>> {
    const result = await this.inner.saveOrder(order);
    if (result.ok) this.audit('save', 'orders', order.id, order as unknown as Record<string, unknown>);
    return result;
  }

  async deleteOrder(id: string): Promise<StorageResult<void>> {
    const result = await this.inner.deleteOrder(id);
    if (result.ok) this.audit('delete', 'orders', id, { id, deletedAt: new Date().toISOString() });
    return result;
  }

  async saveProduct(product: Product): Promise<StorageResult<Product>> {
    const result = await this.inner.saveProduct(product);
    if (result.ok) this.audit('save', 'products', product.id, product as unknown as Record<string, unknown>);
    return result;
  }

  async saveStockLevel(level: StockLevel): Promise<StorageResult<StockLevel>> {
    const result = await this.inner.saveStockLevel(level);
    if (result.ok) this.audit('save', 'stockLevels', level.productId, level as unknown as Record<string, unknown>);
    return result;
  }

  async saveStockMovement(movement: StockMovement): Promise<StorageResult<StockMovement>> {
    const result = await this.inner.saveStockMovement(movement);
    if (result.ok) this.audit('save', 'stockMovements', movement.id, movement as unknown as Record<string, unknown>);
    return result;
  }

  async saveInventoryBatch(batch: InventoryBatch): Promise<StorageResult<InventoryBatch>> {
    const result = await this.inner.saveInventoryBatch(batch);
    if (result.ok) this.audit('save', 'inventoryBatches', batch.id, batch as unknown as Record<string, unknown>);
    return result;
  }
}
