import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleSelectionModal from '@/components/auth/RoleSelectionModal';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockSetTokens = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({ setTokens: mockSetTokens })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RoleSelectionModal', () => {
  const defaultProps = {
    walletAddress: 'GABC123',
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    mockPush.mockClear();
    mockSetTokens.mockClear();
    defaultProps.onClose = vi.fn();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <RoleSelectionModal {...defaultProps} isOpen={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the welcome heading when open', () => {
    render(<RoleSelectionModal {...defaultProps} />);
    expect(screen.getByText('Welcome to Chioma')).toBeDefined();
  });

  it('renders all three role buttons', () => {
    render(<RoleSelectionModal {...defaultProps} />);
    expect(screen.getByText('User')).toBeDefined();
    expect(screen.getByText('Host')).toBeDefined();
    expect(screen.getByText('Agent')).toBeDefined();
  });

  it('renders role descriptions', () => {
    render(<RoleSelectionModal {...defaultProps} />);
    expect(screen.getByText('I rent properties and pay rent')).toBeDefined();
    expect(screen.getByText('I own and manage properties')).toBeDefined();
    expect(screen.getByText('I manage properties for others')).toBeDefined();
  });

  it('calls setTokens when a role is selected', async () => {
    render(<RoleSelectionModal {...defaultProps} />);
    const userButton = screen.getByText('User').closest('button');
    expect(userButton).not.toBeNull();
    fireEvent.click(userButton!);
    await vi.waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith(
        'mock-token',
        'mock-refresh',
        expect.objectContaining({ role: 'tenant' }),
      );
    });
  });

  it('navigates to /tenant dashboard after selecting tenant role', async () => {
    render(<RoleSelectionModal {...defaultProps} />);
    fireEvent.click(screen.getByText('User').closest('button')!);
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/tenant');
    });
  });

  it('navigates to /landlords dashboard after selecting host role', async () => {
    render(<RoleSelectionModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Host').closest('button')!);
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/landlords');
    });
  });

  it('navigates to /agents dashboard after selecting agent role', async () => {
    render(<RoleSelectionModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Agent').closest('button')!);
    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/agents');
    });
  });

  it('disables buttons while loading after role selection', async () => {
    render(<RoleSelectionModal {...defaultProps} />);
    const userButton = screen.getByText('User').closest('button')!;
    fireEvent.click(userButton);
    // After click, isLoading becomes true — other buttons get disabled
    const agentButton = screen.getByText('Agent').closest('button')!;
    await vi.waitFor(() => {
      expect(agentButton).toHaveProperty('disabled', true);
    });
  });

  it('renders backdrop overlay', () => {
    const { container } = render(<RoleSelectionModal {...defaultProps} />);
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeNull();
  });
});
