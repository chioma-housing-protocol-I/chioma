'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function PrivacyRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="privacy" label="Privacy" homeHref="/privacy" />;
}
