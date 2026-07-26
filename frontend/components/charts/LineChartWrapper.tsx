'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface LineChartWrapperProps {
  data: any[];
  dataKeyX: string;
  dataKeyY: string;
  strokeColor?: string;
  name?: string;
}

export default function LineChartWrapper({
  data,
  dataKeyX,
  dataKeyY,
  strokeColor = '#38bdf8',
  name = 'Value',
}: LineChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.1)"
          vertical={false}
        />
        <XAxis
          dataKey={dataKeyX}
          stroke="rgba(255,255,255,0.55)"
          tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.55)"
          tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKeyY}
          stroke={strokeColor}
          strokeWidth={3}
          dot={false}
          name={name}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
