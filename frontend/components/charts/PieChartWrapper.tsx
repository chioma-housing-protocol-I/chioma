'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface PieChartWrapperProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
}

export default function PieChartWrapper({
  data,
  dataKey,
  nameKey,
  colors,
}: PieChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          outerRadius={95}
          innerRadius={50}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
