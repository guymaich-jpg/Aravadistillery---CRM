// CSV export and import utilities

import type { Client, ClientStatus, Order } from '@/types/crm';
import { formatDate } from './date';
import { formatCurrency } from './currency';

// ── Import types ─────────────────────────────────────────────────────────────

export interface ParsedClientRow {
  rowIndex: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: ClientStatus;
  notes: string;
}

export interface ImportError {
  rowIndex: number;
  message: string;
}

// ── Generic CSV parser ────────────────────────────────────────────────────────

/**
 * Parse CSV text into a 2D array of strings.
 * Handles: BOM stripping, quoted fields, escaped double-quotes ("")
 * and commas/newlines inside quoted fields.
 */
export function parseCSVContent(text: string): string[][] {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          // Escaped double-quote inside quoted field
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n') {
        row.push(current);
        current = '';
        if (row.some(cell => cell.trim())) rows.push(row);
        row = [];
      } else if (ch === '\r') {
        // skip; \n following will handle line break
      } else {
        current += ch;
      }
    }
  }
  // Last row (no trailing newline)
  row.push(current);
  if (row.some(cell => cell.trim())) rows.push(row);
  return rows;
}

// ── Client CSV import ─────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, keyof ParsedClientRow | null> = {
  'שם': 'name',
  'חברה': 'company',
  'דוא״ל': 'email',
  'טלפון': 'phone',
  'סטטוס': 'status',
  'הערות': 'notes',
  'תאריך הצטרפות': null, // ignored on import
};

const STATUS_REVERSE: Record<string, ClientStatus> = {
  'פעיל': 'active',
  'לא פעיל': 'inactive',
  'פוטנציאלי': 'prospect',
};

export function parseClientsCSV(text: string): {
  clients: ParsedClientRow[];
  errors: ImportError[];
} {
  const allRows = parseCSVContent(text);
  if (allRows.length === 0) {
    return { clients: [], errors: [{ rowIndex: 0, message: 'הקובץ ריק' }] };
  }

  // First row is headers
  const headerRow = allRows[0].map(h => h.trim());

  // Build a map from known header names to column indices
  const colIndex: Partial<Record<keyof ParsedClientRow, number>> = {};
  let hasAnyKnownHeader = false;
  headerRow.forEach((header, idx) => {
    const field = HEADER_MAP[header];
    if (field === null) return; // explicitly ignored column
    if (field !== undefined) {
      (colIndex as Record<string, number>)[field] = idx;
      hasAnyKnownHeader = true;
    }
  });

  if (!hasAnyKnownHeader) {
    return {
      clients: [],
      errors: [{ rowIndex: 0, message: 'לא זוהו כותרות מתאימות. ודא שהקובץ בפורמט הנכון.' }],
    };
  }

  const clients: ParsedClientRow[] = [];
  const errors: ImportError[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const rowIndex = i + 1; // 1-based, 1 = header row

    function cell(field: keyof ParsedClientRow): string {
      const idx = (colIndex as Record<string, number>)[field];
      return idx !== undefined ? (row[idx] ?? '').trim() : '';
    }

    const name = cell('name');
    if (!name) {
      errors.push({ rowIndex, message: 'שם חסר — השורה לא תיובא' });
      continue;
    }

    const rawStatus = cell('status');
    const status: ClientStatus = STATUS_REVERSE[rawStatus] ?? 'prospect';

    clients.push({
      rowIndex,
      name,
      company: cell('company'),
      email: cell('email'),
      phone: cell('phone'),
      status,
      notes: cell('notes'),
    });
  }

  return { clients, errors };
}

// ── Template download ─────────────────────────────────────────────────────────

export function downloadClientsTemplate(): void {
  const headers = ['שם', 'חברה', 'דוא״ל', 'טלפון', 'סטטוס', 'הערות'];
  const exampleRow = ['ישראל ישראלי', 'חברה לדוגמה', 'israel@example.com', '050-1234567', 'פעיל', ''];
  const content = buildCSVContent(headers, [exampleRow]);
  downloadCSV(content, 'תבנית-ייבוא-לקוחות.csv');
}

function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSVContent(headers: string[], rows: string[][]): string {
  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map(row => row.map(escapeCSV).join(','));
  return [headerRow, ...dataRows].join('\n');
}

function downloadCSV(content: string, filename: string): void {
  // Add BOM for Hebrew Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportClientsToCSV(clients: Client[]): void {
  const active = clients.filter(c => !c.deletedAt);
  const headers = ['שם', 'חברה', 'דוא״ל', 'טלפון', 'סטטוס', 'הערות', 'תאריך הצטרפות'];
  const rows = active.map(c => [
    c.name,
    c.company,
    c.email,
    c.phone,
    c.status === 'active' ? 'פעיל' : c.status === 'inactive' ? 'לא פעיל' : 'פוטנציאלי',
    c.notes,
    formatDate(c.createdAt),
  ]);
  const content = buildCSVContent(headers, rows);
  downloadCSV(content, `לקוחות-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportOrdersToCSV(orders: Order[], paymentStatusFilter?: string): void {
  let filtered = orders.filter(o => !o.deletedAt);
  if (paymentStatusFilter && paymentStatusFilter !== 'all') {
    filtered = filtered.filter(o => o.paymentStatus === paymentStatusFilter);
  }
  const headers = ['מספר הזמנה', 'לקוח', 'סכום', 'שולם', 'יתרה', 'סטטוס תשלום', 'אמצעי תשלום', 'תאריך', 'הערות'];
  const rows = filtered.map(o => [
    o.id.slice(-8).toUpperCase(),
    o.clientName,
    formatCurrency(o.total),
    formatCurrency(o.amountPaid),
    formatCurrency(o.total - o.amountPaid),
    o.paymentStatus === 'paid' ? 'שולם' : o.paymentStatus === 'pending' ? 'ממתין' : 'חלקי',
    o.paymentMethod,
    formatDate(o.createdAt),
    o.notes,
  ]);
  const content = buildCSVContent(headers, rows);
  downloadCSV(content, `הזמנות-${new Date().toISOString().split('T')[0]}.csv`);
}
