import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import './globals.css';

import { RootLayoutClient } from './RootLayoutClient';
import { env } from '@/lib/env';
import type { AuthHint } from '@/store/authStore';
import { RTL_LANGUAGES } from '@/lib/i18n/direction';

// Self-hosted variable latin subsets. Next emits preload links and writes
// font-display: swap into the generated @font-face rules. The fallback metric
// adjustment keeps the system-font swap from shifting layout (#2157).
const interFont = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Arial',
  variable: '--font-inter',
});

const frauncesFont = localFont({
  src: './fonts/fraunces-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-fraunces',
});

const AUTH_HINT_COOKIE_NAME = 'chioma_auth_hint';

async function readAuthHint(): Promise<AuthHint | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_HINT_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthHint;
  } catch {
    return null;
  }
}

/**
 * Applies the persisted locale's `lang`/`dir` to <html> before first paint,
 * so right-to-left users (Arabic, Hebrew, …) never see a flash of the LTR
 * layout while the i18n store hydrates. <HtmlAttributesSync> keeps the
 * attributes in sync after that.
 */
const RTL_LANGUAGES_JSON = JSON.stringify(RTL_LANGUAGES);
const LOCALE_DIRECTION_SCRIPT = `(function(){try{var raw=localStorage.getItem('chioma-locale');if(!raw)return;var locale=JSON.parse(raw).state.locale;if(typeof locale!=='string')return;var rtl=${RTL_LANGUAGES_JSON};var el=document.documentElement;el.lang=locale;el.dir=rtl.indexOf(locale.split('-')[0])!==-1?'rtl':'ltr';}catch(e){}})();`;

export const viewport: Viewport = {
  themeColor: '#0d0e12',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

const APP_URL = env.NEXT_PUBLIC_APP_URL || 'https://chioma-kappa.vercel.app';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authHint = await readAuthHint();

  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${interFont.variable} ${frauncesFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_DIRECTION_SCRIPT }} />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>

      <body
        suppressHydrationWarning
        className="font-sans bg-background text-foreground"
      >
        {/* Accessibility: skip link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <RootLayoutClient authHint={authHint}>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
