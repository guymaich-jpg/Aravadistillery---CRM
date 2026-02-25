// RootProvider — outermost wrapper for the Arava Distillery CRM app.
// Runs schema migrations on mount BEFORE rendering the domain providers.
//
// Provider nesting order:
//   Migrations → Clients → Products → Stock → Orders → InventoryBatch → children
// OrdersProvider and InventoryBatchProvider must be inside StockProvider
// because their methods depend on stock adjustment operations.

import React, { useEffect, useState } from 'react';
import { ClientsProvider } from './ClientsContext';
import { ProductsProvider } from './ProductsContext';
import { StockProvider } from './StockContext';
import { OrdersProvider } from './OrdersContext';
import { InventoryBatchProvider } from './InventoryBatchContext';
import { runMigrations } from '@/lib/migrations';
import { LocalStorageAdapter } from '@/lib/storage/localStorage.adapter';

// ── Types ─────────────────────────────────────────────────────────────────────

type MigrationState = 'pending' | 'done' | 'error';

// ── Internal components ───────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div
      role="status"
      aria-label="טוען נתונים"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        fontFamily: 'system-ui, sans-serif',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#c9821a',
          borderRadius: '50%',
          animation: 'crm-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes crm-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
        טוען את מערכת ה-CRM…
      </p>
    </div>
  );
}

interface ErrorCardProps {
  message: string;
}

function ErrorCard({ message }: ErrorCardProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '12px',
        fontFamily: 'system-ui, sans-serif',
        direction: 'rtl',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#dc2626', fontSize: '18px', margin: '0 0 8px' }}>
          שגיאה בהפעלת המערכת
        </h2>
        <p style={{ color: '#7f1d1d', fontSize: '14px', margin: '0 0 16px' }}>
          אירעה שגיאה במהלך עדכון מסד הנתונים. אנא רענן את הדף ונסה שוב.
        </p>
        <code
          style={{
            display: 'block',
            background: '#fee2e2',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#991b1b',
            wordBreak: 'break-all',
          }}
        >
          {message}
        </code>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '8px 20px',
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          רענן דף
        </button>
      </div>
    </div>
  );
}

// ── RootProvider ──────────────────────────────────────────────────────────────

interface RootProviderProps {
  children: React.ReactNode;
}

const migrationAdapter = new LocalStorageAdapter();

export function RootProvider({ children }: RootProviderProps) {
  const [migrationState, setMigrationState] = useState<MigrationState>('pending');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function migrate() {
      try {
        await runMigrations(migrationAdapter);
        if (!cancelled) setMigrationState('done');
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setMigrationError(msg);
          setMigrationState('error');
        }
      }
    }

    migrate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (migrationState === 'pending') {
    return <LoadingSpinner />;
  }

  if (migrationState === 'error') {
    return <ErrorCard message={migrationError ?? 'שגיאה לא ידועה'} />;
  }

  return (
    <ClientsProvider>
      <ProductsProvider>
        <StockProvider>
          <OrdersProvider>
            <InventoryBatchProvider>
              {children}
            </InventoryBatchProvider>
          </OrdersProvider>
        </StockProvider>
      </ProductsProvider>
    </ClientsProvider>
  );
}
