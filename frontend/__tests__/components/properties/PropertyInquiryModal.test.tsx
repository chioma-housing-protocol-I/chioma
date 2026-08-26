import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PropertyInquiryModal } from '@/components/properties/PropertyInquiryModal';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: () => '/properties',
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/store/authStore', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock('@/components/ui', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PropertyInquiryModal', () => {
  it('shows sign-in prompt when user is not authenticated', () => {
    render(
      <PropertyInquiryModal
        isOpen={true}
        onClose={vi.fn()}
        propertyTitle="Test Property"
      />,
    );
    expect(screen.getByText('Sign in required')).toBeDefined();
  });
});