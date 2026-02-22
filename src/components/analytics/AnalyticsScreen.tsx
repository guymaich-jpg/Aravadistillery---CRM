import { useState, useMemo } from 'react';
import { useTotalAnalytics } from '@/hooks/useTotalAnalytics';
import { useClientAnalytics } from '@/hooks/useClientAnalytics';
import { KPICard } from './KPICard';
import { SalesBarChart } from './SalesBarChart';
import { TopClientsChart } from './TopClientsChart';
import { ProductMixPieChart } from './ProductMixPieChart';
import { PaymentStatusChart } from './PaymentStatusChart';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import type { AnalyticsPeriod } from '@/types/analytics';
import type { ClientRankRow } from '@/types/analytics';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '30d',  label: '30 ימים אחרונים' },
  { value: '90d',  label: '90 ימים אחרונים' },
  { value: 'year', label: 'השנה' },
  { value: 'all',  label: 'כל הזמן' },
];

type SortKey = keyof Pick<ClientRankRow, 'rank' | 'totalRevenue' | 'orderCount' | 'outstandingBalance'>;

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortAsc, setSortAsc] = useState(false);

  const { kpi, salesTimeSeries, categorySales, paymentStatusByMonth } = useTotalAnalytics(period);
  const clientRankings = useClientAnalytics();

  const sortedRankings = useMemo(
    () => [...clientRankings].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortAsc ? diff : -diff;
    }),
    [clientRankings, sortKey, sortAsc],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortTh({ label, colKey }: { label: string; colKey: SortKey }) {
    const active = sortKey === colKey;
    return (
      <th
        className="px-3 py-3 text-xs font-semibold text-[#716a56] cursor-pointer select-none whitespace-nowrap hover:text-[#252525]"
        onClick={() => toggleSort(colKey)}
      >
        {label}{active ? (sortAsc ? ' ▲' : ' ▼') : ''}
      </th>
    );
  }

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-6">

      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#252525]">סיכום עסקי</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-[#252525] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          label="סה״כ הכנסות"
          value={formatCurrency(kpi.totalRevenue)}
          growth={kpi.revenueGrowth}
        />
        <KPICard
          label="יתרות לגבייה"
          value={formatCurrency(kpi.outstandingBalance)}
          variant={kpi.outstandingBalance > 0 ? 'warning' : 'default'}
        />
        <KPICard
          label="הזמנות"
          value={String(kpi.totalOrders)}
          subValue={kpi.averageOrderValue > 0 ? `ממוצע ${formatCurrency(kpi.averageOrderValue)}` : undefined}
          growth={kpi.ordersGrowth}
        />
        <KPICard
          label="לקוחות פעילים"
          value={String(kpi.activeClients)}
          growth={kpi.clientsGrowth}
        />
      </div>

      {/* Charts — 2×2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesBarChart data={salesTimeSeries} />
        <TopClientsChart data={clientRankings} />
        <ProductMixPieChart data={categorySales} />
        <PaymentStatusChart data={paymentStatusByMonth} />
      </div>

      {/* Client Rankings Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[#252525]">דירוג לקוחות</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-center">
                <th className="px-4 py-3 text-xs font-semibold text-[#716a56] text-right w-10">#</th>
                <th className="px-3 py-3 text-xs font-semibold text-[#716a56] text-right">שם לקוח</th>
                <th className="px-3 py-3 text-xs font-semibold text-[#716a56] text-center">סטטוס</th>
                <SortTh label="הכנסה" colKey="totalRevenue" />
                <SortTh label="הזמנות" colKey="orderCount" />
                <th className="px-3 py-3 text-xs font-semibold text-[#716a56]">הזמנה אחרונה</th>
                <SortTh label="יתרה" colKey="outstandingBalance" />
              </tr>
            </thead>
            <tbody>
              {sortedRankings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-[#716a56]">
                    אין נתוני לקוחות להציג
                  </td>
                </tr>
              ) : (
                sortedRankings.map((row, idx) => (
                  <tr
                    key={row.clientId}
                    className="border-b border-gray-50 last:border-0 hover:bg-[#efefec]/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[#716a56]">{idx + 1}</td>
                    <td className="px-3 py-3 font-semibold text-[#252525]">{row.clientName}</td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge
                        label={CLIENT_STATUS_LABELS[row.status]}
                        colorClass={CLIENT_STATUS_COLORS[row.status]}
                      />
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-amber-700">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                    <td className="px-3 py-3 text-center text-[#252525]">{row.orderCount}</td>
                    <td className="px-3 py-3 text-center text-xs text-[#716a56]">
                      {row.lastOrderDate ? formatDateShort(row.lastOrderDate) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {row.outstandingBalance > 0 ? (
                        <span className="text-red-600 font-medium text-xs">
                          {formatCurrency(row.outstandingBalance)}
                        </span>
                      ) : (
                        <span className="text-green-600">✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
