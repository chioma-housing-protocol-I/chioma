import type { Metadata, Viewport } from 'next';
import './globals.css';

import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';

import { RootLayoutClient } from './RootLayoutClient';

export const viewport: Viewport = {
  themeColor: '#0d0e12',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://chioma-kappa.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Chioma — Rentals, settled on Stellar',
    template: '%s | Chioma',
  },
  description:
    'Chioma is a rental platform where agreements, payments, and commissions settle automatically on the Stellar network — instant payouts, transparent contracts, zero disputes.',
  keywords: [
    'rentals',
    'real estate',
    'Stellar',
    'blockchain',
    'escrow',
    'smart contracts',
    'property management',
  ],
  applicationName: 'Chioma',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'Chioma',
    title: 'Chioma — Rentals, settled on Stellar',
    description:
      'Agreements, payments, and commissions settle automatically on the Stellar network. Instant payouts. Transparent contracts. Zero disputes.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Chioma' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chioma — Rentals, settled on Stellar',
    description:
      'Agreements, payments, and commissions settle automatically on the Stellar network.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>

      <body
        suppressHydrationWarning
        className="font-sans bg-ink-900 text-cream"
      >
        {/* Accessibility: skip link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
