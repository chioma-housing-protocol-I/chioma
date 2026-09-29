import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { User, PaginatedResponse } from '@/types';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...rest }, children),
}));

import { BulkUserOperations } from '../BulkUserOperations';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    role: 'user',
    isVerified: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeUsers(
  users: User[],
  overrides: Partial<PaginatedResponse<User>> = {},
): PaginatedResponse<User> {
  return {
    data: users,
    total: users.length,
    page: 1,
    limit: 10,
    totalPages: 1,
    ...overrides,
  };
}

function baseProps() {
  return {
    isLoading: false,
    page: 1,
    setPage: vi.fn(),
    onBulkSuspend: vi.fn().mockResolvedValue(undefined),
    onBulkActivate: vi.fn().mockResolvedValue(undefined),
    onBulkExport: vi.fn(),
  };
}

describe('BulkUserOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner when isLoading is true', () => {
    const { container } = render(
      <BulkUserOperations {...baseProps()} users={undefined} isLoading />,
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('No users found.')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no users', () => {
    render(<BulkUserOperations {...baseProps()} users={makeUsers([])} />);
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('renders a row per user with role and verification badges', () => {
    render(
      <BulkUserOperations
        {...baseProps()}
        users={makeUsers([
          makeUser(),
          makeUser({
            id: 'u-2',
            name: 'Bob Admin',
            email: 'bob@example.com',
            role: 'admin',
            isVerified: false,
          }),
        ])}
      />,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('does not show the bulk action bar until a user is selected', () => {
    render(
      <BulkUserOperations {...baseProps()} users={makeUsers([makeUser()])} />,
    );
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('selects a single user and shows the bulk action bar', () => {
    render(
      <BulkUserOperations
        {...baseProps()}
        users={makeUsers([makeUser(), makeUser({ id: 'u-2' })])}
      />,
    );

    const checkboxButtons = screen.getAllByTitle('Select all');
    // First checkbox-like button in the header is "select all"; row buttons
    // don't have that title, so grab one from inside the tbody instead.
    const rows = document.querySelectorAll('tbody tr');
    const firstRowSelectButton = rows[0].querySelector('button')!;
    fireEvent.click(firstRowSelectButton);

    expect(screen.getByText('1 user selected')).toBeInTheDocument();
    expect(checkboxButtons.length).toBeGreaterThan(0);
  });

  it('selects all users via the header checkbox', () => {
    render(
      <BulkUserOperations
        {...baseProps()}
        users={makeUsers([makeUser(), makeUser({ id: 'u-2' })])}
      />,
    );

    fireEvent.click(screen.getByTitle('Select all'));
    expect(screen.getByText('2 users selected')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Deselect all'));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('calls onBulkExport with the selected ids', () => {
    const onBulkExport = vi.fn();
    render(
      <BulkUserOperations
        {...baseProps()}
        onBulkExport={onBulkExport}
        users={makeUsers([makeUser({ id: 'u-1' })])}
      />,
    );

    fireEvent.click(screen.getByTitle('Select all'));
    fireEvent.click(screen.getByRole('button', { name: /Export/i }));

    expect(onBulkExport).toHaveBeenCalledWith(['u-1']);
  });

  it('confirms and calls onBulkSuspend, then clears the selection', async () => {
    const onBulkSuspend = vi.fn().mockResolvedValue(undefined);
    render(
      <BulkUserOperations
        {...baseProps()}
        onBulkSuspend={onBulkSuspend}
        users={makeUsers([makeUser({ id: 'u-1' })])}
      />,
    );

    fireEvent.click(screen.getByTitle('Select all'));
    fireEvent.click(screen.getByRole('button', { name: /^Suspend$/i }));

    expect(screen.getByText('Suspend 1 user?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(onBulkSuspend).toHaveBeenCalledWith(['u-1']);
    });
    await waitFor(() => {
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  it('cancels the confirm dialog without calling the bulk action', () => {
    const onBulkActivate = vi.fn();
    render(
      <BulkUserOperations
        {...baseProps()}
        onBulkActivate={onBulkActivate}
        users={makeUsers([makeUser({ id: 'u-1' })])}
      />,
    );

    fireEvent.click(screen.getByTitle('Select all'));
    fireEvent.click(screen.getByRole('button', { name: /^Activate$/i }));
    expect(screen.getByText('Activate 1 user?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Activate 1 user?')).not.toBeInTheDocument();
    expect(onBulkActivate).not.toHaveBeenCalled();
  });

  it('calls onRowClick when a row is clicked but not when the checkbox is clicked', () => {
    const onRowClick = vi.fn();
    const user = makeUser({ id: 'u-1' });
    render(
      <BulkUserOperations
        {...baseProps()}
        onRowClick={onRowClick}
        users={makeUsers([user])}
      />,
    );

    const row = document.querySelector('tbody tr') as HTMLElement;
    const checkboxButton = row.querySelector('button') as HTMLElement;
    fireEvent.click(checkboxButton);
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith(user);
  });

  it('disables Previous on page 1 and calls setPage on Next', () => {
    const setPage = vi.fn();
    render(
      <BulkUserOperations
        {...baseProps()}
        setPage={setPage}
        page={1}
        users={makeUsers([makeUser()], { totalPages: 3, total: 25 })}
      />,
    );

    const [prevButton, nextButton] = screen.getAllByRole('button').slice(-2);
    expect(prevButton).toBeDisabled();
    fireEvent.click(nextButton);
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it('sorts by clicking a sortable header when onSort is provided', () => {
    const onSort = vi.fn();
    render(
      <BulkUserOperations
        {...baseProps()}
        onSort={onSort}
        sortBy="email"
        sortOrder="ASC"
        users={makeUsers([makeUser()])}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Role/i }));
    expect(onSort).toHaveBeenCalledWith('role');
  });
});
