'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function SubletRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="sublet" label="Sublet" homeHref="/sublet" />;
}
