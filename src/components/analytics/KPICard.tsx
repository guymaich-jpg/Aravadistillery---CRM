import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  growth?: number;          // ratio: 0.05 = +5%
  variant?: 'default' | 'warning' | 'danger';
}

export function KPICard({ label, value, subValue, growth, variant = 'default' }: KPICardProps) {
  const valueColor =
    variant === 'danger' ? 'text-red-600' :
    variant === 'warning' ? 'text-amber-600' :
    'text-[#252525]';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-medium text-[#716a56] mb-2">{label}</p>
      <p className={`text-2xl font-bold leading-tight ${valueColor}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-[#716a56] mt-0.5">{subValue}</p>
      )}
      {growth !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {growth > 0 ? (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs text-green-600 font-medium">+{(growth * 100).toFixed(1)}%</span>
            </>
          ) : growth < 0 ? (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-red-500 font-medium">{(growth * 100).toFixed(1)}%</span>
            </>
          ) : (
            <>
              <Minus className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">ללא שינוי</span>
            </>
          )}
          <span className="text-xs text-gray-400 mr-1">לעומת הקודם</span>
        </div>
      )}
    </div>
  );
}
