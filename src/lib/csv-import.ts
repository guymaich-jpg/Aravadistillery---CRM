// CSV Import engine — parsing, column mapping, validation, and deduplication
// Uses PapaParse for robust CSV handling (BOM, encoding, quoting, etc.)

import Papa from 'papaparse';
import type { Client, ClientStatus } from '@/types/crm';
import { CLIENT_STATUS_LABELS } from './constants';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Fields that can be mapped from a CSV column */
export type MappableField =
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'address'
  | 'status'
  | 'tags'
  | 'notes';

export const MAPPABLE_FIELDS: { key: MappableField; label: string; required: boolean }[] = [
  { key: 'name',    label: 'שם',     required: true },
  { key: 'email',   label: 'דוא״ל',  required: false },
  { key: 'phone',   label: 'טלפון',  required: false },
  { key: 'company', label: 'חברה',   required: false },
  { key: 'address', label: 'כתובת',  required: false },
  { key: 'status',  label: 'סטטוס',  required: false },
  { key: 'tags',    label: 'תגיות',  required: false },
  { key: 'notes',   label: 'הערות',  required: false },
];

/** Mapping from CSV column header → client field (or null = skip) */
export type ColumnMapping = Record<string, MappableField | null>;

export interface ValidationError {
  row: number;          // 1-based row number in CSV
  field: string;        // field name
  message: string;      // Hebrew error description
  value: string;        // raw value that failed validation
}

export interface ImportRow {
  rowNumber: number;    // 1-based CSV row number
  raw: Record<string, string>;
  mapped: Partial<Record<MappableField, string>>;
  errors: ValidationError[];
  /** Matched existing client id (for update), null for new */
  matchedClientId: string | null;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
  /** Rows that had errors (for export) */
  errorRows: ImportRow[];
}

// ── Hebrew header → field auto-mapping ─────────────────────────────────────────

const HEADER_MAP: Record<string, MappableField> = {
  // Hebrew headers (matching export)
  'שם':       'name',
  'דוא״ל':    'email',
  'דוא"ל':    'email',
  'אימייל':   'email',
  'טלפון':    'phone',
  'חברה':     'company',
  'כתובת':    'address',
  'סטטוס':    'status',
  'תגיות':    'tags',
  'הערות':    'notes',
};

// ── Hebrew status → value mapping ──────────────────────────────────────────────

const STATUS_MAP: Record<string, ClientStatus> = {
  // Hebrew labels
  'פעיל':       'active',
  'לא פעיל':    'inactive',
  'פוטנציאלי':  'prospect',
  // English values (accepted as-is)
  'active':     'active',
  'inactive':   'inactive',
  'prospect':   'prospect',
};

// ── Parse CSV file ─────────────────────────────────────────────────────────────

export function parseCSVFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          reject(new Error('שגיאה בקריאת קובץ CSV: ' + result.errors[0].message));
          return;
        }
        const headers = result.meta.fields ?? [];
        resolve({ headers, rows: result.data });
      },
      error: (err) => reject(new Error('שגיאה בקריאת קובץ CSV: ' + err.message)),
    });
  });
}

// ── Auto-detect column mapping ────────────────────────────────────────────────

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<MappableField>();

  for (const header of headers) {
    const normalised = header.trim();
    const field = HEADER_MAP[normalised];
    if (field && !usedFields.has(field)) {
      mapping[header] = field;
      usedFields.add(field);
    } else {
      mapping[header] = null; // skip by default
    }
  }

  return mapping;
}

// ── Validate a single row ──────────────────────────────────────────────────────

function validateRow(mapped: Partial<Record<MappableField, string>>, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // name is required
  if (!mapped.name?.trim()) {
    errors.push({ row: rowNumber, field: 'name', message: 'שם הלקוח הוא שדה חובה', value: mapped.name ?? '' });
  }

  // email format
  if (mapped.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mapped.email.trim())) {
      errors.push({ row: rowNumber, field: 'email', message: 'כתובת דוא״ל לא תקינה', value: mapped.email });
    }
  }

  // phone format (basic — allow digits, dashes, spaces, +, parentheses)
  if (mapped.phone?.trim()) {
    const phoneRegex = /^[0-9\-+\s()]{7,20}$/;
    if (!phoneRegex.test(mapped.phone.trim())) {
      errors.push({ row: rowNumber, field: 'phone', message: 'מספר טלפון לא תקין', value: mapped.phone });
    }
  }

  // status must be recognised
  if (mapped.status?.trim()) {
    const normalised = mapped.status.trim().toLowerCase();
    const validKeys = Object.keys(STATUS_MAP).map(k => k.toLowerCase());
    if (!validKeys.some(k => k === normalised)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: `סטטוס לא מוכר. ערכים תקינים: ${Object.values(CLIENT_STATUS_LABELS).join(', ')}`,
        value: mapped.status,
      });
    }
  }

  return errors;
}

// ── Resolve status from raw value ──────────────────────────────────────────────

function resolveStatus(raw: string | undefined): ClientStatus {
  if (!raw?.trim()) return 'active'; // default
  const normalised = raw.trim();
  // Try exact match first, then case-insensitive
  if (STATUS_MAP[normalised]) return STATUS_MAP[normalised];
  const lower = normalised.toLowerCase();
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (key.toLowerCase() === lower) return value;
  }
  return 'active'; // fallback
}

// ── Parse tags from comma-separated string ─────────────────────────────────────

function parseTags(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

// ── Build import rows with mapping and validation ─────────────────────────────

export function buildImportRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingClients: Client[],
): ImportRow[] {
  // Build lookup maps for deduplication
  const emailMap = new Map<string, Client>();
  const phoneMap = new Map<string, Client>();
  for (const client of existingClients) {
    if (client.deletedAt) continue;
    if (client.email?.trim()) emailMap.set(client.email.trim().toLowerCase(), client);
    if (client.phone?.trim()) phoneMap.set(normalisePhone(client.phone), client);
  }

  return rows.map((raw, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row

    // Apply mapping
    const mapped: Partial<Record<MappableField, string>> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (field && raw[header] !== undefined) {
        mapped[field] = raw[header];
      }
    }

    // Validate
    const errors = validateRow(mapped, rowNumber);

    // Dedup — match by email first, then phone
    let matchedClientId: string | null = null;
    const email = mapped.email?.trim().toLowerCase();
    const phone = mapped.phone?.trim();
    if (email && emailMap.has(email)) {
      matchedClientId = emailMap.get(email)!.id;
    } else if (phone && phoneMap.has(normalisePhone(phone))) {
      matchedClientId = phoneMap.get(normalisePhone(phone))!.id;
    }

    return { rowNumber, raw, mapped, errors, matchedClientId };
  });
}

/** Strip non-digit chars for phone comparison */
function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ── Convert an ImportRow to a Client data object ──────────────────────────────

export function rowToClientData(row: ImportRow): Omit<Client, 'id' | 'createdAt'> {
  return {
    name:    row.mapped.name?.trim() ?? '',
    email:   row.mapped.email?.trim() ?? '',
    phone:   row.mapped.phone?.trim() ?? '',
    company: row.mapped.company?.trim() ?? '',
    address: row.mapped.address?.trim() ?? '',
    status:  resolveStatus(row.mapped.status),
    tags:    parseTags(row.mapped.tags),
    notes:   row.mapped.notes?.trim() ?? '',
  };
}

// ── Generate CSV template ──────────────────────────────────────────────────────

export function downloadImportTemplate(): void {
  const headers = MAPPABLE_FIELDS.map(f => f.label);
  const exampleRow = ['ישראל ישראלי', 'israel@example.com', '050-1234567', 'חברה לדוגמה', 'תל אביב', 'פעיל', 'VIP, מסעדה', 'לקוח חדש'];
  const bom = '\uFEFF';
  const content = bom + headers.join(',') + '\n' + exampleRow.join(',');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'תבנית-ייבוא-לקוחות.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Export error rows as CSV ───────────────────────────────────────────────────

export function exportErrorRows(errorRows: ImportRow[]): void {
  if (errorRows.length === 0) return;

  const headers = ['שורה', ...Object.keys(errorRows[0].raw), 'שגיאות'];
  const rows = errorRows.map(r => [
    String(r.rowNumber),
    ...Object.values(r.raw),
    r.errors.map(e => `${e.field}: ${e.message}`).join(' | '),
  ]);

  const bom = '\uFEFF';
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const content = bom + [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `שגיאות-ייבוא-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
