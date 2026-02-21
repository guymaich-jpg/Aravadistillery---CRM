import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Client, ClientStatus } from '@/types/crm';

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'prospect', label: 'פוטנציאלי' },
  { value: 'inactive', label: 'לא פעיל' },
];

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
}

const EMPTY: Omit<Client, 'id' | 'createdAt'> = {
  name: '',
  email: '',
  phone: '',
  company: '',
  status: 'active',
  notes: '',
};

export function ClientDialog({ open, onOpenChange, client, onSubmit }: ClientDialogProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? { name: client.name, email: client.email, phone: client.phone, company: client.company, status: client.status, notes: client.notes }
          : EMPTY,
      );
    }
  }, [open, client]);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
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
            <Field label="שם *">
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="שם הלקוח"
                required
                className="field-input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="טלפון">
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="050-0000000"
                  dir="ltr"
                  className="field-input text-right"
                />
              </Field>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="חברה">
                <input
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  placeholder="שם החברה"
                  className="field-input"
                />
              </Field>
              <Field label="סטטוס">
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as ClientStatus)}
                  className="field-input"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>

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
                disabled={saving || !form.name.trim()}
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

// Inject field-input class via a style tag so Tailwind purge can't strip the base styles
const style = document.createElement('style');
style.textContent = `.field-input { width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; font-family: inherit; text-align: right; background: #fff; outline: none; } .field-input:focus { border-color: #d97706; box-shadow: 0 0 0 2px rgba(217,119,6,0.2); } .field-input::placeholder { color: #9ca3af; }`;
if (!document.querySelector('[data-crm-styles]')) {
  style.setAttribute('data-crm-styles', '');
  document.head.appendChild(style);
}
