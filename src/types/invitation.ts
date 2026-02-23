export type InvitationStatus = 'pending' | 'used' | 'revoked';

export interface Invitation {
  token: string;
  email: string;
  status: InvitationStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}
