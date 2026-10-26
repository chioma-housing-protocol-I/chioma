'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Keyboard accessibility for hand-rolled modals that don't go through
 * BaseModal/Radix Dialog (#2048): Escape closes the modal, Tab/Shift+Tab is
 * trapped within it so focus never silently escapes to the page behind it,
 * and focus is restored to whatever was focused before the modal opened
 * once it closes. BaseModal's modals already get all of this for free from
 * Radix; this hook gives the remaining hand-rolled modals the same
 * behavior without pulling each of them onto Radix.
 *
 * Usage:
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useModalKeyboardNavigation(modalRef, onClose, isOpen);
 *   return <div ref={modalRef} role="dialog" aria-modal="true">...</div>;
 */
export function useModalKeyboardNavigation(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  isOpen: boolean,
): void {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    // Focus something inside the modal on open so Tab-trapping has a
    // sensible starting point, matching what Radix Dialog does automatically.
    const focusables =
      container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusables?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!container.contains(active)) {
        // Focus drifted outside the modal (e.g. a prior render removed the
        // previously-focused element) — pull it back in rather than letting
        // Tab continue into the page behind the modal.
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, onClose, containerRef]);
}
