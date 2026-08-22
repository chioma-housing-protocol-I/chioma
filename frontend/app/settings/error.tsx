'use client';

import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import type { RouteErrorBoundaryProps } from '@/components/error/RouteErrorBoundary';

export default function SettingsRouteError(props: RouteErrorBoundaryProps) {
  return <RouteErrorBoundary {...props} section="settings" label="Settings" homeHref="/settings" />;
}
