import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
    },
  ) => React.createElement('a', props, props.children),
}));

import AdminRouteError from '@/app/admin/error';
import HostRouteError from '@/app/host/error';

/**
 * #1549: previously, `admin` (and 16 other route groups) had no error.tsx,
 * so a thrown error inside them fell through to the generic root
 * app/error.tsx with no section-specific messaging. These assert each
 * group's own boundary renders its own title/recovery link instead.
 */
describe('per-route-group error boundaries', () => {
  it('renders the admin-specific boundary, not the generic root fallback', () => {
    render(
      <AdminRouteError error={new Error('boom')} reset={() => {}} />,
    );

    expect(screen.getByText('Admin area error')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to safety/i })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('renders the host-specific boundary with its own recovery link', () => {
    render(<HostRouteError error={new Error('boom')} reset={() => {}} />);

    expect(screen.getByText('Host area error')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to safety/i })).toHaveAttribute(
      'href',
      '/host',
    );
  });
});
