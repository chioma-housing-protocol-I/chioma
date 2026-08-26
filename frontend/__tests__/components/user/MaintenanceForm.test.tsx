import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaintenanceForm } from '@/components/user/MaintenanceForm';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-mock">{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MaintenanceForm', () => {
  it('renders the form title', () => {
    render(<MaintenanceForm />);
    expect(
      screen.getByText('New Maintenance Request'),
    ).toBeDefined();
  });

  it('shows validation error for empty title on submit', async () => {
    render(<MaintenanceForm />);
    fireEvent.click(screen.getByText('Submit Request'));
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeDefined();
    });
  });

  it('shows validation error for empty description on submit', async () => {
    render(<MaintenanceForm />);
    fireEvent.click(screen.getByText('Submit Request'));
    await waitFor(() => {
      expect(screen.getByText('Description is required')).toBeDefined();
    });
  });
});