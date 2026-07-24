'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface AreaChartWrapperProps {
  data: any[];
  dataKeyX: string;
  dataKeyY: string;
  fillColor?: string;
  strokeColor?: string;
  name?: string;
  formatter?: (value: any) => string;
}

export default function AreaChartWrapper({
  data,
  dataKeyX,
  dataKeyY,
  fillColor = 'rgba(56, 189, 248, 0.1)',
  strokeColor = '#38bdf8',
  name = 'Value',
  formatter,
}: AreaChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey={dataKeyX}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.4)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          tickFormatter={formatter}
        />
        <Tooltip
          formatter={formatter}
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKeyY}
          stroke={strokeColor}
          fillOpacity={1}
          fill="url(#areaGradient)"
          name={name}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
