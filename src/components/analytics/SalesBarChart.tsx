import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SalesTimeSeries } from '@/types/analytics';

interface SalesBarChartProps {
  data: SalesTimeSeries[];
}

export function SalesBarChart({ data }: SalesBarChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-[#252525] mb-4">מכירות חודשיות</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: '#716a56' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#716a56' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₪${v.toLocaleString()}`}
            width={70}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#716a56' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(value: number, name: string) => {
              if (name === 'orderCount') return [value, 'הזמנות'];
              return [`₪${value.toLocaleString()}`, name === 'paid' ? 'שולם' : 'יתרה'];
            }}
          />
          <Legend
            formatter={(value) =>
              value === 'paid' ? 'שולם' : value === 'outstanding' ? 'יתרה' : 'הזמנות'
            }
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar yAxisId="left" dataKey="paid" stackId="revenue" fill="#c9821a" radius={[0, 0, 0, 0]} />
          <Bar yAxisId="left" dataKey="outstanding" stackId="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="orderCount"
            stroke="#2c332f"
            strokeWidth={2}
            dot={{ fill: '#2c332f', r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
