'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/loading';
import type { ComponentProps } from 'react';
import type PropertyMapViewComponent from './PropertyMapView';

const PropertyMapView = dynamic(() => import('./PropertyMapView'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

type PropertyMapViewProps = ComponentProps<typeof PropertyMapViewComponent>;

const MAP_ROOT_MARGIN = '200px';

function MapPlaceholder() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-600"
      aria-hidden="true"
    >
      <Spinner size="lg" label="Loading map" />
      <span className="text-sm">Loading map…</span>
    </div>
  );
}

/**
 * Defers Leaflet bundle loading until the map container nears the viewport.
 * Keeps a fixed-size placeholder to avoid layout shift while the chunk loads.
 */
export default function LazyPropertyMapView(props: PropertyMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: MAP_ROOT_MARGIN },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {shouldLoad ? <PropertyMapView {...props} /> : <MapPlaceholder />}
    </div>
  );
}
