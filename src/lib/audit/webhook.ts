import type { AuditLogEntry } from './types';

function debugLog(msg: string): void {
  try {
    const prev = localStorage.getItem('__audit_debug__') ?? '';
    const ts = new Date().toISOString().slice(11, 23);
    localStorage.setItem('__audit_debug__', `${ts} ${msg}\n${prev}`.slice(0, 2000));
  } catch { /* ignore */ }
}

export async function sendToWebhook(url: string, entry: AuditLogEntry): Promise<void> {
  const body = JSON.stringify(entry);
  const opts: RequestInit = { method: 'POST', body };
  try {
    const res = await fetch(url, opts);
    debugLog(`webhook ${res.status} ${res.ok ? 'OK' : 'FAIL'}`);
  } catch (e) {
    debugLog(`webhook ERR: ${e}`);
    await new Promise(r => setTimeout(r, 2000));
    try {
      await fetch(url, opts);
      debugLog('webhook retry OK');
    } catch (e2) {
      debugLog(`webhook retry ERR: ${e2}`);
    }
  }
}
