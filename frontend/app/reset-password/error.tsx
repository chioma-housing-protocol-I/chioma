'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function ResetPasswordRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="reset-password" label="Password reset" homeHref="/reset-password" />;
}
