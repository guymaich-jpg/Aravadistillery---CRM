import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseClientsReturn } from '@/hooks/useClients';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const defaultClients: UseClientsReturn = {
  clients: [],
  filteredClients: [],
  addClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  statusFilter: 'all',
  setStatusFilter: vi.fn(),
};

let mockClients = { ...defaultClients };

vi.mock('@/hooks/useClients', () => ({
  useClients: () => mockClients,
}));

vi.mock('@/hooks/useClientAnalytics', () => ({
  useClientAnalytics: () => [],
}));

// Mock ClientDialog to avoid pulling in Radix dialog internals
vi.mock('../ClientDialog', () => ({
  ClientDialog: () => null,
}));

// Mock ImportWizard (lazy-loaded)
vi.mock('../ImportWizard', () => ({
  ImportWizard: () => null,
}));

// Mock CSV export to avoid side effects
vi.mock('@/lib/csv', () => ({
  exportClientsToCSV: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setMockClients(overrides: Partial<UseClientsReturn>) {
  mockClients = { ...defaultClients, ...overrides };
}

afterEach(() => {
  mockClients = { ...defaultClients };
  vi.clearAllMocks();
});

async function renderClientsScreen() {
  const { ClientsScreen } = await import('../ClientsScreen');
  return render(<ClientsScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClientsScreen', () => {
  it('shows empty state when no clients', async () => {
    setMockClients({ clients: [], filteredClients: [] });
    await renderClientsScreen();

    // Empty state title (Hebrew)
    expect(screen.getByText('אין לקוחות')).toBeInTheDocument();
    // Empty state description
    expect(screen.getByText('הוסף את הלקוח הראשון')).toBeInTheDocument();
  });

  it('shows search-specific empty state when search yields no results', async () => {
    setMockClients({
      clients: [
        {
          id: 'c1',
          businessName: 'Existing Bar',
          contactPerson: 'Dan',
          phone: '054-1234567',
          email: '',
          address: '',
          area: '',
          clientType: 'business',
          status: 'active',
          tags: [],
          notes: '',
          createdAt: '2026-01-01',
        },
      ],
      filteredClients: [],
      searchQuery: 'nonexistent',
    });
    await renderClientsScreen();

    expect(screen.getByText('אין לקוחות')).toBeInTheDocument();
    expect(screen.getByText('לא נמצאו לקוחות התואמים לחיפוש')).toBeInTheDocument();
  });

  it('renders client list when clients are provided', async () => {
    const clients = [
      {
        id: 'c1',
        businessName: 'Bar Mizrachi',
        contactPerson: 'Dan',
        phone: '054-1234567',
        email: 'dan@example.com',
        address: '1 Main St',
        area: 'north',
        clientType: 'business',
        status: 'active' as const,
        tags: [],
        notes: 'Great customer',
        createdAt: '2026-01-01',
      },
      {
        id: 'c2',
        businessName: 'Wine Store',
        contactPerson: 'Sara',
        phone: '050-9876543',
        email: 'sara@example.com',
        address: '2 Second St',
        area: 'center',
        clientType: 'business',
        status: 'prospect' as const,
        tags: [],
        notes: '',
        createdAt: '2026-02-01',
      },
    ];

    setMockClients({
      clients,
      filteredClients: clients,
    });

    await renderClientsScreen();

    // Both client names should appear in the table
    expect(screen.getByText('Bar Mizrachi')).toBeInTheDocument();
    expect(screen.getByText('Wine Store')).toBeInTheDocument();
    // Contact persons
    expect(screen.getByText('Dan')).toBeInTheDocument();
    expect(screen.getByText('Sara')).toBeInTheDocument();
    // Count header
    expect(screen.getByText('2 לקוחות')).toBeInTheDocument();
  });

  it('"Add Client" button exists and is clickable', async () => {
    setMockClients({ clients: [], filteredClients: [] });
    await renderClientsScreen();

    // The "לקוח חדש" button appears in the empty state action
    // and also in the toolbar
    const addButtons = screen.getAllByText('לקוח חדש');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);

    // Click the toolbar button (the one that's not in the empty state)
    const user = userEvent.setup();
    await user.click(addButtons[0]);
    // No crash = success (the dialog open state is internal to the component)
  });

  it('renders search input', async () => {
    setMockClients({ clients: [], filteredClients: [] });
    await renderClientsScreen();

    const searchInput = screen.getByPlaceholderText('חיפוש לפי שם עסק, איש קשר, טלפון…');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls setSearchQuery when user types in search', async () => {
    const setSearchQuery = vi.fn();
    setMockClients({
      clients: [],
      filteredClients: [],
      setSearchQuery,
    });

    await renderClientsScreen();

    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText('חיפוש לפי שם עסק, איש קשר, טלפון…');
    await user.type(searchInput, 'test');

    expect(setSearchQuery).toHaveBeenCalled();
  });

  it('shows KPI summary with totals', async () => {
    const clients = [
      {
        id: 'c1',
        businessName: 'Bar A',
        contactPerson: '',
        phone: '050',
        email: '',
        address: '',
        area: '',
        clientType: 'business',
        status: 'active' as const,
        tags: [],
        notes: '',
        createdAt: '2026-01-01',
      },
    ];

    setMockClients({
      clients,
      filteredClients: clients,
    });

    await renderClientsScreen();

    // KPI labels should be visible (some labels also appear in the table header)
    expect(screen.getByText('סה״כ לקוחות')).toBeInTheDocument();
    expect(screen.getAllByText('סה״כ מכירות').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('יתרות לגבייה')).toBeInTheDocument();
  });

  it('renders edit and delete buttons for each client row', async () => {
    const clients = [
      {
        id: 'c1',
        businessName: 'Test Business',
        contactPerson: 'John',
        phone: '054-1111111',
        email: '',
        address: '',
        area: '',
        clientType: 'business',
        status: 'active' as const,
        tags: [],
        notes: '',
        createdAt: '2026-01-01',
      },
    ];

    setMockClients({
      clients,
      filteredClients: clients,
    });

    await renderClientsScreen();

    // Edit button with aria-label
    expect(screen.getByLabelText('ערוך Test Business')).toBeInTheDocument();
    // Delete button with aria-label
    expect(screen.getByLabelText('מחק Test Business')).toBeInTheDocument();
  });

  it('renders CSV export button', async () => {
    setMockClients({ clients: [], filteredClients: [] });
    await renderClientsScreen();

    expect(screen.getByText('ייצא CSV')).toBeInTheDocument();
  });

  it('renders CSV import button', async () => {
    setMockClients({ clients: [], filteredClients: [] });
    await renderClientsScreen();

    expect(screen.getByText('ייבא CSV')).toBeInTheDocument();
  });
});
