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
  error: (message: string, options?: ToastOptions) =>
    toast.error(message, { ...baseToastOptions, ...options }),
  info: (message: string, options?: ToastOptions) =>
    toast(message, { ...baseToastOptions, ...options }),
  loading: (message: string, options?: ToastOptions) =>
    toast.loading(message, { ...baseToastOptions, ...options }),
  dismiss: (toastId?: string) => toast.dismiss(toastId),
};
