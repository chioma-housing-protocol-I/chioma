import type { Metadata } from 'next';
import './globals.css';
import { AuthHydrator } from '@/store/AuthHydrator';

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
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
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
    <html lang="en">
      <body className="antialiased">
        <AuthHydrator />
        {children}
      </body>
    </html>
  );
}
