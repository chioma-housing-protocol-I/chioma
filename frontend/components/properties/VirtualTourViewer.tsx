'use client';

import { useEffect, useMemo } from 'react';
import { Box, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface VirtualTourViewerProps {
  propertyId: string;
  tourUrl: string;
  title?: string;
}

function normalizeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('matterport')) {
      if (!parsed.searchParams.get('play'))
        parsed.searchParams.set('play', '1');
      if (!parsed.searchParams.get('brand'))
        parsed.searchParams.set('brand', '0');
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function detectProvider(url: string): 'matterport' | 'kuula' | 'unknown' {
  if (url.includes('matterport')) return 'matterport';
  if (url.includes('kuula')) return 'kuula';
  return 'unknown';
}

export default function VirtualTourViewer({
  propertyId,
  tourUrl,
  title = '3D Virtual Tour',
}: VirtualTourViewerProps) {
  const embedUrl = useMemo(() => normalizeEmbedUrl(tourUrl), [tourUrl]);
  const provider = useMemo(() => detectProvider(tourUrl), [tourUrl]);

  useEffect(() => {
    const sessionId = `tour_${Math.random().toString(36).slice(2)}`;
    const startedAt = Date.now();
    const payload = {
      eventType: 'view_start' as const,
      provider,
      source: 'property_details',
      deviceType: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        ? 'mobile'
        : 'desktop',
      sessionId,
    };

    void apiClient.post(`/properties/${propertyId}/tour-engagement`, payload);

    return () => {
      const durationSeconds = Math.max(
        0,
        Math.round((Date.now() - startedAt) / 1000),
      );
      void apiClient.post(`/properties/${propertyId}/tour-engagement`, {
        ...payload,
        eventType: 'view_end',
        durationSeconds,
      });
    };
  }, [propertyId, provider]);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/20 border border-blue-400/30 p-2">
            <Box size={16} className="text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-xs text-blue-200/60 uppercase tracking-wider">
              {provider === 'unknown' ? 'embedded tour' : provider}
            </p>
          </div>
        </div>
        <a
          href={tourUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          Open in new tab
          <ExternalLink size={12} />
        </a>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900">
        <div className="pb-[56.25%]" />
        <iframe
          title="Virtual Property Tour"
          src={embedUrl}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
