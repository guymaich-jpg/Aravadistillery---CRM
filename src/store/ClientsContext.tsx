// ClientsContext — isolated state + CRUD for the clients collection.
// Components that only need client data subscribe here to avoid re-rendering
// when orders, products, or inventory change.

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Client } from '@/types/crm';
import type { StorageResult } from '@/lib/storage/adapter';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/lib/id';

// ── Context shape ────────────────────────────────────────────────────────────

export interface ClientsCtxValue {
  clients: Client[];
  isLoading: boolean;
  storageError: string | null;
  addClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<void>;
  updateClient(id: string, partial: Partial<Client>): Promise<void>;
  deleteClient(id: string): Promise<void>;
  getActiveClients(): Client[];
}

const ClientsCtx = createContext<ClientsCtxValue | null>(null);

export function useClientsCtx(): ClientsCtxValue {
  const ctx = useContext(ClientsCtx);
  if (!ctx) throw new Error('useClientsCtx must be used inside ClientsProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  function unwrap<T>(result: StorageResult<T>): T | undefined {
    if (result.ok) return result.data;
    setStorageError(result.error);
    return undefined;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await storageAdapter.getClients();
        if (cancelled) return;
        if (result.ok) setClients(result.data);
        else setStorageError(result.error);
      } catch (e) {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : 'שגיאה בטעינת לקוחות');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addClient = useCallback(
    async (data: Omit<Client, 'id' | 'createdAt'>) => {
      const client: Client = { ...data, id: generateId(), createdAt: new Date().toISOString() };
      if (!unwrap(await storageAdapter.saveClient(client))) return;
      setClients(prev => [...prev, client]);
    },
    [],
  );

  const updateClient = useCallback(
    async (id: string, partial: Partial<Client>) => {
      // Use functional updater to avoid stale closure on `clients`
      let found: Client | undefined;
      setClients(prev => {
        found = prev.find(c => c.id === id);
        return prev; // no-op; we just read the value
      });
      if (!found) return;
      const updated: Client = { ...found, ...partial };
      if (!unwrap(await storageAdapter.saveClient(updated))) return;
      setClients(prev => prev.map(c => (c.id === id ? updated : c)));
    },
    [],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (!unwrap(await storageAdapter.deleteClient(id))) return;
      setClients(prev =>
        prev.map(c => (c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c)),
      );
    },
    [],
  );

  const getActiveClients = useCallback(
    (): Client[] => clients.filter(c => !c.deletedAt),
    [clients],
  );

  const value: ClientsCtxValue = {
    clients, isLoading, storageError,
    addClient, updateClient, deleteClient, getActiveClients,
  };

  return <ClientsCtx.Provider value={value}>{children}</ClientsCtx.Provider>;
}
