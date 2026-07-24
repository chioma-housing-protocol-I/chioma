'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Building2,
  Heart,
  BarChart3,
} from 'lucide-react';
import { useLandlordPropertyAnalytics } from '@/lib/query/hooks/use-property-analytics';
import dynamic from 'next/dynamic';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from 'recharts';

const LineChartWrapper = dynamic(
  () => import('@/components/charts/LineChartWrapper'),
  {
    loading: () => (
      <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl" />
    ),
    ssr: false,
  },
);

const PieChartWrapper = dynamic(
  () => import('@/components/charts/PieChartWrapper'),
  {
    loading: () => (
      <div className="h-full w-full bg-white/5 animate-pulse rounded-2xl" />
    ),
    ssr: false,
  },
);

const PIE_COLORS = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#2563eb'];

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 h-full ${href ? 'transition-colors hover:bg-white/10' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-blue-200/70 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          <p className="text-xs text-blue-200/50 mt-1">{subtitle}</p>
        </div>
        <div className="rounded-2xl p-2 bg-sky-500/15 border border-sky-400/20 text-sky-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function UserAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useLandlordPropertyAnalytics(days);

  const trendData = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.marketTrends.inquiryTrend.map((point) => ({
      ...point,
      shortDate: point.date.slice(5),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-12 w-64 rounded-xl bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-3xl bg-white/10 animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 rounded-3xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
        Failed to load analytics dashboard data. Please try again in a moment.
      </div>
    );
  }

  const { summary, performance, marketTrends, topPerformingProperties } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Property Analytics
          </h1>
          <p className="text-blue-200/60 mt-1">
            Views, inquiries, conversion, and market performance for your
            listings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-200/70">Range</span>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          title="Total Views"
          value={summary.totalViews.toLocaleString()}
          subtitle={`Across ${summary.totalProperties} properties`}
          icon={Eye}
        />
        <MetricCard
          title="Total Inquiries"
          value={summary.totalInquiries.toLocaleString()}
          subtitle={`${performance.averageInquiriesPerProperty} avg per property`}
          icon={MessageSquare}
          href="/user/inquiries"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${summary.conversionRate}%`}
          subtitle="Inquiries per view"
          icon={TrendingUp}
        />
        <MetricCard
          title="Favorites"
          value={summary.totalFavorites.toLocaleString()}
          subtitle={`${performance.favoriteToViewRate}% favorite/view rate`}
          icon={Heart}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Inquiry Trend</h2>
            <span className="text-xs text-blue-200/60">
              Near real-time refresh every 30s
            </span>
          </div>
          <div className="h-80">
            <LineChartWrapper
              data={trendData}
              dataKeyX="shortDate"
              dataKeyY="inquiries"
              strokeColor="#38bdf8"
              name="Inquiries"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            Listing Status Mix
          </h2>
          <div className="h-72">
            <PieChartWrapper
              data={marketTrends.listingStatusDistribution}
              dataKey="count"
              nameKey="status"
              colors={PIE_COLORS}
            />
          </div>
          <div className="space-y-2 mt-2">
            {marketTrends.listingStatusDistribution.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-blue-100">{item.status}</span>
                <span className="text-blue-200/70">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            City Market Trends
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketTrends.cityTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="city"
                  stroke="rgba(255,255,255,0.55)"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.55)"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                />
                <Bar
                  dataKey="totalViews"
                  name="Views"
                  fill="#38bdf8"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="totalInquiries"
                  name="Inquiries"
                  fill="#22c55e"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            Host Performance
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 text-emerald-300 text-sm">
                <Building2 className="h-4 w-4" /> Published Listings
              </div>
              <p className="text-white text-xl font-bold mt-2">
                {summary.publishedProperties}
              </p>
            </div>
            <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-4">
              <div className="flex items-center gap-2 text-sky-300 text-sm">
                <BarChart3 className="h-4 w-4" /> Avg Views / Property
              </div>
              <p className="text-white text-xl font-bold mt-2">
                {performance.averageViewsPerProperty}
              </p>
            </div>
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4">
              <div className="flex items-center gap-2 text-indigo-300 text-sm">
                <Sparkles className="h-4 w-4" /> Response Rate
              </div>
              <p className="text-white text-xl font-bold mt-2">
                {performance.inquiryResponseRate}%
              </p>
            </div>
            <div className="rounded-2xl bg-pink-500/10 border border-pink-500/20 p-4">
              <div className="flex items-center gap-2 text-pink-300 text-sm">
                <Heart className="h-4 w-4" /> Favorite / View
              </div>
              <p className="text-white text-xl font-bold mt-2">
                {performance.favoriteToViewRate}%
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-wide text-blue-200/65 mb-3">
              Top Performing Properties
            </h3>
            <div className="space-y-3 max-h-52 overflow-auto pr-1">
              {topPerformingProperties.map((property) => (
                <div
                  key={property.propertyId}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white font-medium truncate">
                      {property.title}
                    </p>
                    <span className="text-xs text-sky-300">
                      {property.conversionRate}% CVR
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/60 mt-1">
                    {property.city || 'Unspecified city'}
                  </p>
                  <p className="text-xs text-blue-100/80 mt-2">
                    {property.viewCount} views · {property.inquiryCount}{' '}
                    inquiries · {property.favoriteCount} favorites
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
