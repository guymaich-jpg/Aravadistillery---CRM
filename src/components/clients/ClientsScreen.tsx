import { useState, useMemo } from 'react';
import { UserPlus, Download, Upload, Pencil, Trash2 } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientAnalytics } from '@/hooks/useClientAnalytics';
import { ClientDialog } from './ClientDialog';
import { ImportClientsDialog } from './ImportClientsDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { exportClientsToCSV } from '@/lib/csv';
import type { Client, ClientStatus } from '@/types/crm';

const STATUS_OPTIONS: { value: 'all' | ClientStatus; label: string }[] = [
  { value: 'all', label: 'כל הסטטוסים' },
  { value: 'active', label: CLIENT_STATUS_LABELS.active },
  { value: 'prospect', label: CLIENT_STATUS_LABELS.prospect },
  { value: 'inactive', label: CLIENT_STATUS_LABELS.inactive },
];

export function ClientsScreen() {
  const {
    clients,
    filteredClients,
    addClient,
    bulkAddClients,
    updateClient,
    deleteClient,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useClients();

  const allAnalytics = useClientAnalytics();

  // Join analytics with filtered clients for table rows
  const tableRows = useMemo(() => {
    const analyticsMap = new Map(allAnalytics.map((r) => [r.clientId, r]));
    return filteredClients.map((client, idx) => ({
      client,
      index: idx + 1,
      analytics: analyticsMap.get(client.id),
    }));
  }, [filteredClients, allAnalytics]);

  // KPI totals — computed from ALL active (non-deleted) clients
  const kpi = useMemo(() => {
    const activeIds = new Set(clients.filter((c) => !c.deletedAt).map((c) => c.id));
    const activeRows = allAnalytics.filter((r) => activeIds.has(r.clientId));
    return {
      totalClients: activeIds.size,
      totalRevenue: activeRows.reduce((s, r) => s + r.totalRevenue, 0),
      outstandingBalance: activeRows.reduce((s, r) => s + r.outstandingBalance, 0),
    };
  }, [clients, allAnalytics]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [deletingClient, setDeletingClient] = useState<Client | undefined>();

  function openAdd() {
    setEditingClient(undefined);
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setDialogOpen(true);
  }

  async function handleSubmit(data: Omit<Client, 'id' | 'createdAt'>) {
    if (editingClient) {
      await updateClient(editingClient.id, data);
    } else {
      await addClient(data);
    }
  }

  async function handleDelete() {
    if (!deletingClient) return;
    await deleteClient(deletingClient.id);
    setDeletingClient(undefined);
  }

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5">

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-[#252525]">{kpi.totalClients}</p>
          <p className="text-xs text-[#716a56] mt-1 font-medium">סה״כ לקוחות</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(kpi.totalRevenue)}</p>
          <p className="text-xs text-[#716a56] mt-1 font-medium">סה״כ מכירות</p>
        </div>
        <div
          className={[
            'rounded-xl border shadow-sm p-4 text-center',
            kpi.outstandingBalance > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-gray-200',
          ].join(' ')}
        >
          <p className={`text-2xl font-bold ${kpi.outstandingBalance > 0 ? 'text-red-600' : 'text-[#252525]'}`}>
            {formatCurrency(kpi.outstandingBalance)}
          </p>
          <p className="text-xs text-[#716a56] mt-1 font-medium">יתרות לגבייה</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="חיפוש לפי שם, חברה, טלפון…"
          className="flex-1 min-w-[200px]"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ClientStatus)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-[#252525] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={() => exportClientsToCSV(clients)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-[#252525] transition-colors whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          ייצא CSV
        </button>

        <button
          onClick={() => setImportDialogOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-[#252525] transition-colors whitespace-nowrap"
        >
          <Upload className="h-4 w-4" />
          ייבא CSV
        </button>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2c332f] rounded-lg hover:bg-[#1e2420] active:scale-95 transition-all shadow-sm whitespace-nowrap"
        >
          <UserPlus className="h-4 w-4" />
          לקוח חדש
        </button>
      </div>

      {/* Clients table */}
      {tableRows.length === 0 ? (
        <EmptyState
          icon="👥"
          title="אין לקוחות"
          description={searchQuery ? 'לא נמצאו לקוחות התואמים לחיפוש' : 'הוסף את הלקוח הראשון'}
          action={!searchQuery ? { label: 'לקוח חדש', onClick: openAdd } : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <span className="text-xs text-[#716a56]">{tableRows.length} לקוחות</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#716a56] w-10">#</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[#716a56]">שם</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[#716a56]">חברה</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#716a56]">סטטוס</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#716a56]">סה״כ מכירות</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#716a56]">הזמנות</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#716a56]">יתרה</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-[#716a56]">הערות</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-[#716a56] w-20">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ client, index, analytics }) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-[#efefec]/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[#716a56]">{index}</td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="font-semibold text-[#252525]">{client.name}</p>
                        {client.phone && (
                          <p className="text-xs text-[#716a56] mt-0.5">{client.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-[#252525]">
                      {client.company || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge
                        label={CLIENT_STATUS_LABELS[client.status]}
                        colorClass={CLIENT_STATUS_COLORS[client.status]}
                      />
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-amber-700">
                      {analytics ? formatCurrency(analytics.totalRevenue) : '—'}
                    </td>
                    <td className="px-3 py-3 text-center text-[#252525]">
                      {analytics?.orderCount ?? 0}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {analytics && analytics.outstandingBalance > 0 ? (
                        <span className="text-red-600 font-medium text-xs">
                          {formatCurrency(analytics.outstandingBalance)}
                        </span>
                      ) : (
                        <span className="text-green-600 text-sm">✓</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#716a56] max-w-[140px]">
                      <span className="line-clamp-1">{client.notes || '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 rounded text-[#716a56] hover:text-[#2c332f] hover:bg-gray-100 transition-colors"
                          title="עריכה"
                          aria-label={`ערוך ${client.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingClient(client)}
                          className="p-1.5 rounded text-[#716a56] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="מחיקה"
                          aria-label={`מחק ${client.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editingClient}
        onSubmit={handleSubmit}
      />

      <ImportClientsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={bulkAddClients}
      />

      <ConfirmDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(undefined)}
        title="מחיקת לקוח"
        description={`האם למחוק את הלקוח "${deletingClient?.name}"? הפעולה אינה הפיכה.`}
        confirmLabel="מחק לקוח"
        onConfirm={handleDelete}
      />
    </div>
  );
}
