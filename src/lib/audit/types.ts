export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'save' | 'delete';
  collection: string;
  recordId: string;
  userEmail: string;
  snapshot: Record<string, unknown>;
  source: 'crm';
}
