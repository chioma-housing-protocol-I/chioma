'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function VerifyEmailRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="verify-email" label="Email verification" homeHref="/verify-email" />;
}
