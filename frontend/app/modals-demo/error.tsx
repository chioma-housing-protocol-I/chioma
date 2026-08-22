'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function ModalsDemoRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="modals-demo" label="Modals demo" homeHref="/modals-demo" />;
}
