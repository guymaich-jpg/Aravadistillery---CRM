import { useState } from 'react';
import { Wine, Plus, Check, X, EyeOff, Eye } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/constants';
import type { Product, ProductCategory } from '@/types/crm';

const CATEGORY_OPTIONS: ProductCategory[] = ['other', 'gin', 'liqueur', 'whiskey', 'vodka', 'rum'];

// A single editable price cell — commits to storage on blur / Enter.
function PriceCell({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const n = Math.max(0, Math.round(Number(draft) * 100) / 100);
    if (!Number.isNaN(n) && n !== value) onSave(n);
    setDraft(String(Number.isNaN(n) ? value : n));
  };
  return (
    <input
      type="number"
      min={0}
      step={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="w-24 tabular-nums text-start px-2.5 py-1.5 rounded-lg border border-[#e9ddc9] bg-white focus:border-[#c9821a] focus:outline-none focus:ring-2 focus:ring-[#c9821a]/20"
      dir="ltr"
    />
  );
}

export function ProductsScreen() {
  const { products, updateProduct, deactivateProduct, addProduct } = useProducts();
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('other');
  const [newBase, setNewBase] = useState('0');
  const [newWholesale, setNewWholesale] = useState('0');

  const visible = products
    .filter((p) => showInactive || p.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));

  async function patch(id: string, partial: Partial<Product>) {
    try { await updateProduct(id, partial); setError(null); }
    catch { setError('שגיאה בשמירת המוצר. נסה שוב.'); }
  }

  async function handleAdd() {
    if (!newName.trim()) { setError('יש להזין שם מוצר.'); return; }
    try {
      await addProduct({
        name: newName.trim(),
        category: newCategory,
        basePrice: Math.max(0, Number(newBase) || 0),
        wholesalePrice: Math.max(0, Number(newWholesale) || 0),
        unit: 'בקבוק',
        isActive: true,
      });
      setNewName(''); setNewCategory('other'); setNewBase('0'); setNewWholesale('0');
      setAdding(false); setError(null);
    } catch { setError('שגיאה בהוספת המוצר. נסה שוב.'); }
  }

  return (
    <div className="p-5 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[26px] font-bold text-[#3d2206] flex items-center gap-2">
            <Wine className="h-6 w-6 text-[#c9821a]" /> מוצרים ומחירים
          </h1>
          <p className="text-sm text-[#6b5e4d] mt-1">
            {visible.filter((p) => p.isActive).length} מוצרים פעילים · מחיר רגיל ומחיר סיטונאי
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive((s) => !s)}
            className="flex items-center gap-1.5 text-sm text-[#6b5e4d] hover:text-[#3d2206] px-3 py-2 rounded-lg hover:bg-[#fdf8ef] transition-colors"
          >
            {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showInactive ? 'הסתר לא פעילים' : 'הצג לא פעילים'}
          </button>
          <button onClick={() => setAdding((a) => !a)} className="btn-warning !px-3.5 !font-semibold whitespace-nowrap">
            <Plus className="h-4 w-4" /> מוצר חדש
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3.5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-medium">סגור</button>
        </div>
      )}

      {/* Add row */}
      {adding && (
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 mb-4 shadow-[0_1px_2px_rgba(61,34,6,.06)]">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_120px_auto] gap-2.5 items-end">
            <div>
              <label className="block text-xs font-medium text-[#6b5e4d] mb-1">שם מוצר</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="לדוגמה: ערק 500 מ&quot;ל" className="w-full field-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b5e4d] mb-1">קטגוריה</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ProductCategory)} className="w-full field-input">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{PRODUCT_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b5e4d] mb-1">מחיר רגיל ₪</label>
              <input type="number" min={0} value={newBase} onChange={(e) => setNewBase(e.target.value)} className="w-full field-input" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b5e4d] mb-1">מחיר סיטונאי ₪</label>
              <input type="number" min={0} value={newWholesale} onChange={(e) => setNewWholesale(e.target.value)} className="w-full field-input" dir="ltr" />
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleAdd} className="btn-success !px-3 !py-2" aria-label="שמור מוצר"><Check className="h-4 w-4" /></button>
              <button onClick={() => { setAdding(false); setError(null); }} className="px-3 py-2 text-[#6b5e4d] hover:text-[#c0392b] rounded-lg hover:bg-red-50" aria-label="בטל"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#e9ddc9] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
        <div className="grid grid-cols-[minmax(160px,1.6fr)_110px_130px_140px_110px] items-center gap-2.5 px-[18px] py-3 bg-[#faf3e6] font-bold text-[#6b5e4d] text-[12.5px] border-b border-[#f0e7d6]">
          <div>מוצר</div>
          <div>קטגוריה</div>
          <div>מחיר רגיל</div>
          <div>מחיר סיטונאי</div>
          <div>סטטוס</div>
        </div>
        {visible.length === 0 ? (
          <div className="py-11 text-center text-[#6b5e4d] text-[15px]">אין מוצרים להצגה</div>
        ) : (
          visible.map((p) => (
            <div
              key={p.id}
              className={`grid grid-cols-[minmax(160px,1.6fr)_110px_130px_140px_110px] items-center gap-2.5 px-[18px] py-2.5 border-b border-[#f0e7d6] text-[14px] ${p.isActive ? '' : 'opacity-55'}`}
            >
              <div className="font-bold text-[#3d2206] overflow-hidden text-ellipsis whitespace-nowrap">{p.name}</div>
              <div className="text-[#6b5e4d] text-[13px]">{PRODUCT_CATEGORY_LABELS[p.category]}</div>
              <div><PriceCell value={p.basePrice} onSave={(n) => patch(p.id, { basePrice: n })} /></div>
              <div><PriceCell value={p.wholesalePrice ?? p.basePrice} onSave={(n) => patch(p.id, { wholesalePrice: n })} /></div>
              <div>
                {p.isActive ? (
                  <button onClick={() => deactivateProduct(p.id).catch(() => setError('שגיאה בכיבוי המוצר.'))} className="text-xs text-[#6b5e4d] hover:text-[#c0392b] px-2 py-1 rounded-md hover:bg-red-50 transition-colors">השבת</button>
                ) : (
                  <button onClick={() => patch(p.id, { isActive: true })} className="text-xs text-[#1f8a5b] hover:text-[#166b47] px-2 py-1 rounded-md hover:bg-green-50 transition-colors">הפעל</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-[#a49682] mt-3">
        המחיר הסיטונאי משמש כברירת מחדל בהזמנות ללקוחות מסוג "סיטונאי". ניתן לשנות מחיר בשורת ההזמנה בעת יצירתה.
      </p>
    </div>
  );
}
