import { doc, setDoc, collection } from 'firebase/firestore';
import { getFirestoreDb, getFirebaseAuth, hasFirebaseConfig } from '../firebase/config';
import { generateId } from '../id';
import { sendToWebhook } from './webhook';
import type { AuditLogEntry } from './types';

const AUDIT_COLLECTION = 'audit_log';
const DEBUG_KEY = '__audit_debug__';

function debugLog(msg: string): void {
  try {
    const prev = localStorage.getItem(DEBUG_KEY) ?? '';
    const ts = new Date().toISOString().slice(11, 23);
    localStorage.setItem(DEBUG_KEY, `${ts} ${msg}\n${prev}`.slice(0, 2000));
  } catch { /* ignore */ }
}

export class AuditLogger {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_BACKUP_WEBHOOK_URL || undefined;
    debugLog(`init enabled=${hasFirebaseConfig()} webhook=${!!this.webhookUrl}`);
  }

  isEnabled(): boolean {
    return hasFirebaseConfig();
  }

  log(partial: Omit<AuditLogEntry, 'id' | 'timestamp' | 'source' | 'userEmail'>): void {
    if (!this.isEnabled()) {
      debugLog('skip: not enabled');
      return;
    }

    const entry: AuditLogEntry = {
      ...partial,
      id: generateId(),
      timestamp: new Date().toISOString(),
      userEmail: this.getCurrentUserEmail(),
      source: 'crm',
    };

    debugLog(`log ${entry.action} ${entry.collection} ${entry.recordId}`);

    const firestoreWrite = this.writeToFirestore(entry);
    const webhookWrite = this.webhookUrl
      ? sendToWebhook(this.webhookUrl, entry)
      : Promise.resolve();

    Promise.all([firestoreWrite, webhookWrite]).catch((e) => {
      debugLog(`promise.all error: ${e}`);
    });
  }

  private getCurrentUserEmail(): string {
    try {
      return getFirebaseAuth().currentUser?.email ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async writeToFirestore(entry: AuditLogEntry): Promise<void> {
    try {
      const db = getFirestoreDb();
      const ref = doc(collection(db, AUDIT_COLLECTION), entry.id);
      const clean = JSON.parse(JSON.stringify(entry));
      await setDoc(ref, clean);
      debugLog(`firestore OK ${entry.id}`);
    } catch (e) {
      debugLog(`firestore ERR: ${e}`);
    }
  }
}
