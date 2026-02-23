// Invitation CRUD — Firestore-backed module for managing user invitations.
// Token is used as the document ID for fast direct lookups.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase/config';
import { generateId } from './id';
import type { Invitation } from '@/types/invitation';

const COLLECTION = 'invitations';
const INVITE_TTL_DAYS = 7;

export async function createInvitation(
  email: string,
  createdBy: string,
): Promise<Invitation> {
  const db = getFirestoreDb();
  const token = generateId();
  const now = new Date();
  const expires = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation: Invitation = {
    token,
    email: email.trim().toLowerCase(),
    status: 'pending',
    createdBy,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  await setDoc(doc(db, COLLECTION, token), invitation);
  return invitation;
}

export async function getInvitation(token: string): Promise<Invitation | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, COLLECTION, token));
  if (!snap.exists()) return null;
  return snap.data() as Invitation;
}

export async function validateInvitation(
  token: string,
): Promise<{ valid: true; invitation: Invitation } | { valid: false; reason: string }> {
  const invitation = await getInvitation(token);
  if (!invitation) return { valid: false, reason: 'הזמנה לא נמצאה.' };
  if (invitation.status === 'used') return { valid: false, reason: 'ההזמנה כבר מומשה.' };
  if (invitation.status === 'revoked') return { valid: false, reason: 'ההזמנה בוטלה.' };
  if (new Date(invitation.expiresAt) < new Date()) return { valid: false, reason: 'ההזמנה פגה.' };
  return { valid: true, invitation };
}

export async function markInvitationUsed(token: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, token), {
    status: 'used',
    usedAt: new Date().toISOString(),
  });
}

export async function revokeInvitation(token: string): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, token), { status: 'revoked' });
}

export async function listInvitations(): Promise<Invitation[]> {
  const db = getFirestoreDb();
  const snap = await getDocs(collection(db, COLLECTION));
  const items = snap.docs.map(d => d.data() as Invitation);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildInviteUrl(token: string): string {
  const base = window.location.origin + (import.meta.env.BASE_URL || '/');
  return `${base}?invite=${token}`;
}
