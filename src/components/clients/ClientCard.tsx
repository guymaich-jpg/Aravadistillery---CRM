import { Pencil, Trash2, Phone, Building2 } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from '@/lib/constants';
import type { Client } from '@/types/crm';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{client.name}</h3>
          {client.company && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              {client.company}
            </p>
          )}
        </div>
        <StatusBadge
          label={CLIENT_STATUS_LABELS[client.status]}
          colorClass={CLIENT_STATUS_COLORS[client.status]}
        />
      </div>

      {client.phone && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
          <Phone className="h-3 w-3" />
          <span dir="ltr">{client.phone}</span>
        </p>
      )}

      {client.notes && (
        <p className="text-xs text-gray-400 italic line-clamp-2 mb-3">{client.notes}</p>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-50">
        <button
          onClick={() => onEdit(client)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 transition-colors px-2 py-1 rounded hover:bg-amber-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          עריכה
        </button>
        <button
          onClick={() => onDelete(client)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          מחיקה
        </button>
      </div>
    </div>
  );
}
