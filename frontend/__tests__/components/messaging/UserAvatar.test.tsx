/**
 * Component tests for UserAvatar.
 * Issue: #1255
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UserAvatar } from '@/components/messaging/UserAvatar';

describe('UserAvatar', () => {
  it('renders initials from firstName and lastName', () => {
    render(<UserAvatar firstName="Jane" lastName="Doe" />);
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('has an accessible aria-label with full name', () => {
    const { container } = render(
      <UserAvatar firstName="Alice" lastName="Smith" />,
    );
    const el = container.querySelector('[aria-label="Alice Smith"]');
    expect(el).not.toBeNull();
  });

  it('applies admin role colour class', () => {
    const { container } = render(
      <UserAvatar firstName="Admin" lastName="User" role="admin" />,
    );
    expect(container.firstChild?.toString()).toBeDefined();
    const el = container.firstElementChild;
    expect(el?.className).toContain('red');
  });

  it('applies user role colour class by default', () => {
    const { container } = render(
      <UserAvatar firstName="Reg" lastName="User" />,
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain('blue');
  });

  it('renders sm size class', () => {
    const { container } = render(
      <UserAvatar firstName="A" lastName="B" size="sm" />,
    );
    expect(container.firstElementChild?.className).toContain('w-8');
  });

  it('renders lg size class', () => {
    const { container } = render(
      <UserAvatar firstName="A" lastName="B" size="lg" />,
    );
    expect(container.firstElementChild?.className).toContain('w-12');
  });

  it('handles single-character names gracefully', () => {
    render(<UserAvatar firstName="A" lastName="B" />);
    expect(screen.getByText('AB')).toBeDefined();
  });

  it('passes extra className to wrapper', () => {
    const { container } = render(
      <UserAvatar firstName="X" lastName="Y" className="my-custom-class" />,
    );
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });
});
