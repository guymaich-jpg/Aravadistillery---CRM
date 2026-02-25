// Firestore real-time listener for stockLevels collection.
// Uses onSnapshot to stream live inventory updates from the factory control app.
// Leverages Firestore's persistent local cache (already configured) — no extra cost.

import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import type { StockLevel } from '@/types/inventory';

export interface StockLevelListenerCallbacks {
  onData: (levels: StockLevel[]) => void;
  onError: (error: string) => void;
}

/**
 * Subscribe to real-time stockLevels updates from Firestore.
 * Returns an unsubscribe function to tear down the listener.
 */
export function subscribeToStockLevels(
  callbacks: StockLevelListenerCallbacks,
): Unsubscribe {
  const db = getFirestoreDb();
  const ref = collection(db, 'stockLevels');

  return onSnapshot(
    ref,
    (snapshot) => {
      const levels = snapshot.docs.map(d => d.data() as StockLevel);
      callbacks.onData(levels);
    },
    (error) => {
      callbacks.onError(error.message ?? 'שגיאה בהאזנה למלאי');
    },
  );
}
