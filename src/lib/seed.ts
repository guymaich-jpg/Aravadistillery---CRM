// Default seed data for first-run initialization.
// Products are real Arava Distillery products — preserved across versions.

import type { Product } from '@/types/crm';

export const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'ערק',              category: 'other',   basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '2', name: 'ליקוריץ',          category: 'liqueur', basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '3', name: 'EDV',              category: 'other',   basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '4', name: "ג'ין",             category: 'gin',     basePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '5', name: 'ברנדי VS',         category: 'other',   basePrice: 180, unit: 'בקבוק', isActive: true },
  { id: '6', name: 'ברנדי VSOP',       category: 'other',   basePrice: 220, unit: 'בקבוק', isActive: true },
  { id: '7', name: 'ברנדי ים תיכוני',  category: 'other',   basePrice: 180, unit: 'בקבוק', isActive: true },
];
