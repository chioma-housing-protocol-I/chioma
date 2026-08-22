'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function PropertiesRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="properties" label="Properties" homeHref="/properties" />;
}
