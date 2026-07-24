'use client';

import { QueryProvider } from '@/lib/query/provider';
import { StoreHydrator } from '@/store/StoreHydrator';
import ErrorMonitoringProvider from '@/components/error/ErrorMonitoringProvider';
import NetworkStatusBanner from '@/components/error/NetworkStatusBanner';
import { ErrorProvider } from '@/components/error/ErrorProvider';
import PwaController from '@/components/pwa/PwaController';
import { ModalProvider } from '@/contexts/ModalContext';
import { ModalManager } from '@/components/modals';
import { OfflineIndicator } from '@/components/offline';
import { ToastProvider } from '@/components/ui';
import { RouteAnnouncer } from '@/components/accessibility/RouteAnnouncer';

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ModalProvider>
        <ErrorProvider>
          <StoreHydrator />
          <ErrorMonitoringProvider />
          <PwaController />
          <NetworkStatusBanner />
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
