'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function VitalsRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="vitals" label="Vitals" homeHref="/vitals" />;
}
