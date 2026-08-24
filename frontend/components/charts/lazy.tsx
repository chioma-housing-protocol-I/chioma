'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';

const chartLoading = (height: string | number = '100%') =>
  function ChartLoading() {
    return <ChartSkeleton height={height} />;
  };

export const LazyAreaChartWrapper = dynamic(
  () => import('./AreaChartWrapper'),
  { loading: chartLoading(), ssr: false },
);

export const LazyBarChartWrapper = dynamic(
  () => import('./BarChartWrapper'),
  { loading: chartLoading(), ssr: false },
);

export const LazyLineChartWrapper = dynamic(
  () => import('./LineChartWrapper'),
  { loading: chartLoading(), ssr: false },
);

export const LazyPieChartWrapper = dynamic(
  () => import('./PieChartWrapper'),
  { loading: chartLoading(), ssr: false },
);

export const LazyMultiLineChartWrapper = dynamic(
  () => import('./MultiLineChartWrapper'),
  { loading: chartLoading(), ssr: false },
);

export const LazyMultiBarChartWrapper = dynamic(
  () => import('./MultiBarChartWrapper'),
  { loading: chartLoading(), ssr: false },
);

export const LazyMicroCharts = dynamic(
  () =>
    import('@/components/dashboard/MicroCharts').then((mod) => ({
      default: mod.MicroCharts,
    })),
  { loading: chartLoading('6rem'), ssr: false },
);

export const LazyAnalyticsPreviewChart = dynamic(
  () => import('@/components/dashboard/AnalyticsPreviewChart'),
  { loading: chartLoading('10rem'), ssr: false },
);

export const LazyCityMarketTrendsChart = dynamic(
  () => import('./CityMarketTrendsChart'),
  { loading: chartLoading('18rem'), ssr: false },
);

export const LazySystemAnalytics = dynamic(
  () =>
    import('@/components/admin/SystemAnalytics').then((mod) => ({
      default: mod.SystemAnalytics,
    })),
  { loading: chartLoading('24rem'), ssr: false },
);
