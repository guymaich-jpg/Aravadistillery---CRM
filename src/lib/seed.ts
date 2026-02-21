// Default seed data for first-run initialization.
// Preserves exactly the same 6 products and ~20 clients from the Lovable v3 app.

import type { Client, Product } from '@/types/crm';

const today = new Date().toISOString().split('T')[0];

export const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'ערק',     category: 'other',   basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '2', name: 'ליקריץ',  category: 'liqueur', basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '3', name: 'ADV',     category: 'other',   basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '4', name: "ג'ין",    category: 'gin',     basePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '5', name: 'ברנדי',   category: 'other',   basePrice: 180, unit: 'בקבוק', isActive: true },
  { id: '6', name: 'שונות',   category: 'other',   basePrice: 0,   unit: 'בקבוק', isActive: true },
];

export const DEFAULT_CLIENTS: Client[] = [
  { id: 'c1',  name: 'יניב אינסטלטור',   email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c2',  name: 'גיא גורן',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c3',  name: 'דני כהן',           email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c4',  name: 'אבי לוי',           email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c5',  name: 'מיכל שפירא',        email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c6',  name: 'יוסי ברק',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c7',  name: 'רחל גרין',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c8',  name: 'נדב פרידמן',        email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c9',  name: 'שלומי אזרן',        email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c10', name: 'תמר מזרחי',         email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c11', name: 'בני אוחיון',        email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c12', name: 'לימור חיון',        email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c13', name: 'עמית שטיין',        email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c14', name: 'חגי דרעי',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c15', name: 'מוריה כהן',         email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c16', name: 'רוני שמש',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c17', name: 'אורן ברנע',         email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c18', name: 'עינב פרץ',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c19', name: 'גל אברהם',          email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
  { id: 'c20', name: 'שיר סלמון',         email: '', phone: '', company: '', status: 'active', notes: '', createdAt: today },
];
