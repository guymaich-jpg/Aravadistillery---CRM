import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';
import { StatusBadge } from '../StatusBadge';
import { EmptyState } from '../EmptyState';

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

describe('StatusBadge', () => {
  it('renders the label text', () => {
    render(<StatusBadge label="Active" colorClass="bg-green-100 text-green-800" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies the colorClass to the badge', () => {
    render(<StatusBadge label="Inactive" colorClass="bg-gray-100 text-gray-600" />);
    const badge = screen.getByText('Inactive');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-600');
  });

  it('renders small size by default', () => {
    render(<StatusBadge label="Test" colorClass="bg-blue-100" />);
    const badge = screen.getByText('Test');
    expect(badge.className).toContain('text-xs');
  });

  it('renders medium size when size="md"', () => {
    render(<StatusBadge label="Test" colorClass="bg-blue-100" size="md" />);
    const badge = screen.getByText('Test');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).toContain('px-3');
  });
});

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No items" description="Add your first item" />);
    expect(screen.getByText('Add your first item')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByText('Add your first item')).not.toBeInTheDocument();
  });

  it('renders default icon when none provided', () => {
    render(<EmptyState title="No items" />);
    // Default icon is a clipboard emoji
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState icon="👥" title="No clients" />);
    expect(screen.getByText('👥')).toBeInTheDocument();
  });

  it('renders action button when provided', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick }}
      />,
    );

    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render action button when omitted', () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

describe('ConfirmDialog', () => {
  it('renders title and description when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete item"
        description="Are you sure you want to delete?"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete?')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Delete item"
        description="Are you sure?"
        onConfirm={() => {}}
      />,
    );

    expect(screen.queryByText('Delete item')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Confirm?"
        confirmLabel="Yes, delete"
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByText('Yes, delete'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('uses default labels when not provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Confirm?"
        onConfirm={() => {}}
      />,
    );

    // Default Hebrew labels
    expect(screen.getByText('אישור')).toBeInTheDocument(); // אישור
    expect(screen.getByText('ביטול')).toBeInTheDocument(); // ביטול
  });

  it('renders custom confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Confirm?"
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('Remove')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });
});
