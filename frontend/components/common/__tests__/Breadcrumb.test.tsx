import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  Breadcrumb,
  saveScrollPosition,
  getSavedScrollPosition,
  restoreScrollPosition,
  clearSavedScrollPosition,
} from '../Breadcrumb';

// Mock next/navigation
const mockBack = vi.fn();
const mockPush = vi.fn();
let mockPathname = '/user/maintenance/req-123';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

// Mock next/link to render a simple anchor
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Breadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockPathname = '/user/maintenance/req-123';
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders breadcrumb navigation with aria-label="Breadcrumb"', () => {
    render(<Breadcrumb />);
    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav).toBeInTheDocument();
  });

  it('automatically formats pathname into hierarchy segments', () => {
    render(<Breadcrumb />);

    // Segment mappings: 'user' -> 'Dashboard', 'maintenance' -> 'Maintenance', 'req-123' -> 'Req 123'
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Req 123')).toBeInTheDocument();
  });

  it('sets aria-current="page" on the current leaf segment', () => {
    render(<Breadcrumb />);
    const currentPage = screen.getByText('Req 123');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('renders explicit items when provided', () => {
    const customItems = [
      { label: 'Overview', href: '/user' },
      { label: 'Disputes', href: '/user/disputes' },
      { label: 'Dispute #99', isCurrent: true },
    ];

    render(<Breadcrumb items={customItems} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Disputes')).toBeInTheDocument();
    expect(screen.getByText('Dispute #99')).toBeInTheDocument();
    expect(screen.getByText('Dispute #99')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('applies customLabels for dynamic route segments', () => {
    render(
      <Breadcrumb
        customLabels={{
          'req-123': 'Burst Pipe Repair',
        }}
      />,
    );

    expect(screen.getByText('Burst Pipe Repair')).toBeInTheDocument();
  });

  it('renders back button on nested routes by default', () => {
    render(<Breadcrumb />);
    const backBtn = screen.getByRole('button', { name: /go back/i });
    expect(backBtn).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('allows customizing back button label', () => {
    render(<Breadcrumb backLabel="All Maintenance" />);
    expect(screen.getByText('All Maintenance')).toBeInTheDocument();
  });

  it('calls onBack handler when provided', () => {
    const handleBack = vi.fn();
    render(<Breadcrumb onBack={handleBack} />);

    const backBtn = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backBtn);

    expect(handleBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('navigates to backHref with scroll: false when specified', () => {
    render(<Breadcrumb backHref="/user/maintenance" />);

    const backBtn = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith('/user/maintenance', {
      scroll: false,
    });
  });

  it('falls back to router.back() or parent segment when no backHref is provided', () => {
    render(<Breadcrumb />);

    const backBtn = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backBtn);

    // Either router.back or router.push to parent segment
    expect(mockBack.mock.calls.length + mockPush.mock.calls.length).toBeGreaterThan(0);
  });

  it('hides back button when showBackButton={false}', () => {
    render(<Breadcrumb showBackButton={false} />);
    expect(
      screen.queryByRole('button', { name: /go back/i }),
    ).not.toBeInTheDocument();
  });

  it('preserves and restores scroll position in sessionStorage', () => {
    Object.defineProperty(window, 'scrollY', { value: 450, writable: true });
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true });

    saveScrollPosition('/user/properties');
    const saved = getSavedScrollPosition('/user/properties');

    expect(saved).toEqual({ x: 0, y: 450 });

    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    const restored = restoreScrollPosition('/user/properties');
    expect(restored).toBe(true);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 450,
      left: 0,
      behavior: 'instant',
    });

    clearSavedScrollPosition('/user/properties');
    expect(getSavedScrollPosition('/user/properties')).toBeNull();
  });
});
