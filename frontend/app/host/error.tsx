'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function HostRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="host" label="Host" homeHref="/host" />;
}
