'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown } from 'lucide-react';

const RevenueChart = () => {
  const [timeRange] = useState('Last 6 Months');

  const revenueData = [
    { month: 'Jan', revenue: 2.0 },
    { month: 'Feb', revenue: 2.5 },
    { month: 'Mar', revenue: 3.0 },
    { month: 'Apr', revenue: 3.2 },
    { month: 'May', revenue: 4.0 },
    { month: 'Jun', revenue: 5.0 },
  ];

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '₦0M';
    return `₦${value}M`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-neutral-900">
          Revenue Analytics
        </h2>
        <div className="relative">
          <button className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors">
            <span>{timeRange}</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={revenueData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number | undefined) => {
                if (value === undefined) return ['₦0M', 'Revenue'];
                return [formatValue(value), 'Revenue'];
              }}
              labelStyle={{ fontWeight: 600, color: '#111827' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{
                fill: '#2563EB',
                strokeWidth: 2,
                r: 4,
                stroke: '#fff',
              }}
              activeDot={{
                r: 6,
                fill: '#2563EB',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              fill="url(#colorRevenue)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
