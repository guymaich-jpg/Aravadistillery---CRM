// StockContext — isolated state for stockLevels + stockMovements.
// Exposes adjustStock (single) and adjustStockBatch (bulk, N+1-free).

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { StockLevel, StockMovement, StockMovementType } from '@/types/inventory';
import type { StorageResult } from '@/lib/storage/adapter';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/lib/id';

// ── Context shape ────────────────────────────────────────────────────────────

export interface StockAdjustment {
  productId: string;
  productName: string;
  delta: number;
  type: StockMovementType;
  notes?: string;
  reference?: string;
  unit?: string;
}

export interface StockCtxValue {
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  isLoading: boolean;
  storageError: string | null;
  /** Single stock adjustment (creates movement + updates level). */
  adjustStock(
    productId: string,
    delta: number,
    type: StockMovementType,
    productName: string,
    notes?: string,
    reference?: string,
    unit?: string,
  ): Promise<void>;
  /** Batch stock adjustment — fetches stock levels once (N+1 fix for addOrder). */
  adjustStockBatch(adjustments: StockAdjustment[]): Promise<void>;
}

const StockCtx = createContext<StockCtxValue | null>(null);

export function useStockCtx(): StockCtxValue {
  const ctx = useContext(StockCtx);
  if (!ctx) throw new Error('useStockCtx must be used inside StockProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function StockProvider({ children }: { children: React.ReactNode }) {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  function unwrap<T>(result: StorageResult<T>): T | undefined {
    if (result.ok) return result.data;
    setStorageError(result.error);
    return undefined;
  }

  const reloadStock = useCallback(async () => {
    const [levelsResult, movementsResult] = await Promise.all([
      storageAdapter.getStockLevels(),
      storageAdapter.getStockMovements(),
    ]);
    if (levelsResult.ok) setStockLevels(levelsResult.data);
    if (movementsResult.ok) setStockMovements(movementsResult.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reloadStock();
      } catch (e) {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : 'שגיאה בטעינת מלאי');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadStock]);

  const adjustStock = useCallback(
    async (
      productId: string,
      delta: number,
      type: StockMovementType,
      productName: string,
      notes?: string,
      reference?: string,
      unit?: string,
    ) => {
      const movement: StockMovement = {
        id: generateId(),
        productId,
        productName,
        type,
        quantity: Math.abs(delta),
        delta,
        notes,
        reference,
        createdAt: new Date().toISOString(),
      };

      if (!unwrap(await storageAdapter.saveStockMovement(movement))) return;

      // Fetch current levels and update
      const levelResult = await storageAdapter.getStockLevels();
      if (levelResult.ok) {
        const existing = levelResult.data.find(l => l.productId === productId);
        if (existing) {
          const updatedLevel: StockLevel = {
            ...existing,
            currentStock: Math.max(0, existing.currentStock + delta),
            lastUpdated: new Date().toISOString(),
          };
          await storageAdapter.saveStockLevel(updatedLevel);
        } else {
          const newLevel: StockLevel = {
            productId,
            currentStock: Math.max(0, delta),
            minimumStock: 0,
            unit: unit ?? 'יחידה',
            lastUpdated: new Date().toISOString(),
          };
          await storageAdapter.saveStockLevel(newLevel);
        }
      }

      await reloadStock();
    },
    [reloadStock],
  );

  const adjustStockBatch = useCallback(
    async (adjustments: StockAdjustment[]) => {
      if (adjustments.length === 0) return;

      // Fetch stock levels ONCE before the loop (N+1 fix)
      const levelResult = await storageAdapter.getStockLevels();
      const levelMap = new Map(
        levelResult.ok ? levelResult.data.map(l => [l.productId, l]) : [],
      );

      for (const adj of adjustments) {
        const movement: StockMovement = {
          id: generateId(),
          productId: adj.productId,
          productName: adj.productName,
          type: adj.type,
          quantity: Math.abs(adj.delta),
          delta: adj.delta,
          notes: adj.notes,
          reference: adj.reference,
          createdAt: new Date().toISOString(),
        };

        // Continue processing remaining items even if one fails
        unwrap(await storageAdapter.saveStockMovement(movement));

        const existing = levelMap.get(adj.productId);
        if (existing) {
          const updatedLevel: StockLevel = {
            ...existing,
            currentStock: Math.max(0, existing.currentStock + adj.delta),
            lastUpdated: new Date().toISOString(),
          };
          await storageAdapter.saveStockLevel(updatedLevel);
          // Update map for subsequent items with the same product
          levelMap.set(adj.productId, updatedLevel);
        }
      }

      await reloadStock();
    },
    [reloadStock],
  );

  const value: StockCtxValue = {
    stockLevels, stockMovements, isLoading, storageError,
    adjustStock, adjustStockBatch,
  };

  return <StockCtx.Provider value={value}>{children}</StockCtx.Provider>;
}
