'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function DeveloperRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="developer" label="Developer" homeHref="/developer" />;
}
