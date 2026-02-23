// Access Requests — Firestore-backed module for managing user access requests.
// Guests submit requests; managers approve/decline via email links.

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase/config';

const COLLECTION = 'accessRequests';

export type RequestStatus = 'pending' | 'approved' | 'declined';

export interface AccessRequest {
  id: string;
  email: string;
  name: string;
  status: RequestStatus;
  token: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a new access request. Returns the created request (with token). */
export async function createAccessRequest(
  email: string,
  name: string,
): Promise<AccessRequest> {
  const db = getFirestoreDb();
  const request: AccessRequest = {
    id: generateId(),
    email: email.trim().toLowerCase(),
    name: name.trim(),
    status: 'pending',
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, COLLECTION, request.id), request);
  return request;
}

/** Get an access request by ID. */
export async function getAccessRequest(id: string): Promise<AccessRequest | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return snap.data() as AccessRequest;
}

/** Check if a given email has an approved access request. */
export async function getApprovedRequest(email: string): Promise<AccessRequest | null> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTION),
    where('email', '==', email.trim().toLowerCase()),
    where('status', '==', 'approved'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as AccessRequest;
}

/** Check if a given email already has a pending request. */
export async function getPendingRequest(email: string): Promise<AccessRequest | null> {
  const db = getFirestoreDb();
  const q = query(
    collection(db, COLLECTION),
    where('email', '==', email.trim().toLowerCase()),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as AccessRequest;
}

/** Approve or decline an access request. Validates the token. */
export async function reviewAccessRequest(
  requestId: string,
  token: string,
  action: 'approved' | 'declined',
  reviewerEmail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const request = await getAccessRequest(requestId);
  if (!request) return { ok: false, error: 'בקשה לא נמצאה' };
  if (request.token !== token) return { ok: false, error: 'טוקן לא תקין' };
  if (request.status !== 'pending') return { ok: false, error: `הבקשה כבר טופלה (${request.status})` };

  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, requestId), {
    status: action,
    reviewedBy: reviewerEmail,
    reviewedAt: new Date().toISOString(),
  });
  return { ok: true };
}
