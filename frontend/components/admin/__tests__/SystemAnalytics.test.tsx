import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockUseAdminUsers = vi.fn();
const mockUseProperties = vi.fn();
const mockUseTransactions = vi.fn();

vi.mock('@/lib/query/hooks/use-admin-users', () => ({
  useAdminUsers: (...args: unknown[]) => mockUseAdminUsers(...args),
}));
vi.mock('@/lib/query/hooks/use-properties', () => ({
  useProperties: (...args: unknown[]) => mockUseProperties(...args),
}));
vi.mock('@/lib/query/hooks/use-transactions', () => ({
  useTransactions: (...args: unknown[]) => mockUseTransactions(...args),
}));

// recharts' ResponsiveContainer relies on layout measurement that jsdom
// doesn't provide; stub the chart primitives out so the section renders.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Line: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { SystemAnalytics } from '../SystemAnalytics';

const now = new Date();
function daysAgo(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const mockUsers = [
  { id: 'u1', createdAt: daysAgo(10), isVerified: true },
  { id: 'u2', createdAt: daysAgo(20), isVerified: false },
];

const mockProperties = [
  { id: 'p1', createdAt: daysAgo(5), status: 'published' },
  { id: 'p2', createdAt: daysAgo(40), status: 'draft' },
];

const mockTransactions = [
  { id: 't1', createdAt: daysAgo(3), status: 'completed', amount: 1000 },
  { id: 't2', createdAt: daysAgo(15), status: 'failed', amount: 200 },
];

function setHookData(overrides?: {
  usersLoading?: boolean;
  usersError?: boolean;
  propertiesLoading?: boolean;
  transactionsLoading?: boolean;
}) {
  mockUseAdminUsers.mockReturnValue({
    data: { data: mockUsers },
    isLoading: overrides?.usersLoading ?? false,
    isError: overrides?.usersError ?? false,
  });
  mockUseProperties.mockReturnValue({
    data: { data: mockProperties },
    isLoading: overrides?.propertiesLoading ?? false,
    isError: false,
  });
  mockUseTransactions.mockReturnValue({
    data: { data: mockTransactions },
    isLoading: overrides?.transactionsLoading ?? false,
    isError: false,
  });
}

describe('SystemAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHookData();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('renders the page heading and metric cards', () => {
    render(<SystemAnalytics />);

    expect(screen.getByText('System Analytics')).toBeInTheDocument();
    expect(screen.getByText('Users Growth')).toBeInTheDocument();
    expect(screen.getByText('Property Listings')).toBeInTheDocument();
    expect(screen.getByText('Transaction Count')).toBeInTheDocument();
    expect(screen.getByText('Transaction Volume')).toBeInTheDocument();
  });

  it('renders platform health indicators computed from the data', () => {
    render(<SystemAnalytics />);

    expect(screen.getByText('Platform Health')).toBeInTheDocument();
    expect(screen.getByText('Transaction Success')).toBeInTheDocument();
    expect(screen.getByText('Verification Coverage')).toBeInTheDocument();
    expect(screen.getByText('Active Listing Ratio')).toBeInTheDocument();
    expect(screen.getByText('Failed Transaction Ratio')).toBeInTheDocument();
  });

  it('shows a loading message while any dataset is still loading', () => {
    setHookData({ usersLoading: true });
    render(<SystemAnalytics />);

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
  });

  it('shows an error message when a dataset fails to load', () => {
    setHookData({ usersError: true });
    render(<SystemAnalytics />);

    expect(
      screen.getByText(
        'Some analytics metrics failed to load. Please refresh and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('reveals custom date inputs when the custom range preset is selected', () => {
    render(<SystemAnalytics />);

    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'custom' } });

    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });

  it('triggers a CSV export download when the export button is clicked', () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(<SystemAnalytics />);
    fireEvent.click(screen.getByText('Export CSV'));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
