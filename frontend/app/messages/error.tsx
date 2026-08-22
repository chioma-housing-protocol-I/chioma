'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function MessagesRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="messages" label="Messaging" homeHref="/messages" />;
}
