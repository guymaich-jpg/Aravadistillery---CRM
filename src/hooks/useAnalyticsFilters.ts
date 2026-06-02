import { useState, useMemo, useCallback } from 'react';
import { useOrdersCtx } from '@/store/OrdersContext';
import { useClientsCtx } from '@/store/ClientsContext';
import { useProductsCtx } from '@/store/ProductsContext';
import { AREA_LABELS, PRODUCT_CATEGORY_LABELS } from '@/lib/constants';
import { getPeriodBounds, formatMonthLabel, toYearMonth } from '@/lib/date';
import type { FilterChip } from '@/components/shared/ChipsBar';
import type { AnalyticsPeriod, SalesTimeSeries, CategorySales, ClientRankRow } from '@/types/analytics';
import type { Area, ProductCategory } from '@/types/crm';

export interface AnalyticsFilters {
  client: string | null;
  products: string[];
  area: Area[];
  period: AnalyticsPeriod;
}

function emptyFilters(): AnalyticsFilters {
  return { client: null, products: [], area: [], period: '30d' };
}

export interface ProductMixRow {
  id: string;
  name: string;
  category: string;
  revenue: number;
  qty: number;
  orders: number;
}

export function useAnalyticsFilters() {
  const { orders } = useOrdersCtx();
  const { clients } = useClientsCtx();
  const { products } = useProductsCtx();

  const [filters, setFilters] = useState<AnalyticsFilters>(emptyFilters);

  const setFilter = useCallback(<K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, []);

  const reset = useCallback(() => setFilters(f => ({ ...emptyFilters(), period: f.period })), []);

  const clientInfoMap = useMemo(() => {
    const map = new Map<string, { area: string; status: string }>();
    for (const c of clients) map.set(c.id, { area: c.area, status: c.status });
    return map;
  }, [clients]);

  const activeOrders = useMemo(() => orders.filter(o => !o.deletedAt), [orders]);

  const productCategoryMap = useMemo(() => {
    const map = new Map<string, ProductCategory>();
    for (const p of products) map.set(p.id, p.category);
    return map;
  }, [products]);

  const data = useMemo(() => {
    const { from, to } = getPeriodBounds(filters.period);
    const fromTime = from.getTime();
    const toTime = to.getTime();

    const periodOrders = activeOrders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });

    const filtered = periodOrders.filter(o => {
      if (filters.client && o.clientId !== filters.client) return false;
      if (filters.area.length) {
        const area = clientInfoMap.get(o.clientId)?.area;
        if (!area || !filters.area.includes(area as Area)) return false;
      }
      if (filters.products.length && !o.items.some(it => filters.products.includes(it.productId))) return false;
      return true;
    });

    const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
    const outstanding = filtered.reduce((s, o) => s + (o.total - o.amountPaid), 0);
    const clientSet = new Set(filtered.map(o => o.clientId));

    const monthBuckets = new Map<string, SalesTimeSeries>();
    for (const o of filtered) {
      const ym = toYearMonth(o.createdAt);
      if (!monthBuckets.has(ym)) {
        monthBuckets.set(ym, { month: ym, monthLabel: formatMonthLabel(ym), revenue: 0, paid: 0, outstanding: 0, orderCount: 0 });
      }
      const e = monthBuckets.get(ym)!;
      e.revenue += o.total;
      e.orderCount += 1;
      e.paid += o.amountPaid;
      e.outstanding += (o.total - o.amountPaid);
    }
    const byMonth = Array.from(monthBuckets.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    const clientAgg = new Map<string, { clientId: string; clientName: string; totalRevenue: number; orderCount: number; outstandingBalance: number; lastOrderDate: string | null }>();
    for (const o of filtered) {
      if (!clientAgg.has(o.clientId)) {
        clientAgg.set(o.clientId, { clientId: o.clientId, clientName: o.clientName, totalRevenue: 0, orderCount: 0, outstandingBalance: 0, lastOrderDate: null });
      }
      const c = clientAgg.get(o.clientId)!;
      c.totalRevenue += o.total;
      c.orderCount += 1;
      if (o.paymentStatus !== 'paid') c.outstandingBalance += (o.total - o.amountPaid);
      if (!c.lastOrderDate || o.createdAt > c.lastOrderDate) c.lastOrderDate = o.createdAt;
    }
    const topClients: ClientRankRow[] = Array.from(clientAgg.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map((c, i) => ({
        rank: i + 1,
        ...c,
        status: (clientInfoMap.get(c.clientId)?.status ?? 'inactive') as ClientRankRow['status'],
      }));

    const catAgg = new Map<ProductCategory, number>();
    let totalCatRev = 0;
    for (const o of filtered) {
      for (const it of o.items) {
        if (filters.products.length && !filters.products.includes(it.productId)) continue;
        const cat = productCategoryMap.get(it.productId) ?? ('other' as ProductCategory);
        catAgg.set(cat, (catAgg.get(cat) ?? 0) + it.total);
        totalCatRev += it.total;
      }
    }
    const categorySales: CategorySales[] = Array.from(catAgg.entries())
      .map(([cat, revenue]) => ({
        category: cat,
        categoryLabel: PRODUCT_CATEGORY_LABELS[cat] ?? cat,
        revenue,
        percentage: totalCatRev > 0 ? (revenue / totalCatRev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const prodAgg = new Map<string, ProductMixRow>();
    for (const o of filtered) {
      for (const it of o.items) {
        if (filters.products.length && !filters.products.includes(it.productId)) continue;
        if (!prodAgg.has(it.productId)) {
          prodAgg.set(it.productId, { id: it.productId, name: it.productName, category: productCategoryMap.get(it.productId) ?? 'other', revenue: 0, qty: 0, orders: 0 });
        }
        const p = prodAgg.get(it.productId)!;
        p.revenue += it.total;
        p.qty += it.quantity;
        p.orders += 1;
      }
    }
    const productMix = Array.from(prodAgg.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      filteredOrders: filtered,
      totalRevenue,
      outstanding,
      orderCount: filtered.length,
      activeClients: clientSet.size,
      byMonth,
      topClients,
      categorySales,
      productMix,
    };
  }, [activeOrders, filters, clientInfoMap, productCategoryMap]);

  const chips = useMemo((): FilterChip[] => {
    const c: FilterChip[] = [];
    if (filters.client) {
      const name = clients.find(cl => cl.id === filters.client)?.businessName ?? filters.client;
      c.push({ label: name, clear: () => setFilter('client', null) });
    }
    for (const a of filters.area) {
      c.push({ label: AREA_LABELS[a], clear: () => setFilter('area', filters.area.filter(x => x !== a)) });
    }
    for (const p of filters.products) {
      const pr = products.find(x => x.id === p);
      if (pr) c.push({ label: pr.name, clear: () => setFilter('products', filters.products.filter(x => x !== p)) });
    }
    return c;
  }, [filters, clients, products, setFilter]);

  return { filters, setFilter, reset, chips, data };
}
