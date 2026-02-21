// generateId — uses crypto.randomUUID() (available in all modern browsers + Node 14.17+)
// Falls back to the Lovable-style timestamp+random pattern for environments without crypto.

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback (same approach as original Lovable storage.ts)
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
