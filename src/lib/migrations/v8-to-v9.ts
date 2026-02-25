// v8 → v9 migration: add fulfillmentStatus to orders.
// All existing orders are marked as 'shipped' because stock was already deducted for them.

import { type LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';
import { hasFirebaseConfig } from '../firebase/config';

export async function migrateV8ToV9(_adapter: LocalStorageAdapter): Promise<void> {
  // 1. Migrate localStorage orders
  try {
    const raw = localStorage.getItem(KEYS.ORDERS);
    if (raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orders: any[] = JSON.parse(raw);
      const migrated = orders.map((o) => ({
        ...o,
        fulfillmentStatus: o.fulfillmentStatus ?? 'shipped',
      }));
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(migrated));
    }
  } catch (e) {
    console.warn('v8→v9: could not migrate localStorage orders:', e);
  }

  // 2. Migrate Firestore orders if configured
  if (hasFirebaseConfig()) {
    try {
      const { getFirestoreDb } = await import('../firebase/config');
      const { collection, getDocs, setDoc, doc } = await import('firebase/firestore');
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, 'orders'));

      for (const d of snap.docs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const o = d.data() as any;
        if (o.fulfillmentStatus === undefined) {
          await setDoc(doc(db, 'orders', d.id), {
            ...o,
            fulfillmentStatus: 'shipped',
          });
        }
      }
    } catch (e) {
      console.warn('v8→v9: could not migrate Firestore orders:', e);
    }
  }
}
