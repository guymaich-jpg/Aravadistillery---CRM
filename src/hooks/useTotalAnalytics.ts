// useTotalAnalytics — pure-computation hook for aggregate KPI analytics.
// All derived data is computed via useMemo; nothing is stored in state.
//
// SalesTimeSeries always covers the last 12 calendar months regardless of the
// selected period — it drives the bar chart that needs a full year view.
// KPISnapshot, CategorySales and PaymentStatusByMonth respect the period filter.

import { useMemo } from 'react';
import { useCRM } from '@/store/CRMContext';
import type {
  AnalyticsPeriod,
  CategorySales,
  KPISnapshot,
  PaymentStatusByMonth,
  SalesTimeSeries,
} from '@/types/analytics';
import type { ProductCategory } from '@/types/crm';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/constants';
import { formatMonthLabel, getPeriodBounds, toYearMonth } from '@/lib/date';

export interface UseTotalAnalyticsReturn {
  kpi: KPISnapshot;
  salesTimeSeries: SalesTimeSeries[];
  categorySales: CategorySales[];
  paymentStatusByMonth: PaymentStatusByMonth[];
}

export function useTotalAnalytics(
  period: AnalyticsPeriod = '30d',
): UseTotalAnalyticsReturn {
  const { orders, products } = useCRM();

  return useMemo<UseTotalAnalyticsReturn>(() => {
    // ── Period filter ─────────────────────────────────────────────────────────
    const { from, to } = getPeriodBounds(period);
    const fromTime = from.getTime();
    const toTime = to.getTime();

    // Active (non-deleted) orders only — all 12-month charts use this set
    const allActiveOrders = orders.filter(o => !o.deletedAt);

    // Orders within the selected period (for KPI and CategorySales)
    const periodOrders = allActiveOrders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromTime && t <= toTime;
    });

    // ── Previous period bounds for growth calculation ──────────────────────────
    const periodMs = toTime - fromTime;
    const prevFromTime = fromTime - periodMs;
    const prevOrders =
      period === 'all'
        ? [] // No meaningful previous period for 'all'
        : allActiveOrders.filter(o => {
            const t = new Date(o.createdAt).getTime();
            return t >= prevFromTime && t < fromTime;
          });

    // ── KPI Snapshot ──────────────────────────────────────────────────────────
    const totalRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = periodOrders.length;

    const outstandingBalance = periodOrders
      .filter(o => o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (o.total - o.amountPaid), 0);

    const activeClientIds = new Set(periodOrders.map(o => o.clientId));
    const activeClients = activeClientIds.size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    let revenueGrowth: number | undefined;
    let ordersGrowth: number | undefined;
    let clientsGrowth: number | undefined;

    if (period !== 'all') {
      const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);
      const prevOrderCount = prevOrders.length;
      const prevClientCount = new Set(prevOrders.map(o => o.clientId)).size;

      revenueGrowth =
        prevRevenue > 0 ? (totalRevenue - prevRevenue) / prevRevenue : undefined;
      ordersGrowth =
        prevOrderCount > 0
          ? (totalOrders - prevOrderCount) / prevOrderCount
          : undefined;
      clientsGrowth =
        prevClientCount > 0
          ? (activeClients - prevClientCount) / prevClientCount
          : undefined;
    }

    const kpi: KPISnapshot = {
      totalRevenue,
      outstandingBalance,
      totalOrders,
      activeClients,
      averageOrderValue,
      revenueGrowth,
      ordersGrowth,
      clientsGrowth,
    };

    // ── SalesTimeSeries — always last 12 months regardless of period ──────────
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return toYearMonth(d.toISOString());
    });

    const byMonth = new Map<string, SalesTimeSeries>();
    for (const ym of last12Months) {
      byMonth.set(ym, {
        month: ym,
        monthLabel: formatMonthLabel(ym),
        revenue: 0,
        paid: 0,
        outstanding: 0,
        orderCount: 0,
      });
    }

    for (const order of allActiveOrders) {
      const ym = toYearMonth(order.createdAt);
      if (byMonth.has(ym)) {
        const entry = byMonth.get(ym)!;
        entry.revenue += order.total;
        entry.orderCount += 1;
        if (order.paymentStatus === 'paid') {
          entry.paid += order.total;
        } else {
          entry.outstanding += order.total - order.amountPaid;
        }
      }
    }

    const salesTimeSeries = last12Months.map(ym => byMonth.get(ym)!);

    // ── CategorySales ─────────────────────────────────────────────────────────
    // Build a productId → category lookup from the live products list
    const productCategoryMap = new Map<string, ProductCategory>();
    for (const p of products) {
      productCategoryMap.set(p.id, p.category);
    }

    const revByCategory = new Map<ProductCategory, number>();
    let totalCategoryRev = 0;

    for (const order of periodOrders) {
      for (const item of order.items) {
        const category: ProductCategory =
          productCategoryMap.get(item.productId) ?? 'other';
        revByCategory.set(
          category,
          (revByCategory.get(category) ?? 0) + item.total,
        );
        totalCategoryRev += item.total;
      }
    }

    const categorySales: CategorySales[] = Array.from(revByCategory.entries())
      .map(([cat, revenue]) => ({
        category: cat,
        categoryLabel: PRODUCT_CATEGORY_LABELS[cat] ?? cat,
        revenue,
        percentage: totalCategoryRev > 0 ? (revenue / totalCategoryRev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── PaymentStatusByMonth ──────────────────────────────────────────────────
    const paymentByMonthMap = new Map<string, PaymentStatusByMonth>();
    for (const ym of last12Months) {
      paymentByMonthMap.set(ym, {
        month: ym,
        monthLabel: formatMonthLabel(ym),
        paid: 0,
        pending: 0,
        partial: 0,
      });
    }

    for (const order of allActiveOrders) {
      const ym = toYearMonth(order.createdAt);
      if (paymentByMonthMap.has(ym)) {
        const entry = paymentByMonthMap.get(ym)!;
        if (order.paymentStatus === 'paid') entry.paid += order.total;
        else if (order.paymentStatus === 'pending') entry.pending += order.total;
        else if (order.paymentStatus === 'partial') entry.partial += order.total;
      }
    }

    const paymentStatusByMonth = last12Months.map(ym => paymentByMonthMap.get(ym)!);

    return { kpi, salesTimeSeries, categorySales, paymentStatusByMonth };
  }, [orders, products, period]);
}
