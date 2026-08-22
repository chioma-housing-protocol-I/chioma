'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function ResourcesRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="resources" label="Resources" homeHref="/resources" />;
}
