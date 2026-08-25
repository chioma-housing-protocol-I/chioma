'use client';

import { QueryProvider } from '@/lib/query/provider';
import { StoreHydrator } from '@/store/StoreHydrator';
import ErrorMonitoringProvider from '@/components/error/ErrorMonitoringProvider';
import NetworkStatusBanner from '@/components/error/NetworkStatusBanner';
import RateLimitNotifier from '@/components/error/RateLimitNotifier';
import { ErrorProvider } from '@/components/error/ErrorProvider';
import PwaController from '@/components/pwa/PwaController';
import { ModalProvider } from '@/contexts/ModalContext';
import { ModalManager } from '@/components/modals';
import { OfflineIndicator } from '@/components/offline';
import { ToastProvider } from '@/components/ui';
import { RouteAnnouncer } from '@/components/accessibility/RouteAnnouncer';
import { WebVitalsReporter } from '@/components/web-vitals';
import { OrientationHandler } from '@/components/orientation/OrientationHandler';
import { ConnectionStatusBanner } from '@/components/connection-status/ConnectionStatusBanner';

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ModalProvider>
        <ErrorProvider>
          <StoreHydrator />
          <ErrorMonitoringProvider />
          <WebVitalsReporter />
          <PwaController />
          <OrientationHandler />
          <NetworkStatusBanner />
          <ConnectionStatusBanner />
          <RateLimitNotifier />
          <RouteAnnouncer />

          {/* Page content - individual pages provide their own #main-content landmark */}
          {children}

          <ModalManager />
          <OfflineIndicator />
          <ToastProvider />
        </ErrorProvider>
      </ModalProvider>
    </QueryProvider>
  );
}
