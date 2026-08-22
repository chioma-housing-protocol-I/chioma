'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function TermsRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="terms" label="Terms" homeHref="/terms" />;
}
