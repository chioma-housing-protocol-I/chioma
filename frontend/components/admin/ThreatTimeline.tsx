'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { ThreatStats } from '@/types/security';

const AreaChartWrapper = dynamic(() => import('@/components/charts/AreaChartWrapper'), {
  loading: () => <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl" />,
  ssr: false,
});

interface ThreatTimelineProps {
  stats: ThreatStats | null;
  loading: boolean;
}

export function ThreatTimeline({ stats, loading }: ThreatTimelineProps) {
  if (loading || !stats) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-3xl border border-white/10 bg-white/5" />
    );
  }

  const data = stats.threatsOverTime.map((point) => ({
    ...point,
    displayDate: new Date(point.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 h-[400px]">
      <h3 className="mb-6 text-lg font-semibold text-white">
        Threat Activity Timeline
      </h3>
      <div className="h-[300px] w-full">
        <AreaChartWrapper
          data={data}
          dataKeyX="displayDate"
          dataKeyY="count"
          strokeColor="#ef4444"
          name="Threats Detect"
        />
      </div>
    </div>
  );
}
