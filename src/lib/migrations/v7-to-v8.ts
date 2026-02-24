// v7 → v8 migration: rename Client.name → businessName, remove Client.company,
// add contactPerson, area, clientType fields with sensible defaults.

import { type LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';
import { hasFirebaseConfig } from '../firebase/config';
import type { Client } from '@/types/crm';

export async function migrateV7ToV8(_adapter: LocalStorageAdapter): Promise<void> {
  // 1. Migrate localStorage clients
  try {
    const raw = localStorage.getItem(KEYS.CLIENTS);
    if (raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clients: any[] = JSON.parse(raw);
      const migrated: Client[] = clients.map((c) => ({
        id: c.id,
        businessName: c.businessName ?? c.name ?? c.company ?? '',
        contactPerson: c.contactPerson ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        address: c.address ?? '',
        area: c.area ?? '',
        clientType: c.clientType ?? 'business',
        status: c.status ?? 'active',
        tags: c.tags ?? [],
        notes: c.notes ?? '',
        createdAt: c.createdAt,
        ...(c.deletedAt ? { deletedAt: c.deletedAt } : {}),
      }));
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(migrated));
    }
  } catch (e) {
    console.warn('v7→v8: could not migrate localStorage clients:', e);
  }

  // 2. Migrate Firestore clients if configured
  if (hasFirebaseConfig()) {
    try {
      const { getFirestoreDb } = await import('../firebase/config');
      const { collection, getDocs, setDoc, doc } = await import('firebase/firestore');
      const db = getFirestoreDb();
      const snap = await getDocs(collection(db, 'clients'));

      for (const d of snap.docs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = d.data() as any;
        // Only migrate if the old fields exist
        if (c.name !== undefined || c.company !== undefined) {
          const updated = {
            ...c,
            businessName: c.businessName ?? c.name ?? c.company ?? '',
            contactPerson: c.contactPerson ?? '',
            area: c.area ?? '',
            clientType: c.clientType ?? 'business',
          };
          delete updated.name;
          delete updated.company;
          await setDoc(doc(db, 'clients', d.id), updated);
        }
      }
    } catch (e) {
      console.warn('v7→v8: could not migrate Firestore clients:', e);
    }
  }
}
