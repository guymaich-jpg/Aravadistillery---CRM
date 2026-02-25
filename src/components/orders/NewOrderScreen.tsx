import { useState } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useClients } from '@/hooks/useClients';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/currency';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants';
import type { Order, OrderItem, PaymentMethod, PaymentStatus } from '@/types/crm';

interface NewOrderScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3;

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export function NewOrderScreen({ onSuccess, onCancel }: NewOrderScreenProps) {
  const { addOrder } = useOrders();
  const { filteredClients: clients } = useClients();
  const { activeProducts: products } = useProducts();

  const [step, setStep] = useState<Step>(1);
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredClients = clientSearch
    ? clients.filter((c) =>
        c.businessName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(clientSearch.toLowerCase())))
    : clients;

  const selectedClient = clients.find((c) => c.id === clientId);

  // Compute totals
  const orderItems: OrderItem[] = lines.map((l) => ({
    productId: l.productId,
    productName: l.productName,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discount: l.discount,
    total: Math.round(l.quantity * l.unitPrice * (1 - l.discount / 100) * 100) / 100,
  }));

  const subtotal = orderItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalDiscount = orderItems.reduce((s, i) => s + (i.quantity * i.unitPrice * i.discount) / 100, 0);
  const total = orderItems.reduce((s, i) => s + i.total, 0);

  function addLine() {
    const firstProduct = products[0];
    if (!firstProduct) return;
    setLines((prev) => [
      ...prev,
      {
        productId: firstProduct.id,
        productName: firstProduct.name,
        quantity: 1,
        unitPrice: firstProduct.basePrice,
        discount: 0,
      },
    ]);
  }

  function updateLine(index: number, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (field === 'productId') {
          const p = products.find((p) => p.id === value);
          if (!p) return line;
          return { ...line, productId: p.id, productName: p.name, unitPrice: p.basePrice };
        }
        return { ...line, [field]: value };
      }),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!selectedClient || orderItems.length === 0) return;
    setSaving(true);
    const data: Omit<Order, 'id' | 'createdAt'> = {
      clientId: selectedClient.id,
      clientName: selectedClient.businessName,
      items: orderItems,
      subtotal,
      totalDiscount,
      total,
      paymentStatus,
      paymentMethod,
      fulfillmentStatus: 'pending',
      amountPaid: paymentStatus === 'paid' ? total : paymentStatus === 'pending' ? 0 : amountPaid,
      notes,
    };
    await addOrder(data);
    setSaving(false);
    onSuccess();
  }

  // Step indicators
  const steps = [
    { n: 1, label: 'בחר לקוח' },
    { n: 2, label: 'פריטים' },
    { n: 3, label: 'תשלום' },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Step progress */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, idx) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                step >= s.n ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-500',
              ].join(' ')}
            >
              {s.n}
            </div>
            <span className={`text-xs hidden sm:block ${step >= s.n ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {idx < steps.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* STEP 1 — Select client */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">בחר לקוח</h2>
          <input
            type="search"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="חיפוש לקוח…"
            className="field-input mb-3"
          />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filteredClients.map((c) => (
              <button
                key={c.id}
                onClick={() => { setClientId(c.id); setClientSearch(''); }}
                className={[
                  'w-full text-right px-3 py-2.5 rounded-lg text-sm transition-colors',
                  clientId === c.id
                    ? 'bg-amber-50 border border-amber-200 text-amber-800 font-medium'
                    : 'hover:bg-gray-50 text-gray-700',
                ].join(' ')}
              >
                {c.businessName}
                {c.contactPerson && <span className="text-xs text-gray-400 mr-1">· {c.contactPerson}</span>}
              </button>
            ))}
            {filteredClients.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">לא נמצאו לקוחות</p>
            )}
          </div>
          <div className="flex justify-between pt-4 mt-2 border-t border-gray-100">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              ביטול
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!clientId}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>הבא</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Order items */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">פריטי הזמנה</h2>
          {selectedClient && (
            <p className="text-xs text-gray-400 mb-4">לקוח: {selectedClient.businessName}</p>
          )}

          {lines.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">לא נבחרו פריטים</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end text-xs">
                  {/* Product */}
                  <div className="col-span-4">
                    {idx === 0 && <label className="block text-gray-500 mb-1">מוצר</label>}
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                      className="field-input text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Qty */}
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-gray-500 mb-1">כמות</label>}
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="field-input text-xs"
                    />
                  </div>
                  {/* Unit price */}
                  <div className="col-span-3">
                    {idx === 0 && <label className="block text-gray-500 mb-1">מחיר ליחידה ₪</label>}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))}
                      className="field-input text-xs"
                    />
                  </div>
                  {/* Discount */}
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-gray-500 mb-1">הנחה %</label>}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={line.discount}
                      onChange={(e) => updateLine(idx, 'discount', Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="field-input text-xs"
                    />
                  </div>
                  {/* Remove */}
                  <div className="col-span-1 flex justify-center pb-0.5">
                    <button
                      onClick={() => removeLine(idx)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Row total */}
                  <div className="col-span-12 text-left text-amber-700 font-medium">
                    {formatCurrency(Math.round(line.quantity * line.unitPrice * (1 - line.discount / 100) * 100) / 100)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addLine}
            disabled={products.length === 0}
            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium mb-4"
          >
            <Plus className="h-4 w-4" />
            הוסף פריט
          </button>

          {/* Totals */}
          {lines.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 mb-4">
              <div className="flex justify-between text-gray-500">
                <span>{formatCurrency(subtotal)}</span>
                <span>סכום ביניים</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>-{formatCurrency(totalDiscount)}</span>
                  <span>הנחה</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>{formatCurrency(total)}</span>
                <span>סה״כ לתשלום</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
              חזור
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={lines.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>הבא</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Payment */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">פרטי תשלום</h2>

          {/* Summary */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-5 text-sm">
            <div className="flex justify-between text-amber-800 font-bold">
              <span>{formatCurrency(total)}</span>
              <span>סה״כ לתשלום</span>
            </div>
            <p className="text-amber-600 text-xs mt-0.5">
              {selectedClient?.businessName} · {lines.length} פריטים
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">אמצעי תשלום</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="field-input"
                >
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">סטטוס תשלום</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    const s = e.target.value as PaymentStatus;
                    setPaymentStatus(s);
                    setAmountPaid(s === 'paid' ? total : 0);
                  }}
                  className="field-input"
                >
                  {PAYMENT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            {paymentStatus === 'partial' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  סכום ששולם (₪)
                </label>
                <input
                  type="number"
                  min={0}
                  max={total}
                  step={1}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.min(total, Math.max(0, Number(e.target.value))))}
                  className="field-input"
                />
                <p className="text-xs text-amber-600">יתרה: {formatCurrency(total - amountPaid)}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">הערות</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="הערות להזמנה…"
                className="field-input resize-none"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 mt-2 border-t border-gray-100">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
              חזור
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'שומר…' : `שמור הזמנה · ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
