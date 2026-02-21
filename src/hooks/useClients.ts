// useClients — client-domain hook built on top of CRMContext.
// Adds local search and status-filter state; exposes only client-relevant API.

import { useMemo, useState } from 'react';
import { useCRM } from '@/store/CRMContext';
import type { Client, ClientStatus } from '@/types/crm';

export type ClientStatusFilter = ClientStatus | 'all';

export interface UseClientsReturn {
  /** Raw list of all clients (including soft-deleted) from context */
  clients: Client[];
  /** Clients after applying searchQuery and statusFilter (never soft-deleted) */
  filteredClients: Client[];
  /** Add a new client */
  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  /** Update an existing client by id */
  updateClient: (id: string, partial: Partial<Client>) => Promise<void>;
  /** Soft-delete a client by id */
  deleteClient: (id: string) => Promise<void>;
  /** Current search string (matches name, company, phone) */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** 'all' or a specific ClientStatus value */
  statusFilter: ClientStatusFilter;
  setStatusFilter: (f: ClientStatusFilter) => void;
}

export function useClients(): UseClientsReturn {
  const { clients, addClient, updateClient, deleteClient, getActiveClients } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>('all');

  const filteredClients = useMemo<Client[]>(() => {
    // Start with active (non-deleted) clients
    let result = getActiveClients();

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Apply search query — match against name, company and phone
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      );
    }

    return result;
  }, [getActiveClients, statusFilter, searchQuery]);

  return {
    clients,
    filteredClients,
    addClient,
    updateClient,
    deleteClient,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  };
}
