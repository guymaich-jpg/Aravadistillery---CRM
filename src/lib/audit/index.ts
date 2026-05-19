export { AuditLogger } from './audit-logger';
export type { AuditLogEntry } from './types';

import { AuditLogger } from './audit-logger';

export const auditLogger = new AuditLogger();
