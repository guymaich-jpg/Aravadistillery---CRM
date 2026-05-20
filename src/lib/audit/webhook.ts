import type { AuditLogEntry } from './types';

export async function sendToWebhook(url: string, entry: AuditLogEntry): Promise<void> {
  const body = JSON.stringify(entry);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    await new Promise(r => setTimeout(r, 2000));
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    } catch {
      // Best-effort — Firestore audit_log is the reliable backup
    }
  }
}
