import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PaymentStatusByMonth } from '@/types/analytics';

interface PaymentStatusChartProps {
  data: PaymentStatusByMonth[];
}

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'שולם',
  pending: 'ממתין',
  partial: 'חלקי',
};

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-[#252525] mb-4">סטטוס תשלום לפי חודש</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: '#716a56' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#716a56' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₪${v.toLocaleString()}`}
            width={70}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v: number, name: string) => [
              `₪${v.toLocaleString()}`,
              PAYMENT_LABELS[name] ?? name,
            ]}
          />
          <Legend
            formatter={(v: string) => PAYMENT_LABELS[v] ?? v}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar dataKey="paid" stackId="s" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="partial" stackId="s" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="pending" stackId="s" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
