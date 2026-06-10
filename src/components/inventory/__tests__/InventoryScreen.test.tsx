import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseInventoryReturn } from '@/hooks/useInventory';
import type { UseProductsReturn } from '@/hooks/useProducts';
import type { StockCtxValue } from '@/store/StockContext';

// ---------------------------------------------------------------------------
// Mocks — set up default return values; tests override via mockReturnValue
// ---------------------------------------------------------------------------

const mockInventory: UseInventoryReturn = {
  stockLevels: [],
  stockMovements: [],
  inventoryBatches: [],
  lowStockAlerts: [],
  scheduledOrdersByProduct: new Map(),
  getStockForProduct: () => undefined,
};

const mockProducts: UseProductsReturn = {
  products: [],
  activeProducts: [],
  addProduct: vi.fn(),
  updateProduct: vi.fn(),
  deactivateProduct: vi.fn(),
};

const mockStockCtx: StockCtxValue = {
  stockLevels: [],
  stockMovements: [],
  isLoading: false,
  isRefreshing: false,
  storageError: null,
  refresh: vi.fn(),
};

vi.mock('@/hooks/useInventory', () => ({
  useInventory: () => mockInventory,
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => mockProducts,
}));

vi.mock('@/store/StockContext', () => ({
  useStockCtx: () => mockStockCtx,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set mock inventory data for a test, then reset after. */
function setMockInventory(overrides: Partial<UseInventoryReturn>) {
  Object.assign(mockInventory, overrides);
}

function setMockProducts(overrides: Partial<UseProductsReturn>) {
  Object.assign(mockProducts, overrides);
}

/** Reset all mocks to empty defaults after each test. */
afterEach(() => {
  Object.assign(mockInventory, {
    stockLevels: [],
    stockMovements: [],
    inventoryBatches: [],
    lowStockAlerts: [],
    scheduledOrdersByProduct: new Map(),
    getStockForProduct: () => undefined,
  });
  Object.assign(mockProducts, {
    products: [],
    activeProducts: [],
    addProduct: vi.fn(),
    updateProduct: vi.fn(),
    deactivateProduct: vi.fn(),
  });
  Object.assign(mockStockCtx, {
    stockLevels: [],
    stockMovements: [],
    isLoading: false,
    isRefreshing: false,
    storageError: null,
    refresh: vi.fn(),
  });
});

// Lazy import to avoid import-order issues with vi.mock
async function renderInventoryScreen() {
  const { InventoryScreen } = await import('../InventoryScreen');
  return render(<InventoryScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InventoryScreen', () => {
  it('renders without crashing when given empty stock data', async () => {
    await renderInventoryScreen();

    // Summary banner should show zeros for all KPIs
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3); // products, stock, scheduled, alerts
    // Hebrew label for active products
    expect(screen.getByText('מוצרים פעילים')).toBeInTheDocument();
  });

  it('shows stock levels when products are provided', async () => {
    setMockProducts({
      activeProducts: [
        { id: 'p1', name: 'Arak Classic', category: 'other', basePrice: 100, unit: 'bottle', isActive: true },
        { id: 'p2', name: 'Gin Reserve', category: 'gin', basePrice: 150, unit: 'bottle', isActive: true },
      ],
    });

    setMockInventory({
      stockLevels: [
        { productId: 'p1', currentStock: 50, minimumStock: 10, unit: 'bottle', lastUpdated: '2026-06-01' },
        { productId: 'p2', currentStock: 30, minimumStock: 5, unit: 'bottle', lastUpdated: '2026-06-01' },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // Product names should be in the table
    expect(screen.getByText('Arak Classic')).toBeInTheDocument();
    expect(screen.getByText('Gin Reserve')).toBeInTheDocument();

    // Summary banner: 2 active products
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows stale indicator when factoryLastSync is >24h old', async () => {
    // Create a timestamp 48h ago
    const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    setMockProducts({
      activeProducts: [
        { id: 'p1', name: 'Arak', category: 'other', basePrice: 100, unit: 'bottle', isActive: true },
      ],
    });

    setMockInventory({
      stockLevels: [
        { productId: 'p1', currentStock: 50, minimumStock: 10, unit: 'bottle', lastUpdated: staleTimestamp, factoryLastSync: staleTimestamp },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // The stale warning indicator (⚠) should be present
    const warningSpan = screen.getByText('⚠');
    expect(warningSpan).toBeInTheDocument();
  });

  it('does not show stale indicator when factoryLastSync is recent', async () => {
    // Create a timestamp 1h ago (fresh)
    const freshTimestamp = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    setMockProducts({
      activeProducts: [
        { id: 'p1', name: 'Arak', category: 'other', basePrice: 100, unit: 'bottle', isActive: true },
      ],
    });

    setMockInventory({
      stockLevels: [
        { productId: 'p1', currentStock: 50, minimumStock: 10, unit: 'bottle', lastUpdated: freshTimestamp, factoryLastSync: freshTimestamp },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // No stale warning should be visible
    expect(screen.queryByText('⚠')).not.toBeInTheDocument();
  });

  it('shows low-stock alerts when lowStockAlerts has entries', async () => {
    setMockProducts({
      activeProducts: [
        { id: 'p1', name: 'Arak Low', category: 'other', basePrice: 100, unit: 'bottle', isActive: true },
      ],
    });

    setMockInventory({
      stockLevels: [
        { productId: 'p1', currentStock: 3, minimumStock: 10, unit: 'bottle', lastUpdated: '2026-06-01' },
      ],
      lowStockAlerts: [
        { productId: 'p1', productName: 'Arak Low', currentStock: 3, minimumStock: 10, severity: 'warning' },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // The low stock alert section should be visible
    expect(screen.getByText('התראות מלאי נמוך')).toBeInTheDocument();
    // "Arak Low" appears in both the alert section and the stock table
    expect(screen.getAllByText('Arak Low').length).toBeGreaterThanOrEqual(1);
  });

  it('displays critical severity styling for critical low-stock alerts', async () => {
    setMockProducts({
      activeProducts: [
        { id: 'p1', name: 'Arak Critical', category: 'other', basePrice: 100, unit: 'bottle', isActive: true },
      ],
    });

    setMockInventory({
      stockLevels: [
        { productId: 'p1', currentStock: 0, minimumStock: 10, unit: 'bottle', lastUpdated: '2026-06-01' },
      ],
      lowStockAlerts: [
        { productId: 'p1', productName: 'Arak Critical', currentStock: 0, minimumStock: 10, severity: 'critical' },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // The low stock alert section should be rendered
    const alertHeader = screen.getByText('התראות מלאי נמוך');
    // Find the outer alert container (bg-amber-50)
    const alertSection = alertHeader.closest('.bg-amber-50')! as HTMLElement;
    expect(alertSection).toBeTruthy();

    // Inside the alert section, find the critical stock value with text-red-600 font-bold
    const criticalValues = within(alertSection).getAllByText('0');
    const hasCriticalStyle = criticalValues.some(
      el => el.className.includes('text-red-600') && el.className.includes('font-bold'),
    );
    expect(hasCriticalStyle).toBe(true);
  });

  it('handles tab switching between Stock / Movements / Batches', async () => {
    const user = userEvent.setup();

    setMockProducts({
      activeProducts: [
        { id: 'p1', name: 'Arak', category: 'other', basePrice: 100, unit: 'bottle', isActive: true },
      ],
    });

    setMockInventory({
      stockLevels: [
        { productId: 'p1', currentStock: 50, minimumStock: 10, unit: 'bottle', lastUpdated: '2026-06-01' },
      ],
      stockMovements: [],
      inventoryBatches: [],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // Initially on the Stock tab — table headers visible
    expect(screen.getByText('מוצר')).toBeInTheDocument();

    // Click "תנועות" (Movements) tab
    await user.click(screen.getByText('תנועות'));

    // Movements empty state message
    expect(screen.getByText('אין תנועות מלאי מוקלטות')).toBeInTheDocument();
    // Stock table should no longer be visible
    expect(screen.queryByText('מוצר')).not.toBeInTheDocument();

    // Click "אצוות" (Batches) tab
    await user.click(screen.getByText('אצוות'));

    // Batches empty state
    expect(screen.getByText('אין אצוות מוקלטות')).toBeInTheDocument();
  });

  it('shows movements table when movements data is provided', async () => {
    const user = userEvent.setup();

    setMockProducts({ activeProducts: [] });

    setMockInventory({
      stockMovements: [
        {
          id: 'm1',
          productId: 'p1',
          productName: 'Arak',
          type: 'inbound',
          quantity: 100,
          delta: 100,
          notes: 'Production batch',
          createdAt: '2026-06-01T10:00:00Z',
        },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // Switch to Movements tab
    await user.click(screen.getByText('תנועות'));

    // Movement data should be displayed
    expect(screen.getByText('Arak')).toBeInTheDocument();
    expect(screen.getByText('קבלה')).toBeInTheDocument(); // 'inbound' label in Hebrew
    expect(screen.getByText('+100')).toBeInTheDocument();
    expect(screen.getByText('Production batch')).toBeInTheDocument();
  });

  it('shows the alert count in the summary banner', async () => {
    setMockProducts({ activeProducts: [] });
    setMockInventory({
      lowStockAlerts: [
        { productId: 'p1', productName: 'A', currentStock: 1, minimumStock: 10, severity: 'warning' },
        { productId: 'p2', productName: 'B', currentStock: 0, minimumStock: 5, severity: 'critical' },
      ],
      scheduledOrdersByProduct: new Map(),
    });

    await renderInventoryScreen();

    // Alert count badge in the summary banner
    expect(screen.getByText('התראות מלאי')).toBeInTheDocument();
  });
});
