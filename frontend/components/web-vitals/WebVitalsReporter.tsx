'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVital, setWebVitalSink } from '@/lib/web-vitals';
import { useWebVitalsStore } from '@/store/webVitalsStore';

/**
 * Mounts once at the root. Collects real-user Web Vitals via next/web-vitals
 * and forwards anonymized payloads to the in-app store + API sink.
 *
 * Callback identity is stable so Next does not re-emit historical metrics
 * on every render (see useReportWebVitals docs).
 */
export function WebVitalsReporter() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const addMetric = useWebVitalsStore((s) => s.addMetric);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setWebVitalSink(addMetric);
    return () => setWebVitalSink(null);
  }, [addMetric]);

  const onReport = useCallback(
    (metric: Parameters<typeof reportWebVital>[0]) => {
      reportWebVital(metric, pathnameRef.current);
    },
    [],
  );

  useReportWebVitals(onReport);

  return null;
}
