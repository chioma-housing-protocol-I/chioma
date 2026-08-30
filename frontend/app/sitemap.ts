import type { MetadataRoute } from 'next';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://chioma-kappa.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number }[] = [
    { path: '/', priority: 1 },
    { path: '/properties', priority: 0.9 },
    { path: '/stays', priority: 0.8 },
    { path: '/sublet', priority: 0.7 },
    { path: '/resources', priority: 0.6 },
    { path: '/login', priority: 0.5 },
    { path: '/signup', priority: 0.5 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/properties' ? 'daily' : 'weekly',
    priority,
  }));
}
