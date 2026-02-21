import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategorySales } from '@/types/analytics';
import type { ProductCategory } from '@/types/crm';
import { PRODUCT_CATEGORY_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';

interface ProductMixPieChartProps {
  data: CategorySales[];
}

export function ProductMixPieChart({ data }: ProductMixPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-center h-[300px]">
        <p className="text-sm text-[#716a56]">אין נתוני מכירות לתצוגה</p>
      </div>
    );
  }

  const colorMap: Record<string, string> = PRODUCT_CATEGORY_COLORS as Record<ProductCategory, string>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-[#252525] mb-4">תמהיל מוצרים לפי הכנסה</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="categoryLabel"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={45}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={colorMap[entry.category] ?? '#95a5a6'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            formatter={(v: number, name: string) => [
              `${formatCurrency(v)} (${data.find(d => d.categoryLabel === name)?.percentage?.toFixed(1) ?? 0}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => value}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
