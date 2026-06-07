// Firestore real-time listener for stockLevels collection.
// Uses onSnapshot to stream live inventory updates from the factory control app.
// Leverages Firestore's persistent local cache (already configured) — no extra cost.

import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import type { StockLevel } from '@/types/inventory';
import { validateStockLevel } from '@/lib/validation/stockLevel';

export interface StockLevelListenerCallbacks {
  onData: (levels: StockLevel[]) => void;
  onError: (error: string) => void;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Subscribe to real-time stockLevels updates from Firestore.
 * Returns an unsubscribe function to tear down the listener.
 *
 * Validates each doc with `validateStockLevel` — malformed docs are filtered
 * out with a console.warn (no crash). On snapshot error, retries up to 3 times
 * with exponential backoff (2s, 4s, 8s). On final failure, calls onData([])
 * so the app can degrade gracefully.
 */
export function subscribeToStockLevels(
  callbacks: StockLevelListenerCallbacks,
): Unsubscribe {
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let currentUnsubscribe: Unsubscribe | null = null;
  let tornDown = false;

  function startListener() {
    const db = getFirestoreDb();
    const ref = collection(db, 'stockLevels');

    currentUnsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        // Reset retry counter on successful data
        retryCount = 0;
        const levels = snapshot.docs
          .map(d => validateStockLevel(d.id, d.data()))
          .filter((l): l is StockLevel => l !== null);
        callbacks.onData(levels);
      },
      (error) => {
        if (tornDown) return;

        if (retryCount < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
          retryCount++;
          console.warn(
            `[stockLevels] Snapshot error (attempt ${retryCount}/${MAX_RETRIES}), retrying in ${delay}ms:`,
            error.message,
          );
          callbacks.onError(error.message ?? 'שגיאה בהאזנה למלאי');
          retryTimer = setTimeout(() => {
            if (!tornDown) startListener();
          }, delay);
        } else {
          // Final failure — degrade gracefully
          console.error(
            `[stockLevels] All ${MAX_RETRIES} retries exhausted. Falling back to empty data.`,
            error.message,
          );
          callbacks.onError(error.message ?? 'שגיאה בהאזנה למלאי');
          callbacks.onData([]);
        }
      },
    );
  }

  startListener();

  // Return a teardown function that cleans up everything
  return () => {
    tornDown = true;
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
    }
  };
}
