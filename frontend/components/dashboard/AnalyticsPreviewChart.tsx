'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

const analyticsPreviewData = [
  { month: 'Jan', views: 120 },
  { month: 'Feb', views: 180 },
  { month: 'Mar', views: 240 },
  { month: 'Apr', views: 200 },
  { month: 'May', views: 320 },
  { month: 'Jun', views: 410 },
];

export default function AnalyticsPreviewChart() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart
        data={analyticsPreviewData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <defs>
          <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{
            fill: 'rgba(147, 197, 253, 0.4)',
            fontSize: 10,
            fontWeight: 700,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '8px 12px',
          }}
          itemStyle={{ color: '#fff', fontSize: '12px' }}
          labelStyle={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
          }}
        />
        <Area
          type="monotone"
          dataKey="views"
          stroke="#60a5fa"
          strokeWidth={2.5}
          fill="url(#analyticsGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
