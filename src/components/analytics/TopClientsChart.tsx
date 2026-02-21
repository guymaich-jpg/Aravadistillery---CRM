import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ClientRankRow } from '@/types/analytics';
import { formatCurrency } from '@/lib/currency';

interface TopClientsChartProps {
  data: ClientRankRow[];
}

export function TopClientsChart({ data }: TopClientsChartProps) {
  const top10 = data.slice(0, 10).map((r) => ({
    name: r.clientName.length > 12 ? r.clientName.slice(0, 12) + '…' : r.clientName,
    revenue: r.totalRevenue,
  }));

  if (top10.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-center h-[300px]">
        <p className="text-sm text-[#716a56]">אין נתוני לקוחות</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-[#252525] mb-4">לקוחות מובילים — הכנסה</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          layout="vertical"
          data={top10}
          margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#716a56' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₪${v.toLocaleString()}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#252525' }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v: number) => [formatCurrency(v), 'הכנסה']}
          />
          <Bar dataKey="revenue" fill="#c9821a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
