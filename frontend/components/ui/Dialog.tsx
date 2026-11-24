'use client';

import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

/**
 * Dialog variants — Modal, AlertDialog, ConfirmDialog and Drawer.
 *
 * Every variant shares the same core API (`DialogBaseProps`):
 *
 *   isOpen / onClose          controlled open state
 *   title / description       accessible name + description (always wired
 *                             to aria-labelledby / aria-describedby)
 *   children / footer         body and action area
 *   showCloseButton           render the top-right "X" button
 *   closeOnOverlayClick       dismiss when clicking the backdrop
 *   closeOnEscape             dismiss on the Escape key
 *
 * All variants are built on Radix Dialog, so focus is trapped while open,
 * the rest of the page is hidden from assistive tech, and focus returns to
 * the element that was focused before the dialog opened.
 */

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

export interface DialogBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

const toneStyles: Record<
  DialogTone,
  { icon: LucideIcon; iconClass: string; buttonClass: string }
> = {
  info: {
    icon: Info,
    iconClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15',
    buttonClass:
      'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
  },
  danger: {
    icon: XCircle,
    iconClass: 'bg-red-100 text-red-600 dark:bg-red-500/15',
    buttonClass: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
  },
};

const primaryButtonBase =
  'rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-800 dark:text-neutral-200 dark:hover:bg-slate-700';

// ─── Shared shell ────────────────────────────────────────────────────────────

interface DialogShellProps extends DialogBaseProps {
  layout: 'center' | 'drawer';
  size?: DialogSize;
  side?: 'left' | 'right';
  role?: 'dialog' | 'alertdialog';
  icon?: React.ReactNode;
  closeLabel: string;
  /** Element to focus when the dialog opens (defaults to first focusable). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

function DialogShell({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  layout,
  size = 'md',
  side = 'right',
  role = 'dialog',
  icon,
  closeLabel,
  initialFocusRef,
}: DialogShellProps) {
  // Dialogs here are externally controlled (no Radix Trigger), so capture
  // the element focused before opening and restore it on close.
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current =
        document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  const panelClass =
    layout === 'drawer'
      ? `fixed inset-y-0 ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} z-50 flex h-full w-full ${sizeClasses[size === 'full' ? 'full' : 'sm']} flex-col bg-white shadow-2xl focus:outline-none dark:bg-slate-900 border-neutral-200 dark:border-white/10`
      : `fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] ${sizeClasses[size]} -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl focus:outline-none dark:border-white/10 dark:bg-slate-900`;

  return (
    <RadixDialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          data-testid="dialog-overlay"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
        />
        <RadixDialog.Content
          role={role}
          aria-modal="true"
          data-layout={layout}
          className={`${panelClass} ${className}`}
          // Radix warns when no Description is rendered unless this is
          // explicitly undefined.
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={(e) => {
            if (initialFocusRef?.current) {
              e.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (!closeOnEscape) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!closeOnOverlayClick) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!closeOnOverlayClick) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            previouslyFocusedRef.current?.focus();
          }}
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-white/5 dark:bg-white/5">
            {icon}
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            {showCloseButton ? (
              <RadixDialog.Close asChild>
                <button
                  type="button"
                  aria-label={closeLabel}
                  className="rounded-xl p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </RadixDialog.Close>
            ) : null}
          </div>

          {children ? (
            <div className="flex-1 overflow-y-auto p-6 text-sm text-neutral-700 dark:text-neutral-300">
              {children}
            </div>
          ) : null}

          {footer ? (
            <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-white/5 dark:bg-white/5">
              {footer}
            </div>
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function ToneIcon({ tone }: { tone: DialogTone }) {
  const { icon: Icon, iconClass } = toneStyles[tone];
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      aria-hidden="true"
    >
      <Icon size={20} />
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export interface ModalProps extends DialogBaseProps {
  size?: DialogSize;
}

/** General-purpose centered modal for arbitrary content. */
export function Modal({ size = 'md', ...props }: ModalProps) {
  const { t } = useTranslation();
  return (
    <DialogShell
      {...props}
      layout="center"
      size={size}
      closeLabel={t('dialog.closeDialog')}
    />
  );
}

// ─── AlertDialog ─────────────────────────────────────────────────────────────

export interface AlertDialogProps extends Omit<DialogBaseProps, 'footer'> {
  tone?: DialogTone;
  /** Label for the single acknowledge button. Defaults to "OK". */
  actionLabel?: string;
  /** Called when the acknowledge button is pressed. Defaults to `onClose`. */
  onAction?: () => void;
}

/**
 * Interrupting message that requires acknowledgement. Renders with
 * `role="alertdialog"`, moves focus to the action button, and does not
 * close on backdrop click by default.
 */
export function AlertDialog({
  tone = 'info',
  actionLabel,
  onAction,
  onClose,
  closeOnOverlayClick = false,
  showCloseButton = false,
  ...props
}: AlertDialogProps) {
  const { t } = useTranslation();
  const actionRef = React.useRef<HTMLButtonElement>(null);

  return (
    <DialogShell
      {...props}
      onClose={onClose}
      layout="center"
      size="sm"
      role="alertdialog"
      closeOnOverlayClick={closeOnOverlayClick}
      showCloseButton={showCloseButton}
      closeLabel={t('dialog.closeDialog')}
      icon={<ToneIcon tone={tone} />}
      initialFocusRef={actionRef}
      footer={
        <div className="flex justify-end">
          <button
            ref={actionRef}
            type="button"
            onClick={onAction ?? onClose}
            className={`${primaryButtonBase} ${toneStyles[tone].buttonClass}`}
          >
            {actionLabel ?? t('dialog.ok')}
          </button>
        </div>
      }
    />
  );
}

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

type ConfirmDialogBaseProps = Omit<DialogBaseProps, 'footer' | 'onClose'>;

export interface ConfirmDialogProps extends ConfirmDialogBaseProps {
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Two-button confirmation. Cancel receives initial focus so a stray Enter
 * never triggers a destructive action. While `loading`, both buttons are
 * disabled and the dialog cannot be dismissed.
 */
export function ConfirmDialog({
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  loading = false,
  onCancel,
  onConfirm,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  ...props
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const handleClose = () => {
    if (!loading) onCancel();
  };

  return (
    <DialogShell
      {...props}
      onClose={handleClose}
      layout="center"
      size="sm"
      closeOnEscape={closeOnEscape && !loading}
      closeOnOverlayClick={closeOnOverlayClick && !loading}
      closeLabel={t('dialog.closeDialog')}
      initialFocusRef={cancelRef}
      footer={
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={secondaryButtonClass}
          >
            {cancelLabel ?? t('dialog.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className={`${primaryButtonBase} ${
              tone === 'danger'
                ? toneStyles.danger.buttonClass
                : toneStyles.info.buttonClass
            }`}
          >
            {loading
              ? t('dialog.pleaseWait')
              : (confirmLabel ?? t('dialog.confirm'))}
          </button>
        </div>
      }
    />
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

export interface DrawerProps extends DialogBaseProps {
  /** Edge the drawer slides in from. Defaults to `right`. */
  side?: 'left' | 'right';
  /** `sm` (default) is a 28rem side panel; `full` spans the viewport. */
  size?: 'sm' | 'full';
}

/** Full-height side panel for secondary flows (filters, details, forms). */
export function Drawer({ side = 'right', size = 'sm', ...props }: DrawerProps) {
  const { t } = useTranslation();
  return (
    <DialogShell
      {...props}
      layout="drawer"
      side={side}
      size={size}
      closeLabel={t('dialog.closeDrawer')}
    />
  );
}
