// useOrders — order-domain hook built on top of OrdersContext.
// Adds local filtering state for payment status, fulfillment status, client id and search query.

import { useMemo, useState } from 'react';
import { useOrdersCtx } from '@/store/OrdersContext';
import type { Order, PaymentStatus, FulfillmentStatus } from '@/types/crm';

export type PaymentStatusFilter = PaymentStatus | 'all';
export type FulfillmentStatusFilter = FulfillmentStatus | 'all';

export interface UseOrdersReturn {
  /** All orders including soft-deleted ones */
  orders: Order[];
  /** Orders after applying all active filters (excludes soft-deleted) */
  filteredOrders: Order[];
  /** Non-deleted orders with fulfillmentStatus === 'pending' */
  pendingOrders: Order[];
  /** Add a new order (fulfillmentStatus defaults to 'pending', stock NOT deducted) */
  addOrder: (data: Omit<Order, 'id' | 'createdAt'>) => Promise<void>;
  /** Update an existing order's fields */
  updateOrder: (id: string, partial: Partial<Order>) => Promise<void>;
  /** Soft-delete an order */
  deleteOrder: (id: string) => Promise<void>;
  /** Mark order as shipped and deduct stock */
  shipOrder: (id: string) => Promise<void>;
  /** Payment status filter — 'all' or a specific status */
  paymentStatusFilter: PaymentStatusFilter;
  setPaymentStatusFilter: (f: PaymentStatusFilter) => void;
  /** Fulfillment status filter — 'all' or a specific status */
  fulfillmentStatusFilter: FulfillmentStatusFilter;
  setFulfillmentStatusFilter: (f: FulfillmentStatusFilter) => void;
  /** Filter to a single client id, or null for all clients */
  clientIdFilter: string | null;
  setClientIdFilter: (id: string | null) => void;
  /** Search against clientName */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export function useOrders(): UseOrdersReturn {
  const { orders, addOrder, updateOrder, deleteOrder, shipOrder } = useOrdersCtx();

  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<FulfillmentStatusFilter>('all');
  const [clientIdFilter, setClientIdFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo<Order[]>(() => {
    // Exclude soft-deleted orders from the visible list
    let result = orders.filter(o => !o.deletedAt);

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      result = result.filter(o => o.paymentStatus === paymentStatusFilter);
    }

    // Apply fulfillment status filter
    if (fulfillmentStatusFilter !== 'all') {
      result = result.filter(o => o.fulfillmentStatus === fulfillmentStatusFilter);
    }

    // Apply client id filter
    if (clientIdFilter !== null) {
      result = result.filter(o => o.clientId === clientIdFilter);
    }

    // Apply search query against client name
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(o => o.clientName.toLowerCase().includes(q));
    }

    // Most recent first
    result = [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return result;
  }, [orders, paymentStatusFilter, fulfillmentStatusFilter, clientIdFilter, searchQuery]);

  const pendingOrders = useMemo<Order[]>(
    () => orders.filter(o => !o.deletedAt && o.fulfillmentStatus === 'pending'),
    [orders],
  );

  return {
    orders,
    filteredOrders,
    pendingOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    shipOrder,
    paymentStatusFilter,
    setPaymentStatusFilter,
    fulfillmentStatusFilter,
    setFulfillmentStatusFilter,
    clientIdFilter,
    setClientIdFilter,
    searchQuery,
    setSearchQuery,
  };
}
