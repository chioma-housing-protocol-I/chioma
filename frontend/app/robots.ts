import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

const APP_URL = env.NEXT_PUBLIC_APP_URL || 'https://chioma-kappa.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/user/',
          '/api/',
          '/settings/',
          '/messages/',
          '/oauth/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
