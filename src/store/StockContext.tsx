// StockContext — read-only inventory state powered by real-time Firestore listener.
// Stock levels are written by the factory control app; the CRM only reads them.
// Stock movements are fetched once on mount (CRM-side audit trail from order shipments).

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { StockLevel, StockMovement } from '@/types/inventory';
import { storageAdapter } from '@/lib/storage';
import { hasFirebaseConfig } from '@/lib/firebase/config';
import { subscribeToStockLevels } from '@/lib/storage/firestore.listener';

// ── Context shape ────────────────────────────────────────────────────────────

export interface StockCtxValue {
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  isLoading: boolean;
  storageError: string | null;
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

  // Real-time listener for stock levels (Firestore) or one-time fetch (localStorage)
  useEffect(() => {
    let cancelled = false;

    if (hasFirebaseConfig()) {
      // Firestore: subscribe to real-time updates from factory control app
      const unsubscribe = subscribeToStockLevels({
        onData: (levels) => {
          if (!cancelled) {
            setStockLevels(levels);
            setIsLoading(false);
          }
        },
        onError: (error) => {
          if (!cancelled) {
            setStorageError(error);
            setIsLoading(false);
          }
        },
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    } else {
      // localStorage fallback: fetch once on mount
      (async () => {
        try {
          const result = await storageAdapter.getStockLevels();
          if (!cancelled && result.ok) setStockLevels(result.data);
        } catch (e) {
          if (!cancelled) setStorageError(e instanceof Error ? e.message : 'שגיאה בטעינת מלאי');
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }
  }, []);

  // One-time fetch for stock movements (CRM audit trail)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await storageAdapter.getStockMovements();
        if (!cancelled && result.ok) setStockMovements(result.data);
      } catch {
        // Movements are informational — swallow errors silently
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<StockCtxValue>(() => ({
    stockLevels, stockMovements, isLoading, storageError,
  }), [stockLevels, stockMovements, isLoading, storageError]);

  return <StockCtx.Provider value={value}>{children}</StockCtx.Provider>;
}
