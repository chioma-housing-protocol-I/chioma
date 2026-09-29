'use client';

import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';
import { FeatureBoundary } from '@/components/error/FeatureBoundary';

const chartLoading = (height: string | number = '100%') =>
  function ChartLoading() {
    return <ChartSkeleton height={height} />;
  };

/**
 * Wraps a lazily-loaded chart in its own FeatureBoundary so a render error
 * in one chart (e.g. malformed data) can't blank the rest of the dashboard.
 */
function withChartBoundary<P extends object>(
  Component: ComponentType<P>,
  name: string,
) {
  return function ChartBoundary(props: P) {
    return (
      <FeatureBoundary name={name} label="Chart">
        <Component {...props} />
      </FeatureBoundary>
    );
  };
}

const RawAreaChartWrapper = dynamic(() => import('./AreaChartWrapper'), {
  loading: chartLoading(),
  ssr: false,
});
export const LazyAreaChartWrapper = withChartBoundary(
  RawAreaChartWrapper,
  'chart:area',
);

const RawBarChartWrapper = dynamic(() => import('./BarChartWrapper'), {
  loading: chartLoading(),
  ssr: false,
});
export const LazyBarChartWrapper = withChartBoundary(
  RawBarChartWrapper,
  'chart:bar',
);

const RawLineChartWrapper = dynamic(() => import('./LineChartWrapper'), {
  loading: chartLoading(),
  ssr: false,
});
export const LazyLineChartWrapper = withChartBoundary(
  RawLineChartWrapper,
  'chart:line',
);

const RawPieChartWrapper = dynamic(() => import('./PieChartWrapper'), {
  loading: chartLoading(),
  ssr: false,
});
export const LazyPieChartWrapper = withChartBoundary(
  RawPieChartWrapper,
  'chart:pie',
);

const RawMultiLineChartWrapper = dynamic(
  () => import('./MultiLineChartWrapper'),
  { loading: chartLoading(), ssr: false },
);
export const LazyMultiLineChartWrapper = withChartBoundary(
  RawMultiLineChartWrapper,
  'chart:multi-line',
);

const RawMultiBarChartWrapper = dynamic(
  () => import('./MultiBarChartWrapper'),
  { loading: chartLoading(), ssr: false },
);
export const LazyMultiBarChartWrapper = withChartBoundary(
  RawMultiBarChartWrapper,
  'chart:multi-bar',
);

const RawMicroCharts = dynamic(
  () =>
    import('@/components/dashboard/MicroCharts').then((mod) => ({
      default: mod.MicroCharts,
    })),
  { loading: chartLoading('6rem'), ssr: false },
);
export const LazyMicroCharts = withChartBoundary(RawMicroCharts, 'chart:micro');

const RawAnalyticsPreviewChart = dynamic(
  () => import('@/components/dashboard/AnalyticsPreviewChart'),
  { loading: chartLoading('10rem'), ssr: false },
);
export const LazyAnalyticsPreviewChart = withChartBoundary(
  RawAnalyticsPreviewChart,
  'chart:analytics-preview',
);

const RawCityMarketTrendsChart = dynamic(
  () => import('./CityMarketTrendsChart'),
  { loading: chartLoading('18rem'), ssr: false },
);
export const LazyCityMarketTrendsChart = withChartBoundary(
  RawCityMarketTrendsChart,
  'chart:city-market-trends',
);

const RawSystemAnalytics = dynamic(
  () =>
    import('@/components/admin/SystemAnalytics').then((mod) => ({
      default: mod.SystemAnalytics,
    })),
  { loading: chartLoading('24rem'), ssr: false },
);
export const LazySystemAnalytics = withChartBoundary(
  RawSystemAnalytics,
  'chart:system-analytics',
);
