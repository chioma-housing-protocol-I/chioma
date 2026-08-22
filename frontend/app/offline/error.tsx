'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function OfflineRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="offline" label="Offline" homeHref="/offline" />;
}
