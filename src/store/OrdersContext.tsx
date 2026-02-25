// OrdersContext — isolated state + CRUD for the orders collection.
// shipOrder deducts stock via StockContext.adjustStockBatch when fulfillment transitions to 'shipped'.
// (must be nested inside StockProvider).

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Order } from '@/types/crm';
import type { StorageResult } from '@/lib/storage/adapter';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/lib/id';
import { useStockCtx } from './StockContext';

// ── Context shape ────────────────────────────────────────────────────────────

export interface OrdersCtxValue {
  orders: Order[];
  isLoading: boolean;
  storageError: string | null;
  addOrder(data: Omit<Order, 'id' | 'createdAt'>): Promise<void>;
  updateOrder(id: string, partial: Partial<Order>): Promise<void>;
  deleteOrder(id: string): Promise<void>;
  shipOrder(id: string): Promise<void>;
}

const OrdersCtx = createContext<OrdersCtxValue | null>(null);

export function useOrdersCtx(): OrdersCtxValue {
  const ctx = useContext(OrdersCtx);
  if (!ctx) throw new Error('useOrdersCtx must be used inside OrdersProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const { adjustStockBatch } = useStockCtx();

  function unwrap<T>(result: StorageResult<T>): T {
    if (result.ok) return result.data;
    setStorageError(result.error);
    throw new Error(result.error);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await storageAdapter.getOrders();
        if (cancelled) return;
        if (result.ok) setOrders(result.data);
        else setStorageError(result.error);
      } catch (e) {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : 'שגיאה בטעינת הזמנות');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addOrder = useCallback(
    async (data: Omit<Order, 'id' | 'createdAt'>) => {
      const order: Order = {
        ...data,
        fulfillmentStatus: 'pending',
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      unwrap(await storageAdapter.saveOrder(order));
      setOrders(prev => [...prev, order]);
      // Stock is NOT deducted here — only when shipOrder() is called
    },
    [],
  );

  const shipOrder = useCallback(
    async (id: string) => {
      const found = ordersRef.current.find(o => o.id === id);
      if (!found || found.fulfillmentStatus === 'shipped') return;

      const updated: Order = {
        ...found,
        fulfillmentStatus: 'shipped',
        updatedAt: new Date().toISOString(),
      };
      unwrap(await storageAdapter.saveOrder(updated));
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));

      // Deduct stock now that the order is shipped
      const adjustments = found.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        delta: -item.quantity,
        type: 'sale' as const,
        reference: found.id,
      }));
      await adjustStockBatch(adjustments);
    },
    [adjustStockBatch],
  );

  const updateOrder = useCallback(
    async (id: string, partial: Partial<Order>) => {
      const found = ordersRef.current.find(o => o.id === id);
      if (!found) return;
      const updated: Order = { ...found, ...partial, updatedAt: new Date().toISOString() };
      unwrap(await storageAdapter.saveOrder(updated));
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
    },
    [],
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      unwrap(await storageAdapter.deleteOrder(id));
      setOrders(prev =>
        prev.map(o => (o.id === id ? { ...o, deletedAt: new Date().toISOString() } : o)),
      );
    },
    [],
  );

  const value = useMemo<OrdersCtxValue>(() => ({
    orders, isLoading, storageError,
    addOrder, updateOrder, deleteOrder, shipOrder,
  }), [orders, isLoading, storageError, addOrder, updateOrder, deleteOrder, shipOrder]);

  return <OrdersCtx.Provider value={value}>{children}</OrdersCtx.Provider>;
}
