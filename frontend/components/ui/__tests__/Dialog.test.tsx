/**
 * Dialog variants — unit, accessibility and integration tests.
 *
 * Also serves as the reference example for the patterns described in
 * CONTRIBUTING.md → "Component testing best practices":
 *   - query by role / accessible name, not by class or test id
 *   - assert behaviour (callbacks, focus) rather than markup
 *   - run axe-core against rendered output
 *   - drive a real stateful parent for integration flows
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import axe from 'axe-core';

import { AlertDialog, ConfirmDialog, Drawer, Modal } from '../Dialog';

async function expectNoAxeViolations(node: Element = document.body) {
  const results = await axe.run(node, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    // Colour contrast needs real layout/styles, which jsdom does not have.
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(
    results.violations,
    results.violations.map((v) => v.id).join(', '),
  ).toHaveLength(0);
}

describe('Modal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} onClose={vi.fn()} title="Hidden" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes an accessible name and description', () => {
    render(
      <Modal
        isOpen
        onClose={vi.fn()}
        title="Property details"
        description="Review the listing"
      >
        <p>Body</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Property details' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Review the listing');
  });

  it('closes on Escape and via the close button', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Closable" />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape when closeOnEscape is false', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Sticky" closeOnEscape={false} />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Accessible" description="Desc">
        <p>Content</p>
      </Modal>,
    );
    await expectNoAxeViolations();
  });
});

describe('AlertDialog', () => {
  it('uses role="alertdialog" and focuses the action button', async () => {
    render(
      <AlertDialog
        isOpen
        onClose={vi.fn()}
        tone="warning"
        title="Session expiring"
        description="You will be signed out soon."
        actionLabel="Got it"
      />,
    );

    const dialog = screen.getByRole('alertdialog', {
      name: 'Session expiring',
    });
    expect(dialog).toHaveAccessibleDescription('You will be signed out soon.');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Got it' })).toHaveFocus(),
    );
  });

  it('defaults the action label and calls onClose', () => {
    const onClose = vi.fn();
    render(<AlertDialog isOpen onClose={onClose} title="Saved" />);

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onAction instead of onClose when provided', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();
    render(
      <AlertDialog
        isOpen
        onClose={onClose}
        onAction={onAction}
        title="Heads up"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    render(
      <AlertDialog
        isOpen
        onClose={vi.fn()}
        tone="danger"
        title="Payment failed"
        description="Your card was declined."
      />,
    );
    await expectNoAxeViolations();
  });
});

describe('ConfirmDialog', () => {
  it('focuses Cancel first so Enter never triggers the action', async () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete property"
        description="This cannot be undone."
        tone="danger"
        confirmLabel="Delete"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus(),
    );
  });

  it('calls onConfirm and onCancel', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Archive"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables actions and blocks dismissal while loading', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        loading
        title="Submitting"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Please wait...' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    render(
      <ConfirmDialog
        isOpen
        title="Confirm"
        description="Proceed?"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    await expectNoAxeViolations();
  });
});

describe('Drawer', () => {
  it('renders as a labelled dialog with a drawer close button', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} side="left" title="Filters">
        <p>Filter controls</p>
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toHaveAttribute('data-layout', 'drawer');

    fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    render(
      <Drawer isOpen onClose={vi.fn()} title="Details" description="More info">
        <p>Body</p>
      </Drawer>,
    );
    await expectNoAxeViolations();
  });
});

// ─── Integration: real parent state, open → close → focus restore ────────────

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Harness">
        <p>Inside</p>
      </Modal>
    </>
  );
}

describe('Dialog integration', () => {
  it('opens from a trigger, closes, and restores focus', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open' });

    trigger.focus();
    fireEvent.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'Harness' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
