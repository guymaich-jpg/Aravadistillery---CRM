// InventoryBatchContext — isolated state for inventory batches.
// addInventoryBatch also adjusts stock via StockContext
// (must be nested inside StockProvider).

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { InventoryBatch } from '@/types/inventory';
import type { StorageResult } from '@/lib/storage/adapter';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/lib/id';
import { useStockCtx } from './StockContext';

// ── Context shape ────────────────────────────────────────────────────────────

export interface BatchCtxValue {
  inventoryBatches: InventoryBatch[];
  isLoading: boolean;
  storageError: string | null;
  addInventoryBatch(data: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<void>;
}

const BatchCtx = createContext<BatchCtxValue | null>(null);

export function useBatchCtx(): BatchCtxValue {
  const ctx = useContext(BatchCtx);
  if (!ctx) throw new Error('useBatchCtx must be used inside InventoryBatchProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function InventoryBatchProvider({ children }: { children: React.ReactNode }) {
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const { adjustStock } = useStockCtx();

  function unwrap<T>(result: StorageResult<T>): T {
    if (result.ok) return result.data;
    setStorageError(result.error);
    throw new Error(result.error);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await storageAdapter.getInventoryBatches();
        if (cancelled) return;
        if (result.ok) setInventoryBatches(result.data);
        else setStorageError(result.error);
      } catch (e) {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : 'שגיאה בטעינת אצוות');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addInventoryBatch = useCallback(
    async (data: Omit<InventoryBatch, 'id' | 'createdAt'>) => {
      const batch: InventoryBatch = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      unwrap(await storageAdapter.saveInventoryBatch(batch));
      setInventoryBatches(prev => [...prev, batch]);

      // Inbound batch increases stock
      await adjustStock(
        data.productId,
        data.quantity,
        'inbound',
        data.productName,
        data.notes,
        data.batchNumber,
      );
    },
    [adjustStock],
  );

  const value = useMemo<BatchCtxValue>(() => ({
    inventoryBatches, isLoading, storageError,
    addInventoryBatch,
  }), [inventoryBatches, isLoading, storageError, addInventoryBatch]);

  return <BatchCtx.Provider value={value}>{children}</BatchCtx.Provider>;
}
