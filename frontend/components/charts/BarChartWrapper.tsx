'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface BarChartWrapperProps {
  data: any[];
  dataKeyX: string;
  dataKeyY: string;
  fillColor?: string;
  name?: string;
}

export default function BarChartWrapper({
  data,
  dataKeyX,
  dataKeyY,
  fillColor = '#38bdf8',
  name = 'Value',
}: BarChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
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
        <Bar
          dataKey={dataKeyY}
          fill={fillColor}
          radius={[4, 4, 0, 0]}
          name={name}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
