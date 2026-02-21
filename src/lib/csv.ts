// CSV export utilities

import type { Client, Order } from '@/types/crm';
import { formatDate } from './date';
import { formatCurrency } from './currency';

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
