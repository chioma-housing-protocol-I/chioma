import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useModalKeyboardNavigation } from '@/hooks/useModalKeyboardNavigation';

function TestModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalKeyboardNavigation(ref, onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div ref={ref} role="dialog" aria-modal="true" data-testid="modal">
      <button>First</button>
      <button>Middle</button>
      <button>Last</button>
    </div>
  );
}

describe('useModalKeyboardNavigation', () => {
  afterEach(() => cleanup());

  it('calls onClose when Escape is pressed (#2048)', () => {
    const onClose = vi.fn();
    render(<TestModal isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for other keys', () => {
    const onClose = vi.fn();
    render(<TestModal isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'a' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses the first focusable element inside the modal on open', () => {
    render(<TestModal isOpen onClose={vi.fn()} />);

    expect(document.activeElement).toBe(screen.getByText('First'));
  });

  it('wraps Tab from the last element back to the first (focus trap)', () => {
    render(<TestModal isOpen onClose={vi.fn()} />);

    const last = screen.getByText('Last');
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(screen.getByText('First'));
  });

  it('wraps Shift+Tab from the first element back to the last (reverse focus trap)', () => {
    render(<TestModal isOpen onClose={vi.fn()} />);

    const first = screen.getByText('First');
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(screen.getByText('Last'));
  });

  it('restores focus to the previously-focused element after the modal closes', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open modal';
    document.body.appendChild(trigger);
    trigger.focus();

    const onClose = vi.fn();
    const { rerender } = render(<TestModal isOpen onClose={onClose} />);

    expect(document.activeElement).not.toBe(trigger);

    rerender(<TestModal isOpen={false} onClose={onClose} />);

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('does nothing when the modal is not open', () => {
    const onClose = vi.fn();
    render(<TestModal isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
