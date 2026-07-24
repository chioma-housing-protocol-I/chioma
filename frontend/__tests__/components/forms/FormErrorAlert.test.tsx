import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import FormErrorAlert from '@/components/forms/FormErrorAlert';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FormErrorAlert', () => {
  it('renders the provided error message', () => {
    render(<FormErrorAlert message="Validation failed" />);
    expect(screen.getByText('Validation failed')).toBeDefined();
  });

  it('has role="alert" for assistive technology', () => {
    render(<FormErrorAlert message="Something went wrong" />);
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('has aria-live="assertive" for immediate announcement', () => {
    render(<FormErrorAlert message="Error" />);
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
  });

  it('has aria-atomic="true" so the whole message is read', () => {
    render(<FormErrorAlert message="Error" />);
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-atomic')).toBe('true');
  });

  it('renders updated message when prop changes', () => {
    const { rerender } = render(<FormErrorAlert message="First error" />);
    expect(screen.getByText('First error')).toBeDefined();
    rerender(<FormErrorAlert message="Second error" />);
    expect(screen.getByText('Second error')).toBeDefined();
    expect(screen.queryByText('First error')).toBeNull();
  });

  it('wraps the message in a paragraph element', () => {
    const { container } = render(<FormErrorAlert message="Test error" />);
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p?.textContent).toBe('Test error');
  });

  it('renders alert container with error styling classes', () => {
    const { container } = render(<FormErrorAlert message="Error" />);
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.className).toContain('border-red');
  });

  it('renders a long error message without truncation', () => {
    const longMessage =
      'This is a very long error message that describes a complex validation failure in detail and should be fully displayed to the user without any truncation or ellipsis.';
    render(<FormErrorAlert message={longMessage} />);
    expect(screen.getByText(longMessage)).toBeDefined();
  });

  it('renders special characters in the message safely', () => {
    render(<FormErrorAlert message="Error: invalid <input> & value" />);
    expect(screen.getByText('Error: invalid <input> & value')).toBeDefined();
  });
});
