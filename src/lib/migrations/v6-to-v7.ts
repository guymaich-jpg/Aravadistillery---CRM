// v6 → v7 migration: clear demo clients and orders from BOTH localStorage
// AND Firestore.  The v5→v6 migration only wiped localStorage, so any demo
// data pushed to Firestore during the v4→v5 migration is still there.

import { LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';
import { hasFirebaseConfig } from '../firebase/config';

export async function migrateV6ToV7(_adapter: LocalStorageAdapter): Promise<void> {
  // 1. Clear localStorage (belt-and-suspenders; v5→v6 already did this)
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify([]));
  localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));

  // 2. Clear Firestore if configured
  if (hasFirebaseConfig()) {
    try {
      const { getFirestoreDb } = await import('../firebase/config');
      const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      const db = getFirestoreDb();

      // Delete all client documents
      const clientsSnap = await getDocs(collection(db, 'clients'));
      for (const d of clientsSnap.docs) {
        await deleteDoc(doc(db, 'clients', d.id));
      }

      // Delete all order documents
      const ordersSnap = await getDocs(collection(db, 'orders'));
      for (const d of ordersSnap.docs) {
        await deleteDoc(doc(db, 'orders', d.id));
      }
    } catch (e) {
      // If Firestore is unreachable, log and continue — localStorage is already
      // clean, and the user can add real data once connectivity is restored.
      console.warn('v6→v7: could not clear Firestore demo data:', e);
    }
  }
}
