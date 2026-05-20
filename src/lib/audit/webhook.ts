import type { AuditLogEntry } from './types';

export async function sendToWebhook(url: string, entry: AuditLogEntry): Promise<void> {
  const body = JSON.stringify(entry);
  const opts: RequestInit = {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body,
  };
  try {
    await fetch(url, opts);
  } catch {
    await new Promise(r => setTimeout(r, 2000));
    try {
      await fetch(url, opts);
    } catch {
      // Best-effort — Firestore audit_log is the reliable backup
    }
  }
}
