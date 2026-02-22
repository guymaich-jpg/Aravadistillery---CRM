import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseClientsCSV, downloadClientsTemplate } from '@/lib/csv';
import type { ParsedClientRow, ImportError } from '@/lib/csv';
import type { Client } from '@/types/crm';
import { CLIENT_STATUS_LABELS } from '@/lib/constants';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: Omit<Client, 'id' | 'createdAt'>[]) => Promise<number>;
}

type Step = 'pick' | 'preview' | 'importing' | 'done';

const PREVIEW_LIMIT = 50;

export function ImportClientsDialog({ open, onOpenChange, onImport }: ImportClientsDialogProps) {
  const [step, setStep] = useState<Step>('pick');
  const [parsedClients, setParsedClients] = useState<ParsedClientRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset to initial state whenever dialog opens
  useEffect(() => {
    if (open) {
      setStep('pick');
      setParsedClients([]);
      setParseErrors([]);
      setImportedCount(0);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text || !text.trim()) {
        setFileError('הקובץ ריק');
        return;
      }
      const { clients, errors } = parseClientsCSV(text);
      if (clients.length === 0 && errors.length > 0) {
        // Fatal parse error — show in pick step
        setFileError(errors[0].message);
        return;
      }
      setParsedClients(clients);
      setParseErrors(errors);
      setStep('preview');
    };
    reader.onerror = () => setFileError('שגיאה בקריאת הקובץ');
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    setStep('importing');
    const rows: Omit<Client, 'id' | 'createdAt'>[] = parsedClients.map(c => ({
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      status: c.status,
      notes: c.notes,
    }));
    const count = await onImport(rows);
    setImportedCount(count);
    setStep('done');
  }

  const previewRows = parsedClients.slice(0, PREVIEW_LIMIT);
  const remaining = parsedClients.length - PREVIEW_LIMIT;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              ייבוא לקוחות מ-CSV
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* ── Step: pick ───────────────────────────────────────── */}
          {step === 'pick' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                ייבא לקוחות מקובץ CSV. הקובץ צריך לכלול לפחות עמודת שם.
              </p>

              {/* Download template */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Download className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-amber-800">לא בטוח מה הפורמט?</p>
                  <p className="text-xs text-amber-700">הורד תבנית מוכנה עם כותרות לדוגמה</p>
                </div>
                <button
                  type="button"
                  onClick={downloadClientsTemplate}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 whitespace-nowrap"
                >
                  הורד תבנית
                </button>
              </div>

              {/* File picker */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">בחר קובץ CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-colors"
                >
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">לחץ לבחירת קובץ CSV</span>
                </label>
                {fileError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {fileError}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Dialog.Close className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  ביטול
                </Dialog.Close>
              </div>
            </div>
          )}

          {/* ── Step: preview ────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700 font-medium">
                נמצאו {parsedClients.length} לקוחות לייבוא
              </p>

              {/* Validation warnings */}
              {parseErrors.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-1">
                  <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {parseErrors.length} שורות שלא ייובאו
                  </p>
                  <ul className="space-y-0.5">
                    {parseErrors.map((err, i) => (
                      <li key={i} className="text-xs text-yellow-700">
                        שורה {err.rowIndex}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-right px-3 py-2 font-semibold text-gray-500">#</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-500">שם</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-500">חברה</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-500">טלפון</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-500">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                          <td className="px-3 py-2 text-gray-600">{row.company || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 dir-ltr text-right">{row.phone || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{CLIENT_STATUS_LABELS[row.status]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {remaining > 0 && (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
                    ו-{remaining} לקוחות נוספים…
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={parsedClients.length === 0}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ייבא {parsedClients.length} לקוחות
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('pick');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  חזור
                </button>
              </div>
            </div>
          )}

          {/* ── Step: importing ──────────────────────────────────── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-8 w-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">מייבא לקוחות…</p>
            </div>
          )}

          {/* ── Step: done ───────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {importedCount === parsedClients.length
                    ? `יובאו ${importedCount} לקוחות בהצלחה!`
                    : `יובאו ${importedCount} מתוך ${parsedClients.length} לקוחות`}
                </p>
                {importedCount < parsedClients.length && (
                  <p className="text-sm text-gray-500 mt-1">
                    {parsedClients.length - importedCount} לקוחות לא הצליחו להישמר
                  </p>
                )}
              </div>
              <Dialog.Close className="px-6 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                סגור
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
