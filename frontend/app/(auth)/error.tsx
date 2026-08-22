'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function AuthRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="(auth)" label="Authentication" homeHref="/login" />;
}
