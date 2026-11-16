'use client';

import dynamic from 'next/dynamic';
import { QueryProvider } from '@/lib/query/provider';
import { StoreHydrator } from '@/store/StoreHydrator';
import { InitialAuthProvider } from '@/store/InitialAuthContext';
import type { AuthHint } from '@/store/authStore';
import ErrorMonitoringProvider from '@/components/error/ErrorMonitoringProvider';
import NetworkStatusBanner from '@/components/error/NetworkStatusBanner';
import RateLimitNotifier from '@/components/error/RateLimitNotifier';
import { ErrorProvider } from '@/components/error/ErrorProvider';
import { ModalProvider } from '@/contexts/ModalContext';
import { ToastProvider } from '@/components/ui/toast';
import { RouteAnnouncer } from '@/components/accessibility/RouteAnnouncer';
import { WebVitalsReporter } from '@/components/web-vitals/WebVitalsReporter';
import { OrientationHandler } from '@/components/orientation/OrientationHandler';
import { HtmlAttributesSync } from '@/components/i18n/HtmlAttributesSync';
import NetworkIndicator from '@/components/shared/NetworkIndicator';
import ThemeManager from '@/components/ThemeManager';

// Components above are imported from their own modules rather than through
// barrel files (`@/components/modals`, `@/components/offline`, ...) so the
// root layout doesn't drag every sibling export (all modals, the web-vitals
// panel with framer-motion, the offline conflict modal) into the shared
// first-load bundle that every route pays for.
//
// The widgets below never render anything on first paint, so they are split
// into their own chunks and loaded after hydration. This keeps socket.io
// (ConnectionStatusBanner), the offline IndexedDB layer (OfflineIndicator),
// PWA install/update handling and the modal registry out of the main bundle.
const PwaController = dynamic(() => import('@/components/pwa/PwaController'), {
  ssr: false,
});
const ConnectionStatusBanner = dynamic(
  () =>
    import('@/components/connection-status/ConnectionStatusBanner').then(
      (m) => m.ConnectionStatusBanner,
    ),
  { ssr: false },
);
const ModalManager = dynamic(
  () => import('@/components/modals/ModalManager').then((m) => m.ModalManager),
  { ssr: false },
);
const OfflineIndicator = dynamic(
  () =>
    import('@/components/offline/OfflineIndicator').then(
      (m) => m.OfflineIndicator,
    ),
  { ssr: false },
);

export function RootLayoutClient({
  children,
  authHint,
}: {
  children: React.ReactNode;
  authHint: AuthHint | null;
}) {
  return (
    <InitialAuthProvider value={authHint}>
      <QueryProvider>
        <ModalProvider>
          <ErrorProvider>
            <StoreHydrator />
            <ThemeManager />
            <HtmlAttributesSync />
            <ErrorMonitoringProvider />
            <WebVitalsReporter />
            <PwaController />
            <OrientationHandler />
            <NetworkIndicator />
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
    </InitialAuthProvider>
  );
}
