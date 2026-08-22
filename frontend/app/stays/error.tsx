'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function StaysRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="stays" label="Stays" homeHref="/stays" />;
}
