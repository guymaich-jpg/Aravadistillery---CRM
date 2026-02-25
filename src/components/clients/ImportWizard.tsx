// ImportWizard — multi-step CSV import dialog for clients
// Steps: Upload → Preview & Map → Validate → Import → Results

import { useState, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, FileText, AlertTriangle, CheckCircle2, Download, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientsCtx } from '@/store/ClientsContext';
import {
  parseCSVFile,
  autoMapColumns,
  buildImportRows,
  rowToClientData,
  downloadImportTemplate,
  exportErrorRows,
  MAPPABLE_FIELDS,
  type ColumnMapping,
  type ImportRow,
  type ImportResult,
  type MappableField,
} from '@/lib/csv-import';

type Step = 'upload' | 'preview' | 'importing' | 'results';

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const { clients } = useClients();
  const { addClient, updateClient } = useClientsCtx();

  // Wizard state
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Data state
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importRows, setImportRows] = useState<ImportRow[]>([]);

  // Import state
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Reset on close
  function handleOpenChange(open: boolean) {
    if (!open) {
      setStep('upload');
      setError(null);
      setFileName(null);
      setHeaders([]);
      setRawRows([]);
      setMapping({});
      setImportRows([]);
      setProgress(0);
      setResult(null);
    }
    onOpenChange(open);
  }

  // ── Upload handlers ────────────────────────────────────────────────────────

  async function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('יש לבחור קובץ CSV בלבד');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('גודל הקובץ חורג מ-5MB');
      return;
    }

    setError(null);
    setFileName(file.name);

    try {
      const parsed = await parseCSVFile(file);
      if (parsed.rows.length === 0) {
        setError('הקובץ ריק או לא מכיל שורות נתונים');
        return;
      }
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Auto-map columns
      const autoMapping = autoMapColumns(parsed.headers);
      setMapping(autoMapping);

      // Build import rows for preview
      const rows = buildImportRows(parsed.rows, autoMapping, clients);
      setImportRows(rows);

      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בקריאת הקובץ');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  // ── Mapping change ────────────────────────────────────────────────────────

  function updateMapping(header: string, field: MappableField | '') {
    const newMapping = { ...mapping, [header]: field === '' ? null : field };
    setMapping(newMapping);
    // Rebuild import rows with new mapping
    const rows = buildImportRows(rawRows, newMapping, clients);
    setImportRows(rows);
  }

  // ── Import execution ──────────────────────────────────────────────────────

  async function runImport() {
    const validRows = importRows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) {
      setError('אין שורות תקינות לייבוא');
      return;
    }

    setStep('importing');
    setProgress(0);

    const res: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [], errorRows: [] };
    const errorRows = importRows.filter(r => r.errors.length > 0);
    res.errors = errorRows.flatMap(r => r.errors);
    res.errorRows = errorRows;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const data = rowToClientData(row);

      try {
        if (row.matchedClientId) {
          // Update existing client (always overwrite)
          await updateClient(row.matchedClientId, data);
          res.updated++;
        } else {
          // Create new client
          await addClient(data);
          res.created++;
        }
      } catch (e) {
        res.skipped++;
        res.errors.push({
          row: row.rowNumber,
          field: 'general',
          message: e instanceof Error ? e.message : 'שגיאה בשמירה',
          value: '',
        });
        res.errorRows.push(row);
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    res.skipped += errorRows.length;
    setResult(res);
    setStep('results');
  }

  // ── Summary calculations ──────────────────────────────────────────────────

  const validCount = importRows.filter(r => r.errors.length === 0).length;
  const errorCount = importRows.filter(r => r.errors.length > 0).length;
  const newCount = importRows.filter(r => r.errors.length === 0 && !r.matchedClientId).length;
  const updateCount = importRows.filter(r => r.errors.length === 0 && r.matchedClientId).length;

  // Check that required fields are mapped
  const requiredFieldsMapped = Object.values(mapping).includes('businessName') && Object.values(mapping).includes('phone');

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              ייבוא לקוחות מ-CSV
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6 text-xs">
            <StepIndicator label="העלאה" active={step === 'upload'} done={step !== 'upload'} />
            <ArrowLeft className="h-3 w-3 text-gray-300" />
            <StepIndicator label="תצוגה מקדימה" active={step === 'preview'} done={step === 'importing' || step === 'results'} />
            <ArrowLeft className="h-3 w-3 text-gray-300" />
            <StepIndicator label="ייבוא" active={step === 'importing'} done={step === 'results'} />
            <ArrowLeft className="h-3 w-3 text-gray-300" />
            <StepIndicator label="תוצאות" active={step === 'results'} done={false} />
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Step: Upload ────────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 font-medium mb-1">
                  גרור קובץ CSV לכאן
                </p>
                <p className="text-xs text-gray-400">
                  או לחץ לבחירת קובץ (עד 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={downloadImportTemplate}
                  className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
                >
                  <Download className="h-4 w-4" />
                  הורד תבנית CSV
                </button>
                <p className="text-xs text-gray-400">
                  פורמט: UTF-8, מופרד בפסיקים
                </p>
              </div>
            </div>
          )}

          {/* ── Step: Preview & Mapping ─────────────────────────────────────── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-700">{fileName}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{rawRows.length} שורות</span>
              </div>

              {/* Column mapping */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">מיפוי עמודות</h3>
                {!requiredFieldsMapped && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    יש למפות לפחות את עמודות &quot;שם מקום/עסק&quot; ו&quot;טלפון&quot; כדי להמשיך
                  </div>
                )}
                <div className="space-y-2">
                  {headers.map(header => (
                    <div key={header} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 min-w-[100px] truncate font-mono bg-gray-50 px-2 py-1 rounded" title={header}>
                        {header}
                      </span>
                      <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />
                      <select
                        value={mapping[header] ?? ''}
                        onChange={(e) => updateMapping(header, e.target.value as MappableField | '')}
                        className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">דלג על עמודה</option>
                        {MAPPABLE_FIELDS.map(f => {
                          // Disable if already mapped to a different header
                          const alreadyMapped = Object.entries(mapping).some(
                            ([h, v]) => v === f.key && h !== header,
                          );
                          return (
                            <option key={f.key} value={f.key} disabled={alreadyMapped}>
                              {f.label}{f.required ? ' *' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-700">{newCount}</p>
                  <p className="text-xs text-green-600">לקוחות חדשים</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-700">{updateCount}</p>
                  <p className="text-xs text-blue-600">עדכון קיימים</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-700">{errorCount}</p>
                  <p className="text-xs text-red-600">שגיאות</p>
                </div>
              </div>

              {/* Error details */}
              {errorCount > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                    <p className="text-xs font-semibold text-red-700">שורות עם שגיאות ({errorCount})</p>
                  </div>
                  <div className="max-h-[120px] overflow-y-auto">
                    {importRows.filter(r => r.errors.length > 0).slice(0, 10).map(r => (
                      <div key={r.rowNumber} className="px-3 py-1.5 border-b border-red-50 text-xs">
                        <span className="font-mono text-red-600">שורה {r.rowNumber}:</span>{' '}
                        <span className="text-red-700">{r.errors.map(e => e.message).join(', ')}</span>
                      </div>
                    ))}
                    {errorCount > 10 && (
                      <div className="px-3 py-1.5 text-xs text-red-500">ועוד {errorCount - 10} שגיאות…</div>
                    )}
                  </div>
                </div>
              )}

              {/* Data preview table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">תצוגה מקדימה (5 שורות ראשונות)</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-right px-2 py-2 font-semibold text-gray-600">#</th>
                        {MAPPABLE_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                          <th key={f.key} className="text-right px-2 py-2 font-semibold text-gray-600">{f.label}</th>
                        ))}
                        <th className="text-center px-2 py-2 font-semibold text-gray-600">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map(row => (
                        <tr key={row.rowNumber} className={`border-b border-gray-50 ${row.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="px-2 py-1.5 text-gray-500">{row.rowNumber}</td>
                          {MAPPABLE_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                            <td key={f.key} className="px-2 py-1.5 text-gray-700 max-w-[120px] truncate">
                              {row.mapped[f.key] || '—'}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center">
                            {row.errors.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                שגיאה
                              </span>
                            ) : row.matchedClientId ? (
                              <span className="text-blue-600">עדכון</span>
                            ) : (
                              <span className="text-green-600">חדש</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={runImport}
                  disabled={validCount === 0 || !requiredFieldsMapped}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ייבא {validCount} לקוחות
                </button>
                <button
                  onClick={() => { setStep('upload'); setError(null); }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  חזור
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Importing ─────────────────────────────────────────────── */}
          {step === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-10 w-10 mx-auto text-amber-600 animate-spin" />
              <p className="text-sm font-medium text-gray-700">מייבא לקוחות…</p>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{progress}%</p>
            </div>
          )}

          {/* ── Step: Results ───────────────────────────────────────────────── */}
          {step === 'results' && result && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-sm font-semibold text-gray-800">הייבוא הושלם</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600">נוצרו</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-700">{result.updated}</p>
                  <p className="text-xs text-blue-600">עודכנו</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-600">{result.skipped}</p>
                  <p className="text-xs text-gray-500">דולגו (שגיאות)</p>
                </div>
              </div>

              {result.errorRows.length > 0 && (
                <button
                  onClick={() => exportErrorRows(result.errorRows)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  הורד שורות שגיאה ({result.errorRows.length})
                </button>
              )}

              <button
                onClick={() => handleOpenChange(false)}
                className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                סגור
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Step indicator badge ────────────────────────────────────────────────────

function StepIndicator({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const cls = active
    ? 'bg-amber-100 text-amber-700 font-semibold'
    : done
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-400';

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs ${cls}`}>
      {done && !active ? '✓ ' : ''}{label}
    </span>
  );
}
