import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chioma',
    short_name: 'Chioma',
    description:
      'Blockchain-powered housing rentals with transparent leases, payments, and offline-ready access.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#020617',
    theme_color: '#1d4ed8',
    categories: ['housing', 'finance', 'productivity'],
    icons: [
      {
        src: '/android_192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android_512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple_touch_180.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo_512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/og-image.png',
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Chioma landing page preview',
      },
    ],
  };
}
