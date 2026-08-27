'use client';

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface CityTrendPoint {
  city: string;
  totalViews: number;
  totalInquiries: number;
}

interface CityMarketTrendsChartProps {
  data: CityTrendPoint[];
}

export default function CityMarketTrendsChart({
  data,
}: CityMarketTrendsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
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
  );
}
