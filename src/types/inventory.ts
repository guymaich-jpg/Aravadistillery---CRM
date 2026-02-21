// Inventory types — new in v4, bridge between CRM sales and factory production

export type StockMovementType = 'inbound' | 'outbound' | 'adjustment' | 'sale';

export interface StockLevel {
  productId: string;
  currentStock: number;      // current bottle count
  minimumStock: number;      // alert threshold (0 = no alert)
  unit: string;              // inherited from product.unit
  lastUpdated: string;       // ISO timestamp
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;       // snapshot
  type: StockMovementType;
  quantity: number;          // always positive; direction determined by type
                             // inbound/adjustment+ = add; outbound/sale/adjustment- = subtract
  delta: number;             // signed: positive = stock increase, negative = decrease
  reference?: string;        // orderId for 'sale', batchNumber for 'inbound' from production
  notes?: string;
  createdAt: string;         // ISO timestamp
}

export interface InventoryBatch {
  id: string;
  productId: string;
  productName: string;       // snapshot
  batchNumber: string;       // e.g. "ARAQ-2026-001"
  quantity: number;          // bottles produced / received
  productionDate: string;    // ISO date
  expiryDate?: string;       // ISO date, optional
  notes?: string;
  createdAt: string;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  severity: 'warning' | 'critical'; // warning: stock > 0 but low; critical: stock === 0
}
