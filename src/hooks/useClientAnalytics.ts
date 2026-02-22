// useClientAnalytics — pure-computation hook.
// Derives per-client sales analytics from the raw orders array.
// All heavy work is wrapped in useMemo so it only recomputes when orders change.

import { useMemo } from 'react';
import { useCRM } from '@/store/CRMContext';
import type { ClientRankRow } from '@/types/analytics';

export function useClientAnalytics(): ClientRankRow[] {
  const { clients, orders } = useCRM();

  const rows = useMemo<ClientRankRow[]>(() => {
    // Aggregate order data per client
    // Include ALL orders (even soft-deleted) to keep financial totals accurate,
    // but use only non-deleted orders for active metrics when needed.
    const map = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        totalRevenue: number;
        orderCount: number;
        outstandingBalance: number;
        lastOrderDate: string | null;
      }
    >();

    for (const order of orders) {
      if (!map.has(order.clientId)) {
        map.set(order.clientId, {
          clientId: order.clientId,
          clientName: order.clientName,
          totalRevenue: 0,
          orderCount: 0,
          outstandingBalance: 0,
          lastOrderDate: null,
        });
      }

      const entry = map.get(order.clientId)!;
      entry.totalRevenue += order.total;
      entry.orderCount += 1;

      // Outstanding balance: unpaid remainder for non-fully-paid orders
      if (order.paymentStatus !== 'paid') {
        entry.outstandingBalance += order.total - order.amountPaid;
      }

      // Track most recent order date
      if (
        entry.lastOrderDate === null ||
        order.createdAt > entry.lastOrderDate
      ) {
        entry.lastOrderDate = order.createdAt;
      }
    }

    // Build ranked rows, sorted by totalRevenue descending
    const sorted = Array.from(map.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    const clientMap = new Map(clients.map(c => [c.id, c]));

    return sorted.map((entry, idx) => {
      const status = clientMap.get(entry.clientId)?.status ?? 'inactive';

      return {
        rank: idx + 1,
        clientId: entry.clientId,
        clientName: entry.clientName,
        totalRevenue: entry.totalRevenue,
        orderCount: entry.orderCount,
        lastOrderDate: entry.lastOrderDate,
        outstandingBalance: entry.outstandingBalance,
        status,
      } satisfies ClientRankRow;
    });
  }, [orders, clients]);

  return rows;
}
