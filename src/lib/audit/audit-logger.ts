import { doc, setDoc, collection } from 'firebase/firestore';
import { getFirestoreDb, getFirebaseAuth, hasFirebaseConfig } from '../firebase/config';
import { generateId } from '../id';
import { sendToWebhook } from './webhook';
import type { AuditLogEntry } from './types';

const AUDIT_COLLECTION = 'audit_log';

export class AuditLogger {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_BACKUP_WEBHOOK_URL || undefined;
  }

  isEnabled(): boolean {
    return hasFirebaseConfig();
  }

  log(partial: Omit<AuditLogEntry, 'id' | 'timestamp' | 'source' | 'userEmail'>): void {
    if (!this.isEnabled()) return;

    const entry: AuditLogEntry = {
      ...partial,
      id: generateId(),
      timestamp: new Date().toISOString(),
      userEmail: this.getCurrentUserEmail(),
      source: 'crm',
    };

    const firestoreWrite = this.writeToFirestore(entry);
    const webhookWrite = this.webhookUrl
      ? sendToWebhook(this.webhookUrl, entry)
      : Promise.resolve();

    Promise.all([firestoreWrite, webhookWrite]).catch(() => {});
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
    } catch {
      // Fire-and-forget — primary write already succeeded
    }
  }
}
