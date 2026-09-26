'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Spinner } from '@/components/loading';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  /** In-modal loading overlay (blocks interaction with body/footer). */
  loading?: boolean;
  loadingMessage?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  loading = false,
  loadingMessage,
}) => {
  // BaseModal is always externally controlled (no Dialog.Trigger rendered),
  // so Radix has no trigger element to return focus to on close. Capture the
  // pre-open activeElement ourselves and restore it in onCloseAutoFocus.
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
        />
        <Dialog.Content
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
          onEscapeKeyDown={(e) => {
            if (!closeOnEscape) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!closeOnOverlayClick) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            previouslyFocusedRef.current?.focus();
          }}
        >
          <div
            className={`relative w-full ${sizeClasses[size]} max-h-[90vh] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <Dialog.Title className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    {title}
                  </Dialog.Title>
                  {subtitle && (
                    <Dialog.Description className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {subtitle}
                    </Dialog.Description>
                  )}
                </div>
                {showCloseButton && (
                  <Dialog.Close asChild>
                    <button
                      className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-xl transition-all"
                      aria-label="Close modal"
                    >
                      <X size={20} />
                    </button>
                  </Dialog.Close>
                )}
              </div>
            </div>

            {/* Content */}
            <div
              className={`relative flex-1 overflow-y-auto p-6 ${loading ? 'pointer-events-none' : ''}`}
            >
              {children}
              {loading ? (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/85 p-6 backdrop-blur-sm dark:bg-slate-900/85"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Spinner size="md" label={loadingMessage ?? 'Loading'} />
                  {loadingMessage ? (
                    <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
                      {loadingMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className={`shrink-0 border-t border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-white/5 dark:bg-white/5 ${loading ? 'pointer-events-none opacity-50' : ''}`}
              >
                {footer}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
