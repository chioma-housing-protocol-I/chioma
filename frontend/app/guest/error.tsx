'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function GuestRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="guest" label="Guest" homeHref="/guest" />;
}
