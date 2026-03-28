import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/query/provider';
import { StoreHydrator } from '@/store/StoreHydrator';
import ErrorMonitoringProvider from '@/components/error/ErrorMonitoringProvider';
import NetworkStatusBanner from '@/components/error/NetworkStatusBanner';
import PwaController from '@/components/pwa/PwaController';
import { ModalProvider } from '@/contexts/ModalContext';
import { ModalManager } from '@/components/modals';
import { OfflineIndicator } from '@/components/offline';
import { ToastProvider } from '@/components/ui';
import { Inter } from 'next/font/google';

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://chioma-kappa.vercel.app',
  ),
  title: {
    default: 'Chioma — Blockchain-Powered Rentals',
    template: '%s | Chioma',
  },
  description:
    'Automated commissions, zero disputes. Connect with landlords and tenants on the Stellar network. Experience instant payouts and transparent contract tracking without the paperwork.',
  keywords: [
    'blockchain rentals',
    'Stellar blockchain',
    'rental payments',
    'property management',
    'real estate technology',
    'smart contracts',
    'landlord platform',
    'tenant platform',
    'automated commissions',
    'transparent rentals',
    'instant payments',
    'blockchain real estate',
    'decentralized rentals',
    'rental platform',
  ],
  authors: [{ name: 'caxtonacollins' }],
  creator: 'Chioma',
  publisher: 'Chioma',
  applicationName: 'Chioma',
  manifest: '/manifest.webmanifest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Chioma',
    title: 'Chioma — Blockchain-Powered Rentals',
    description:
      'Automated commissions, zero disputes. Connect with landlords and tenants on the Stellar network. Experience instant payouts and transparent contract tracking.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chioma - Blockchain-Powered Rental Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chioma — Blockchain-Powered Rentals',
    description:
      'Automated commissions, zero disputes. Instant payouts and transparent contract tracking on the Stellar blockchain.',
    images: ['/og-image.png'],
    creator: '@caxtonacollins',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon_16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple_touch_180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome', url: '/android_192.png', sizes: '192x192' },
      { rel: 'android-chrome', url: '/android_512.png', sizes: '512x512' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chioma',
  },
  category: 'technology',
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="antialiased font-sans bg-linear-to-br from-slate-900 via-blue-900 to-slate-900">
        <QueryProvider>
          <ModalProvider>
            <StoreHydrator />
            <ErrorMonitoringProvider />
            <PwaController />
            <NetworkStatusBanner />
            {children}
            <ModalManager />
            <OfflineIndicator />
            <ToastProvider />
          </ModalProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
