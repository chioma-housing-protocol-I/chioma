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
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Revenue Analytics
        </h2>
        <div className="relative">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-blue-200 transition-colors shadow-lg">
            <span>{timeRange}</span>
            <ChevronDown size={14} />
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
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="rgba(255, 255, 255, 0.3)"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.3)"
              style={{ fontSize: '10px', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                padding: '12px',
              }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}
              labelStyle={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
              cursor={{ stroke: 'rgba(59, 130, 246, 0.5)', strokeWidth: 2 }}
              formatter={(value: number | undefined) => {
                if (value === undefined) return ['₦0M', 'Revenue'];
                return [`₦${value}M`, 'Revenue'];
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={4}
              dot={{
                fill: '#1e40af',
                strokeWidth: 2,
                r: 5,
                stroke: '#3b82f6',
              }}
              activeDot={{
                r: 7,
                fill: '#2563eb',
                stroke: '#fff',
                strokeWidth: 3,
              }}
              fill="url(#colorRevenue)"
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
