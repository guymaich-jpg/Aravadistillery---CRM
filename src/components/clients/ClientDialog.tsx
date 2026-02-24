import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { CLIENT_STATUS_OPTIONS, CLIENT_STATUS_LABELS, CLIENT_TYPE_OPTIONS, CLIENT_TYPE_LABELS, AREA_OPTIONS, AREA_LABELS } from '@/lib/constants';
import type { Client, ClientStatus, ClientType, Area } from '@/types/crm';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
}

const EMPTY: Omit<Client, 'id' | 'createdAt'> = {
  businessName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  area: '',
  clientType: 'business',
  status: 'active',
  tags: [],
  notes: '',
};

export function ClientDialog({ open, onOpenChange, client, onSubmit }: ClientDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              businessName: client.businessName,
              contactPerson: client.contactPerson ?? '',
              phone: client.phone,
              email: client.email,
              address: client.address ?? '',
              area: client.area ?? '',
              clientType: client.clientType ?? 'business',
              status: client.status,
              tags: client.tags ?? [],
              notes: client.notes,
            }
          : EMPTY,
      );
    }
  }, [open, client]);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName.trim() || !form.phone.trim()) return;
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
    onOpenChange(false);
  }

  const isEdit = !!client;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              {isEdit ? 'עריכת לקוח' : 'לקוח חדש'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="שם מקום/עסק *">
              <input
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                placeholder="שם העסק או המקום"
                required
                className="field-input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="איש קשר">
                <input
                  value={form.contactPerson}
                  onChange={(e) => set('contactPerson', e.target.value)}
                  placeholder="שם איש הקשר"
                  className="field-input"
                />
              </Field>
              <Field label="טלפון *">
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="050-0000000"
                  required
                  dir="ltr"
                  className="field-input text-right"
                />
              </Field>
            </div>

            <Field label='דוא"ל'>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                className="field-input text-right"
              />
            </Field>

            <Field label="כתובת">
              <input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="כתובת מלאה"
                className="field-input"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="אזור">
                <select
                  value={form.area}
                  onChange={(e) => set('area', e.target.value)}
                  className="field-input"
                >
                  <option value="">— בחר —</option>
                  {AREA_OPTIONS.map((a) => (
                    <option key={a} value={a}>{AREA_LABELS[a as Area]}</option>
                  ))}
                </select>
              </Field>
              <Field label="סוג לקוח">
                <select
                  value={form.clientType}
                  onChange={(e) => set('clientType', e.target.value)}
                  className="field-input"
                >
                  {CLIENT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{CLIENT_TYPE_LABELS[t as ClientType]}</option>
                  ))}
                </select>
              </Field>
              <Field label="סטטוס">
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as ClientStatus)}
                  className="field-input"
                >
                  {CLIENT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{CLIENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="תגיות">
              <input
                value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
                onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                placeholder="הפרד בפסיקים, לדוגמה: VIP, מסעדה"
                className="field-input"
              />
            </Field>

            <Field label="הערות">
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="הערות נוספות…"
                rows={3}
                className="field-input resize-none"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !form.businessName.trim() || !form.phone.trim()}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'שומר…' : isEdit ? 'שמור שינויים' : 'הוסף לקוח'}
              </button>
              <Dialog.Close className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                ביטול
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
