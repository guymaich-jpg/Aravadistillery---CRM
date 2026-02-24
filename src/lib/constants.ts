// App-wide Hebrew label constants

import type { ClientStatus, ClientType, Area, PaymentStatus, PaymentMethod, ProductCategory } from '@/types/crm';

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active:   'פעיל',
  inactive: 'לא פעיל',
  prospect: 'פוטנציאלי',
};

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  prospect: 'bg-blue-100 text-blue-800',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid:    'שולם',
  pending: 'ממתין',
  partial: 'חלקי',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  paid:    'bg-green-100 text-green-800',
  pending: 'bg-red-100 text-red-800',
  partial: 'bg-amber-100 text-amber-800',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:     'מזומן',
  card:     'כרטיס',
  transfer: 'העברה בנקאית',
  check:    'צ׳ק',
  bit:      'ביט',
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  whiskey: 'וויסקי',
  gin:     'ג׳ין',
  vodka:   'וודקה',
  rum:     'רום',
  liqueur: 'ליקר',
  other:   'אחר',
};

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  whiskey: '#c9821a',
  gin:     '#4f86c6',
  vodka:   '#a8d8a8',
  rum:     '#d4a853',
  liqueur: '#9b59b6',
  other:   '#95a5a6',
};

// ── Option arrays for dropdowns ──────────────────────────────────────────────

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ['paid', 'pending', 'partial'];
export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['cash', 'card', 'transfer', 'check', 'bit'];
export const CLIENT_STATUS_OPTIONS: ClientStatus[] = ['active', 'prospect', 'inactive'];

// ── Client Type ──────────────────────────────────────────────────────────────

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  business:      'עסקי',
  private:       'פרטי',
  institutional: 'מוסדי',
};

export const CLIENT_TYPE_OPTIONS: ClientType[] = ['business', 'private', 'institutional'];

// ── Area / Region ────────────────────────────────────────────────────────────

export const AREA_LABELS: Record<Area, string> = {
  north:      'צפון',
  center:     'מרכז',
  south:      'דרום',
  jerusalem:  'ירושלים',
  sharon:     'שרון',
  shephelah:  'שפלה',
};

export const AREA_OPTIONS: Area[] = ['north', 'center', 'south', 'jerusalem', 'sharon', 'shephelah'];
