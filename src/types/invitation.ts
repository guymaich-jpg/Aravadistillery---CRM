export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface Invitation {
  token: string;
  email: string;
  status: InvitationStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  userName?: string;       // set when the invited user registers
}
