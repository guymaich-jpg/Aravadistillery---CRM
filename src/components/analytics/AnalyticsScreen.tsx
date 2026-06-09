import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import { useClientsCtx } from '@/store/ClientsContext';
import { useProductsCtx } from '@/store/ProductsContext';
import { SingleSelect } from '@/components/shared/SingleSelect';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { ChipsBar } from '@/components/shared/ChipsBar';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { ClientBreakdown } from './ClientBreakdown';
import { SalesBarChart } from './SalesBarChart';
import { TopClientsChart } from './TopClientsChart';
import { ProductMixPieChart } from './ProductMixPieChart';
import { formatCurrency } from '@/lib/currency';
import { AREA_OPTIONS, AREA_LABELS } from '@/lib/constants';
import type { AnalyticsPeriod } from '@/types/analytics';
import type { Area } from '@/types/crm';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '30d', label: '30 יום' },
  { value: '90d', label: '90 יום' },
  { value: 'year', label: 'שנה' },
  { value: 'all', label: 'הכל' },
];

export function AnalyticsScreen() {
  const { filters, setFilter, reset, chips, data } = useAnalyticsFilters();
  const { getActiveClients } = useClientsCtx();
  const { products } = useProductsCtx();
  const activeClients = getActiveClients();

  return (
    <div className="p-5 max-w-[1320px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[26px] font-bold text-[#3d2206]">ניתוח</h1>
          <p className="text-sm text-[#6b5e4d] mt-1">תמונת מצב עסקית</p>
        </div>
        <SegmentedControl
          options={PERIOD_OPTIONS}
          value={filters.period}
          onChange={v => setFilter('period', v)}
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#e9ddc9] rounded-xl p-3 mb-3.5 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)] flex gap-3 items-center flex-wrap">
        <SingleSelect
          label="לקוח"
          options={activeClients.map(c => c.id)}
          value={filters.client}
          onChange={v => setFilter('client', v)}
          render={id => activeClients.find(c => c.id === id)?.businessName ?? id}
        />
        <MultiSelect
          label="פריט"
          options={products.map(p => p.id)}
          value={filters.products}
          onChange={v => setFilter('products', v)}
          render={id => products.find(p => p.id === id)?.name ?? id}
        />
        <MultiSelect
          label="אזור"
          options={[...AREA_OPTIONS]}
          value={filters.area}
          onChange={v => setFilter('area', v)}
          render={a => AREA_LABELS[a as Area]}
        />
      </div>

      {/* Chips */}
      <ChipsBar chips={chips} onClearAll={reset} />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4">
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#6b5e4d] font-semibold">הכנסה כוללת</div>
          <div className="text-[25px] font-extrabold text-[#c9821a] mt-1">{formatCurrency(data.totalRevenue)}</div>
        </div>
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#6b5e4d] font-semibold">יתרה לגבייה</div>
          <div className={`text-[25px] font-extrabold mt-1 ${data.outstanding > 0 ? 'text-[#c0392b]' : 'text-[#1f8a5b]'}`}>
            {formatCurrency(data.outstanding)}
          </div>
        </div>
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#6b5e4d] font-semibold">מספר הזמנות</div>
          <div className="text-[25px] font-extrabold text-[#3d2206] mt-1">{data.orderCount}</div>
        </div>
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#6b5e4d] font-semibold">לקוחות פעילים</div>
          <div className="text-[25px] font-extrabold text-[#3d2206] mt-1">{data.activeClients}</div>
        </div>
      </div>

      {/* Client drill-down (appears immediately when client filter is set) */}
      {filters.client && (
        <div className="mb-4">
          <ClientBreakdown
            clientId={filters.client}
            productMix={data.productMix}
            orderCount={data.orderCount}
          />
        </div>
      )}

      {/* Charts */}
      <div className="mb-4">
        <SalesBarChart data={data.byMonth} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopClientsChart data={data.topClients} />
        <ProductMixPieChart data={data.categorySales} />
      </div>
    </div>
  );
}
