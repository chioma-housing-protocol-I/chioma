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

interface BarSeries {
  key: string;
  name: string;
  fill: string;
}

interface MultiBarChartWrapperProps {
  data: any[];
  dataKeyX: string;
  series: BarSeries[];
}

export default function MultiBarChartWrapper({
  data,
  dataKeyX,
  series,
}: MultiBarChartWrapperProps) {
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
          stroke="rgba(255,255,255,0.5)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.5)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.fill}
            radius={[4, 4, 0, 0]}
            barSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
