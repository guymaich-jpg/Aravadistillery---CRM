// StockContext — read-only inventory state powered by real-time Firestore listener.
// Stock levels are written by the factory control app; the CRM only reads them.
// Stock movements are fetched once on mount (CRM-side audit trail from order shipments).

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { StockLevel, StockMovement } from '@/types/inventory';
import { storageAdapter } from '@/lib/storage';
import { hasFirebaseConfig } from '@/lib/firebase/config';
import { subscribeToStockLevels } from '@/lib/storage/firestore.listener';

// ── Context shape ────────────────────────────────────────────────────────────

export interface StockCtxValue {
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  isLoading: boolean;
  isRefreshing: boolean;
  storageError: string | null;
  /** Force a one-time re-fetch from the database. The real-time listener continues in background. */
  refresh: () => Promise<void>;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Real-time listener for stock levels (Firestore) or one-time fetch (localStorage)
  useEffect(() => {
    let cancelled = false;

    if (hasFirebaseConfig()) {
      // Firestore: subscribe to real-time updates from factory control app.
      // If the listener exhausts retries (e.g. permission error), fall back to
      // a one-time getDocs read so the user still sees data.
      let listenerFailed = false;
      const unsubscribe = subscribeToStockLevels({
        onData: (levels) => {
          if (cancelled) return;
          setStockLevels(levels);
          setIsLoading(false);
          if (levels.length === 0 && !listenerFailed) {
            // Listener returned empty — try a one-time read as fallback
            storageAdapter.getStockLevels().then(result => {
              if (!cancelled && result.ok && result.data.length > 0) {
                console.info('[StockContext] onSnapshot empty, getDocs fallback returned', result.data.length, 'levels');
                setStockLevels(result.data);
              }
            }).catch(() => {});
          }
        },
        onError: (error) => {
          if (cancelled) return;
          listenerFailed = true;
          setStorageError(error);
          setIsLoading(false);
          // Listener errored — try one-time read as fallback
          storageAdapter.getStockLevels().then(result => {
            if (!cancelled && result.ok && result.data.length > 0) {
              console.info('[StockContext] listener failed, getDocs fallback returned', result.data.length, 'levels');
              setStockLevels(result.data);
              setStorageError(null);
            }
          }).catch(() => {});
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

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await storageAdapter.getStockLevels();
      if (result.ok) setStockLevels(result.data);
      else setStorageError(result.error);
    } catch (e) {
      setStorageError(e instanceof Error ? e.message : 'שגיאה ברענון מלאי');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Re-fetch stock when tab becomes visible after being backgrounded.
  // Firebase Auth tokens expire after 1h; a tab idle for 25h may have a stale
  // token, causing the onSnapshot listener to silently stop receiving updates.
  // This ensures inventory is always current when the user returns.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !isLoading) {
        refresh();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh, isLoading]);

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
    stockLevels, stockMovements, isLoading, isRefreshing, storageError, refresh,
  }), [stockLevels, stockMovements, isLoading, isRefreshing, storageError, refresh]);

  return <StockCtx.Provider value={value}>{children}</StockCtx.Provider>;
}
