// Manager identification — reads a comma-separated allowlist from env.
// Used to conditionally show the Management tab and gate invitation creation.

const MANAGER_EMAILS: string[] = (import.meta.env.VITE_MANAGER_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isManager(email: string): boolean {
  return MANAGER_EMAILS.includes(email.trim().toLowerCase());
}
