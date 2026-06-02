import { useState, useMemo, useCallback } from 'react';
import { useOrdersCtx } from '@/store/OrdersContext';
import { useClientsCtx } from '@/store/ClientsContext';
import { useProductsCtx } from '@/store/ProductsContext';
import {
  PAYMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
  AREA_LABELS,
} from '@/lib/constants';
import type { FilterChip } from '@/components/shared/ChipsBar';
import type { PaymentStatus, FulfillmentStatus, Area, Order } from '@/types/crm';

export interface OrderFilters {
  search: string;
  client: string | null;
  paymentStatus: PaymentStatus[];
  fulfillment: FulfillmentStatus[];
  area: Area[];
  products: string[];
  amount: [number | null, number | null];
  date: [string | null, string | null];
}

function emptyFilters(): OrderFilters {
  return {
    search: '', client: null, paymentStatus: [], fulfillment: [],
    area: [], products: [], amount: [null, null], date: [null, null],
  };
}

export interface UseOrderFiltersReturn {
  filters: OrderFilters;
  setFilter: <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void;
  reset: () => void;
  filtered: Order[];
  allCount: number;
  chips: FilterChip[];
  summary: { count: number; totalValue: number; outstanding: number };
}

export function useOrderFilters(): UseOrderFiltersReturn {
  const { orders } = useOrdersCtx();
  const { clients } = useClientsCtx();
  const { products } = useProductsCtx();

  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);

  const setFilter = useCallback(<K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, []);

  const reset = useCallback(() => setFilters(emptyFilters()), []);

  const clientAreaMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.area);
    return map;
  }, [clients]);

  const activeOrders = useMemo(() => orders.filter(o => !o.deletedAt), [orders]);

  const filtered = useMemo(() => {
    return activeOrders.filter(o => {
      const f = filters;
      if (f.search && !o.clientName.toLowerCase().includes(f.search.trim().toLowerCase())) return false;
      if (f.client && o.clientId !== f.client) return false;
      if (f.paymentStatus.length && !f.paymentStatus.includes(o.paymentStatus)) return false;
      if (f.fulfillment.length && !f.fulfillment.includes(o.fulfillmentStatus)) return false;
      if (f.area.length) {
        const area = clientAreaMap.get(o.clientId);
        if (!area || !f.area.includes(area as Area)) return false;
      }
      if (f.products.length && !o.items.some(it => f.products.includes(it.productId))) return false;
      const [mn, mx] = f.amount;
      if (mn != null && o.total < mn) return false;
      if (mx != null && o.total > mx) return false;
      const [from, to] = f.date;
      if (from && new Date(o.createdAt) < new Date(from)) return false;
      if (to && new Date(o.createdAt) > new Date(to + 'T23:59:59')) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeOrders, filters, clientAreaMap]);

  const chips = useMemo((): FilterChip[] => {
    const c: FilterChip[] = [];
    if (filters.search) c.push({ label: `חיפוש: ${filters.search}`, clear: () => setFilter('search', '') });
    if (filters.client) {
      const name = clients.find(cl => cl.id === filters.client)?.businessName ?? filters.client;
      c.push({ label: name, clear: () => setFilter('client', null) });
    }
    for (const s of filters.paymentStatus) {
      c.push({ label: PAYMENT_STATUS_LABELS[s], clear: () => setFilter('paymentStatus', filters.paymentStatus.filter(x => x !== s)) });
    }
    for (const s of filters.fulfillment) {
      c.push({ label: FULFILLMENT_STATUS_LABELS[s], clear: () => setFilter('fulfillment', filters.fulfillment.filter(x => x !== s)) });
    }
    for (const a of filters.area) {
      c.push({ label: AREA_LABELS[a], clear: () => setFilter('area', filters.area.filter(x => x !== a)) });
    }
    for (const p of filters.products) {
      const pr = products.find(x => x.id === p);
      if (pr) c.push({ label: pr.name, clear: () => setFilter('products', filters.products.filter(x => x !== p)) });
    }
    if (filters.amount[0] != null || filters.amount[1] != null) {
      c.push({ label: `סכום ${filters.amount[0] ?? 0}–${filters.amount[1] ?? '∞'}`, clear: () => setFilter('amount', [null, null]) });
    }
    if (filters.date[0] || filters.date[1]) {
      c.push({ label: 'טווח תאריכים', clear: () => setFilter('date', [null, null]) });
    }
    return c;
  }, [filters, clients, products, setFilter]);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((s, o) => s + o.total, 0);
    const outstanding = filtered.reduce((s, o) => s + (o.total - o.amountPaid), 0);
    return { count: filtered.length, totalValue, outstanding };
  }, [filtered]);

  return { filters, setFilter, reset, filtered, allCount: activeOrders.length, chips, summary };
}
