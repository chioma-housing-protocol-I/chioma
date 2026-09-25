'use client';

import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

type PaymentFormErrorBoundaryProps = {
  children: ReactNode;
};

export default function PaymentFormErrorBoundary({
  children,
}: PaymentFormErrorBoundaryProps) {
  return (
    <ErrorBoundary
      source="PaymentFormErrorBoundary"
      title="Payment form failed to load"
      description="Something went wrong while loading the payment form. Your payment has not been processed. You can retry without losing your place."
    >
      {children}
    </ErrorBoundary>
  );
}
