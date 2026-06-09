import { useClientsCtx } from '@/store/ClientsContext';
import { AREA_LABELS, CLIENT_TYPE_LABELS, PRODUCT_CATEGORY_COLORS, PRODUCT_CATEGORY_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import type { Area, ClientType, ProductCategory } from '@/types/crm';
import type { ProductMixRow } from '@/hooks/useAnalyticsFilters';

interface ClientBreakdownProps {
  clientId: string;
  productMix: ProductMixRow[];
  orderCount: number;
}

export function ClientBreakdown({ clientId, productMix, orderCount }: ClientBreakdownProps) {
  const { clients } = useClientsCtx();
  const client = clients.find(c => c.id === clientId);
  if (!client) return null;

  const totalRevenue = productMix.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="bg-white border border-[#e9ddc9] rounded-xl shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)] overflow-hidden">
      <div className="p-5 border-b border-[#f0e7d6]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[12.5px] text-[#6b5e4d] font-semibold mb-1">פירוט פריטים ללקוח</div>
            <h2 className="text-[22px] font-extrabold text-[#3d2206]">{client.businessName}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[12.5px] font-bold text-[#7d623a] bg-[#f1e7d4]">
                {AREA_LABELS[client.area as Area] ?? client.area}
              </span>
              <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[12.5px] font-bold text-[#7d623a] bg-[#f1e7d4]">
                {CLIENT_TYPE_LABELS[client.clientType as ClientType] ?? client.clientType}
              </span>
              {client.contactPerson && (
                <span className="text-[13px] text-[#6b5e4d]">{client.contactPerson}</span>
              )}
            </div>
          </div>
          <div className="flex gap-5">
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-[#c9821a]">{formatCurrency(totalRevenue)}</div>
              <div className="text-[12px] text-[#6b5e4d] font-semibold">הכנסה</div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-[#3d2206]">{orderCount}</div>
              <div className="text-[12px] text-[#6b5e4d] font-semibold">הזמנות</div>
            </div>
            <div className="text-center">
              <div className="text-[20px] font-extrabold text-[#3d2206]">{productMix.length}</div>
              <div className="text-[12px] text-[#6b5e4d] font-semibold">פריטים</div>
            </div>
          </div>
        </div>
      </div>

      {productMix.length === 0 ? (
        <div className="py-8 text-center text-[#6b5e4d] text-[14px]">אין פריטים לתקופה זו</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="text-start text-[#6b5e4d] font-semibold px-5 py-2.5 border-b border-[#e9ddc9] text-[12.5px]">פריט</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-3 py-2.5 border-b border-[#e9ddc9] text-[12.5px]">קטגוריה</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-3 py-2.5 border-b border-[#e9ddc9] text-[12.5px]">כמות</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-3 py-2.5 border-b border-[#e9ddc9] text-[12.5px]">הזמנות</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-3 py-2.5 border-b border-[#e9ddc9] text-[12.5px]">הכנסה</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-3 py-2.5 border-b border-[#e9ddc9] text-[12.5px] min-w-[140px]">% מההכנסה</th>
              </tr>
            </thead>
            <tbody>
              {productMix.map(p => {
                const pct = totalRevenue > 0 ? Math.round(p.revenue / totalRevenue * 100) : 0;
                const catColor = PRODUCT_CATEGORY_COLORS[p.category as ProductCategory] ?? '#95a5a6';
                return (
                  <tr key={p.id} className="border-b border-[#f0e7d6] last:border-0">
                    <td className="px-5 py-2.5 font-semibold text-[#3d2206]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: catColor }} />
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#6b5e4d]">{PRODUCT_CATEGORY_LABELS[p.category as ProductCategory] ?? p.category}</td>
                    <td className="px-3 py-2.5 text-[#3d2206] tabular-nums">{p.qty}</td>
                    <td className="px-3 py-2.5 text-[#3d2206] tabular-nums">{p.orders}</td>
                    <td className="px-3 py-2.5 font-bold text-[#c9821a] tabular-nums">{formatCurrency(p.revenue)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#f0e7d6] rounded-full overflow-hidden">
                          <div className="h-full bg-[#c9821a] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[12px] text-[#6b5e4d] font-semibold w-8 tabular-nums">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
