import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolutionModal } from '../ConflictResolutionModal';
import type { ConflictRecord } from '@/lib/offline/db';

const mockConflicts: ConflictRecord[] = [
  {
    id: 'conflict-1',
    entity: 'booking',
    entityId: 'booking-1',
    localVersion: { status: 'pending' },
    serverVersion: { status: 'confirmed' },
    timestamp: Date.now(),
    resolved: false,
  },
];

const useConflicts = vi.fn();
const resolveConflictWithStrategy = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/offline/hooks', () => ({
  useConflicts: () => useConflicts(),
}));

vi.mock('@/lib/offline/conflict-resolver', () => ({
  resolveConflictWithStrategy: (...args: unknown[]) =>
    resolveConflictWithStrategy(...args),
}));

describe('ConflictResolutionModal', () => {
  beforeEach(() => {
    useConflicts.mockReturnValue({
      conflicts: mockConflicts,
      loading: false,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    resolveConflictWithStrategy.mockClear();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ConflictResolutionModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists conflicts when open', () => {
    render(<ConflictResolutionModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('booking')).toBeInTheDocument();
    expect(screen.getByText('ID: booking-1')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    useConflicts.mockReturnValue({
      conflicts: [],
      loading: true,
      refresh: vi.fn(),
    });
    render(<ConflictResolutionModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Loading conflicts...')).toBeInTheDocument();
  });

  it('shows an empty state when there are no conflicts', () => {
    useConflicts.mockReturnValue({
      conflicts: [],
      loading: false,
      refresh: vi.fn(),
    });
    render(<ConflictResolutionModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('No conflicts to resolve')).toBeInTheDocument();
  });

  it('resolves a single conflict with the selected strategy', async () => {
    render(<ConflictResolutionModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));

    await waitFor(() =>
      expect(resolveConflictWithStrategy).toHaveBeenCalledWith(
        mockConflicts[0],
        'server-wins',
      ),
    );
  });

  it('changes strategy and resolves all conflicts', async () => {
    const onClose = vi.fn();
    render(<ConflictResolutionModal isOpen={true} onClose={onClose} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'client-wins' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve All' }));

    await waitFor(() =>
      expect(resolveConflictWithStrategy).toHaveBeenCalledWith(
        mockConflicts[0],
        'client-wins',
      ),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ConflictResolutionModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ConflictResolutionModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
