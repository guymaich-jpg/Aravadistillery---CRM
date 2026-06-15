// v9 → v10 migration: replace products with the 7 Factory Control drink types.
// Previous product list may have had aggregated brandies or missing items.
// This ensures 1:1 match with Factory Control's DRINK_TO_CRM mapping.

import { type LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';
import { hasFirebaseConfig } from '../firebase/config';

const FACTORY_PRODUCTS = [
  { id: '1', name: 'ערק',              category: 'other'   as const, basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '2', name: 'ליקוריץ',          category: 'liqueur' as const, basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '3', name: 'EDV',              category: 'other'   as const, basePrice: 80,  unit: 'בקבוק', isActive: true },
  { id: '4', name: "ג'ין",             category: 'gin'     as const, basePrice: 110, unit: 'בקבוק', isActive: true },
  { id: '5', name: 'ברנדי VS',         category: 'other'   as const, basePrice: 180, unit: 'בקבוק', isActive: true },
  { id: '6', name: 'ברנדי VSOP',       category: 'other'   as const, basePrice: 220, unit: 'בקבוק', isActive: true },
  { id: '7', name: 'ברנדי ים תיכוני',  category: 'other'   as const, basePrice: 180, unit: 'בקבוק', isActive: true },
];

export async function migrateV9ToV10(_adapter: LocalStorageAdapter): Promise<void> {
  // 1. Replace localStorage products
  try {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(FACTORY_PRODUCTS));
  } catch (e) {
    console.warn('v9→v10: could not migrate localStorage products:', e);
  }

  // 2. Replace Firestore products if configured
  if (hasFirebaseConfig()) {
    try {
      const { getFirestoreDb } = await import('../firebase/config');
      const { collection, getDocs, setDoc, deleteDoc, doc } = await import('firebase/firestore');
      const db = getFirestoreDb();

      // Remove any old products not in the new set
      const snap = await getDocs(collection(db, 'products'));
      const newIds = new Set(FACTORY_PRODUCTS.map(p => p.id));
      for (const d of snap.docs) {
        if (!newIds.has(d.id)) {
          await deleteDoc(doc(db, 'products', d.id));
        }
      }

      // Upsert the 7 canonical products
      for (const product of FACTORY_PRODUCTS) {
        await setDoc(doc(db, 'products', product.id), product);
      }
    } catch (e) {
      console.warn('v9→v10: could not migrate Firestore products:', e);
    }
  }
}
