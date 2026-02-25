import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { ClientsProvider, useClientsCtx } from '../ClientsContext';
import { ProductsProvider, useProductsCtx } from '../ProductsContext';
import { StockProvider, useStockCtx } from '../StockContext';
import { OrdersProvider, useOrdersCtx } from '../OrdersContext';
import { InventoryBatchProvider, useBatchCtx } from '../InventoryBatchContext';
import { KEYS } from '@/lib/storage/localStorage.adapter';

// ---------------------------------------------------------------------------
// 1. ClientsProvider — loads clients from storage
// ---------------------------------------------------------------------------

describe('ClientsProvider', () => {
  it('loads clients from storage', async () => {
    localStorage.setItem(
      KEYS.CLIENTS,
      JSON.stringify([
        {
          id: 'c1',
          businessName: 'Test',
          contactPerson: '',
          phone: '050',
          email: '',
          address: '',
          area: '',
          clientType: 'business',
          status: 'active',
          tags: [],
          notes: '',
          createdAt: '2025-01-01',
        },
      ]),
    );

    const { result } = renderHook(() => useClientsCtx(), {
      wrapper: ClientsProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].id).toBe('c1');
    expect(result.current.clients[0].businessName).toBe('Test');
  });

  // -------------------------------------------------------------------------
  // 2. ClientsProvider — addClient adds to state
  // -------------------------------------------------------------------------

  it('addClient adds to state', async () => {
    const { result } = renderHook(() => useClientsCtx(), {
      wrapper: ClientsProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addClient({
        businessName: 'New Biz',
        contactPerson: 'Alice',
        phone: '054',
        email: 'a@b.com',
        address: '123 Main',
        area: 'north',
        clientType: 'business',
        status: 'active',
        tags: [],
        notes: '',
      });
    });

    expect(result.current.clients).toHaveLength(1);
    expect(result.current.clients[0].businessName).toBe('New Biz');
    expect(result.current.clients[0].id).toBeDefined();
    expect(result.current.clients[0].createdAt).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 3. ClientsProvider — getActiveClients excludes soft-deleted
  // -------------------------------------------------------------------------

  it('getActiveClients excludes soft-deleted clients', async () => {
    localStorage.setItem(
      KEYS.CLIENTS,
      JSON.stringify([
        {
          id: 'a1',
          businessName: 'Active',
          contactPerson: '',
          phone: '050',
          email: '',
          address: '',
          area: '',
          clientType: 'business',
          status: 'active',
          tags: [],
          notes: '',
          createdAt: '2025-01-01',
        },
        {
          id: 'a2',
          businessName: 'Deleted',
          contactPerson: '',
          phone: '051',
          email: '',
          address: '',
          area: '',
          clientType: 'business',
          status: 'active',
          tags: [],
          notes: '',
          createdAt: '2025-01-01',
          deletedAt: '2025-06-01',
        },
      ]),
    );

    const { result } = renderHook(() => useClientsCtx(), {
      wrapper: ClientsProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clients).toHaveLength(2);
    expect(result.current.getActiveClients()).toHaveLength(1);
    expect(result.current.getActiveClients()[0].id).toBe('a1');
  });
});

// ---------------------------------------------------------------------------
// 4. ProductsProvider — loads products from storage
// ---------------------------------------------------------------------------

describe('ProductsProvider', () => {
  it('loads products from storage', async () => {
    localStorage.setItem(
      KEYS.PRODUCTS,
      JSON.stringify([
        {
          id: 'p1',
          name: 'Arak',
          category: 'other',
          basePrice: 100,
          unit: 'bottle',
          isActive: true,
        },
      ]),
    );

    const { result } = renderHook(() => useProductsCtx(), {
      wrapper: ProductsProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].name).toBe('Arak');
  });
});

// ---------------------------------------------------------------------------
// 5. StockProvider — adjustStock creates movement and level
// ---------------------------------------------------------------------------

describe('StockProvider', () => {
  it('adjustStock creates movement and level', async () => {
    const { result } = renderHook(() => useStockCtx(), {
      wrapper: StockProvider,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.adjustStock('p1', 10, 'inbound', 'Test Product');
    });

    expect(result.current.stockMovements).toHaveLength(1);
    expect(result.current.stockMovements[0].productId).toBe('p1');
    expect(result.current.stockMovements[0].delta).toBe(10);
    expect(result.current.stockMovements[0].type).toBe('inbound');

    const level = result.current.stockLevels.find(l => l.productId === 'p1');
    expect(level).toBeDefined();
    expect(level!.currentStock).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 6. OrdersProvider — addOrder creates order and stock movements
// ---------------------------------------------------------------------------

describe('OrdersProvider', () => {
  it('addOrder creates order and stock movements', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StockProvider>
        <OrdersProvider>{children}</OrdersProvider>
      </StockProvider>
    );

    const { result } = renderHook(() => useOrdersCtx(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addOrder({
        clientId: 'c1',
        clientName: 'Test Client',
        items: [
          {
            productId: 'p1',
            productName: 'Arak',
            quantity: 2,
            unitPrice: 100,
            discount: 0,
            total: 200,
          },
        ],
        subtotal: 200,
        totalDiscount: 0,
        total: 200,
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        amountPaid: 0,
        notes: '',
      });
    });

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].clientId).toBe('c1');
    expect(result.current.orders[0].items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 7. useCRM backward compatibility — returns all domain data
// ---------------------------------------------------------------------------

describe('useCRM backward compatibility', () => {
  it('returns all domain data', async () => {
    // Lazy import to avoid pulling in the hook at module scope
    const { useCRM } = await import('@/store/CRMContext');

    const AllProviders = ({ children }: { children: React.ReactNode }) => (
      <ClientsProvider>
        <ProductsProvider>
          <StockProvider>
            <OrdersProvider>
              <InventoryBatchProvider>{children}</InventoryBatchProvider>
            </OrdersProvider>
          </StockProvider>
        </ProductsProvider>
      </ClientsProvider>
    );

    const { result } = renderHook(() => useCRM(), { wrapper: AllProviders });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Verify the unified hook surfaces arrays from every domain
    expect(Array.isArray(result.current.clients)).toBe(true);
    expect(Array.isArray(result.current.orders)).toBe(true);
    expect(Array.isArray(result.current.products)).toBe(true);
    expect(Array.isArray(result.current.stockLevels)).toBe(true);
    expect(Array.isArray(result.current.stockMovements)).toBe(true);
    expect(Array.isArray(result.current.inventoryBatches)).toBe(true);

    // Verify methods are present
    expect(typeof result.current.addClient).toBe('function');
    expect(typeof result.current.addOrder).toBe('function');
    expect(typeof result.current.addProduct).toBe('function');
    expect(typeof result.current.adjustStock).toBe('function');
    expect(typeof result.current.addInventoryBatch).toBe('function');
    expect(typeof result.current.getLowStockAlerts).toBe('function');
  });
});
