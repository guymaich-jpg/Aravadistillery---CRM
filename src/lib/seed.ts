// Default seed data for first-run initialization.
// Products are real Arava Distillery products — preserved across versions.

import type { Product } from '@/types/crm';

export const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'ערק',     category: 'other',   basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '2', name: 'ליקריץ',  category: 'liqueur', basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '3', name: 'ADV',     category: 'other',   basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '4', name: "ג'ין",    category: 'gin',     basePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '5', name: 'ברנדי',   category: 'other',   basePrice: 180, unit: 'בקבוק', isActive: true },
  { id: '6', name: 'שונות',   category: 'other',   basePrice: 0,   unit: 'בקבוק', isActive: true },
];
