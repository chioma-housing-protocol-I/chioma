'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function AdminRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="admin" label="Admin" homeHref="/admin" />;
}
