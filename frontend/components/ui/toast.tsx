'use client';

import React from 'react';
import { Toaster, toast, type ToastOptions } from 'react-hot-toast';

const baseToastOptions: ToastOptions = {
  className: 'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm',
  duration: 4000,
  ariaProps: {
    role: 'status',
    'aria-live': 'polite',
  },
};

const alertAriaProps: ToastOptions['ariaProps'] = {
  role: 'alert',
  'aria-live': 'assertive',
};

/**
 * Mounts the toast queue. Toasts stack in the bottom-right corner and
 * auto-dismiss after `duration` ms (default 4000); pass `duration: Infinity`
 * to keep one open until it is dismissed.
 */
export function ToastProvider() {
  return (
    <div role="region" aria-label="Notifications" aria-live="polite">
      <Toaster
        position="bottom-right"
        toastOptions={baseToastOptions}
        containerClassName="!bottom-5 !right-5"
      />
    </div>
  );
}

export const notify = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, { ...baseToastOptions, ...options }),
  // Errors interrupt assistive tech immediately; other types announce politely.
  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      ...baseToastOptions,
      ariaProps: alertAriaProps,
      ...options,
    }),
  warning: (message: string, options?: ToastOptions) =>
    toast(message, { ...baseToastOptions, icon: '⚠️', ...options }),
  info: (message: string, options?: ToastOptions) =>
    toast(message, { ...baseToastOptions, ...options }),
  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, { ...baseToastOptions, ...options }),
  dismiss: (toastId?: string) => toast.dismiss(toastId),
};
