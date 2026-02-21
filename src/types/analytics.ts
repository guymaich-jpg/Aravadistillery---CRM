// Analytics types — computed from raw CRM data, never stored separately

export type AnalyticsPeriod = '30d' | '90d' | 'year' | 'all';

export interface KPISnapshot {
  totalRevenue: number;          // sum of all order totals in period
  outstandingBalance: number;    // sum of (order.total - order.amountPaid) for non-paid
  totalOrders: number;           // order count in period
  activeClients: number;         // clients with at least 1 order in period
  averageOrderValue: number;     // totalRevenue / totalOrders
  // Period-over-period deltas (as decimal, e.g. 0.15 = +15%)
  revenueGrowth?: number;
  ordersGrowth?: number;
  clientsGrowth?: number;
}

export interface SalesTimeSeries {
  month: string;             // "YYYY-MM" format
  monthLabel: string;        // Hebrew month abbreviation e.g. "ינו׳"
  revenue: number;           // total revenue for month
  paid: number;              // revenue from paid orders
  outstanding: number;       // revenue from pending + partial
  orderCount: number;
}

export interface ClientRankRow {
  rank: number;
  clientId: string;
  clientName: string;
  totalRevenue: number;
  orderCount: number;
  lastOrderDate: string | null;
  outstandingBalance: number;
  status: 'active' | 'inactive' | 'prospect';
}

export interface CategorySales {
  category: string;
  categoryLabel: string;     // Hebrew label
  revenue: number;
  percentage: number;        // percentage of total revenue
}

export interface PaymentStatusByMonth {
  month: string;             // "YYYY-MM"
  monthLabel: string;        // Hebrew
  paid: number;
  pending: number;
  partial: number;
}
