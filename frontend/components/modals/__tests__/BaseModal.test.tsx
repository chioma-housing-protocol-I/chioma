import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/loading', () => ({
  Spinner: ({ label }: { label?: string }) =>
    React.createElement(
      'div',
      { 'aria-label': label ?? 'Loading' },
      label ?? 'Loading',
    ),
}));

import { BaseModal } from '../BaseModal';

const noop = () => {};

function renderModal(
  props: Partial<React.ComponentProps<typeof BaseModal>> = {},
) {
  const { children, ...rest } = props;
  return render(
    <BaseModal isOpen onClose={noop} title="Test Modal" {...rest}>
      {children ?? <p>Modal content</p>}
    </BaseModal>,
  );
}

describe('BaseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    renderModal();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    renderModal({ subtitle: 'A helpful subtitle' });
    expect(screen.getByText('A helpful subtitle')).toBeInTheDocument();
  });

  it('renders the close button by default', () => {
    renderModal();
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('hides the close button when showCloseButton is false', () => {
    renderModal({ showCloseButton: false });
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Escape key is pressed', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closeOnEscape is false', () => {
    const onClose = vi.fn();
    renderModal({ onClose, closeOnEscape: false });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the overlay backdrop is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    // Radix attaches its outside-pointerdown listener via setTimeout(0).
    await new Promise((resolve) => setTimeout(resolve, 0));
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.pointerDown(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on backdrop click when closeOnOverlayClick is false', async () => {
    const onClose = vi.fn();
    renderModal({ onClose, closeOnOverlayClick: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.pointerDown(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when a child element inside the modal is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.pointerDown(screen.getByText('Modal content'));
    fireEvent.click(screen.getByText('Modal content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the footer when provided', () => {
    renderModal({
      footer: React.createElement('button', null, 'Save'),
    });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('does not render footer section when footer prop is omitted', () => {
    renderModal();
    expect(
      screen.queryByRole('button', { name: 'Save' }),
    ).not.toBeInTheDocument();
  });

  it('shows the loading overlay when loading is true', () => {
    renderModal({ loading: true, loadingMessage: 'Please wait...' });
    expect(screen.getAllByText('Please wait...').length).toBeGreaterThan(0);
  });

  it('does not show loading overlay when loading is false', () => {
    renderModal({ loading: false });
    expect(screen.queryByText('Please wait...')).not.toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('labels the dialog with the title via aria-labelledby', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    const labelledById = dialog.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const titleEl = document.getElementById(labelledById as string);
    expect(titleEl?.textContent).toBe('Test Modal');
  });
});
