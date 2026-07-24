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

interface Series {
  key: string;
  name: string;
  stroke: string;
}

interface MultiLineChartWrapperProps {
  data: any[];
  dataKeyX: string;
  series: Series[];
  tickFormatter?: (val: any) => string;
}

export default function MultiLineChartWrapper({
  data,
  dataKeyX,
  series,
  tickFormatter,
}: MultiLineChartWrapperProps) {
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
          stroke="rgba(255,255,255,0.5)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
          tickFormatter={tickFormatter}
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
          itemStyle={{ color: '#fff' }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.stroke}
            strokeWidth={3}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
