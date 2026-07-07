// The Arava Distillery product catalog — the single source of truth shared by
// the CRM and the Factory Control app (seeded into the Firestore `products`
// collection). Each item is a distinct finished-product SKU with its own price.
//
// `wholesalePrice` starts equal to `basePrice`; managers tune it per item in the
// Products (מוצרים) management screen. Factory Control displays name + unit only
// (never price).

import type { Product } from '@/types/crm';

export const CATALOG: Product[] = [
  { id: '1',  name: 'ערק 500 מ"ל',        category: 'other',   basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '2',  name: 'ליקריץ 500 מ"ל',      category: 'liqueur', basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '3',  name: 'או-דה-וי 500 מ"ל',    category: 'other',   basePrice: 110, wholesalePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '4',  name: 'ג\'ין 500 מ"ל',       category: 'gin',     basePrice: 110, wholesalePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '5',  name: 'ברנדי VS 500 מ"ל',    category: 'other',   basePrice: 180, wholesalePrice: 180, unit: 'בקבוק', isActive: true },
  { id: '6',  name: 'ערק 200 מ"ל',        category: 'other',   basePrice: 40,  wholesalePrice: 40,  unit: 'בקבוק', isActive: true },
  { id: '7',  name: 'ג\'ין 200 מ"ל',       category: 'gin',     basePrice: 50,  wholesalePrice: 50,  unit: 'בקבוק', isActive: true },
  { id: '8',  name: 'ברנדי 200 מ"ל',       category: 'other',   basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '9',  name: 'ליקר ערק תאנים',       category: 'liqueur', basePrice: 40,  wholesalePrice: 40,  unit: 'בקבוק', isActive: true },
  { id: '10', name: 'ליקר ג\'ין הדרים',     category: 'liqueur', basePrice: 40,  wholesalePrice: 40,  unit: 'בקבוק', isActive: true },
  { id: '11', name: 'ערק גלי',             category: 'other',   basePrice: 40,  wholesalePrice: 40,  unit: 'בקבוק', isActive: true },
  { id: '12', name: 'ליקריץ גלי',          category: 'liqueur', basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '13', name: 'גין גלי',             category: 'gin',     basePrice: 110, wholesalePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '14', name: 'ערק רואי',            category: 'other',   basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '15', name: 'ליקריץ אורי',         category: 'liqueur', basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '16', name: 'גין רואי',            category: 'gin',     basePrice: 110, wholesalePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '17', name: 'ערק עידו',            category: 'other',   basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '18', name: 'ליקריץ עידו',         category: 'liqueur', basePrice: 80,  wholesalePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '19', name: 'גין עידו',            category: 'gin',     basePrice: 110, wholesalePrice: 110, unit: 'בקבוק', isActive: true },
];

/** The unit price to default an order line to, given the client's type. */
export function priceForClientType(product: Product, clientType: string | undefined): number {
  if (clientType === 'wholesaler' && typeof product.wholesalePrice === 'number') {
    return product.wholesalePrice;
  }
  return product.basePrice;
}
