'use client';

import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const data = [
  { name: 'Jan', value: 1200 },
  { name: 'Feb', value: 1200 },
  { name: 'Mar', value: 1200 },
  { name: 'Apr', value: 1200 },
  { name: 'May', value: 1200 },
  { name: 'Jun', value: 1200 },
  { name: 'Jul', value: 1200 },
  { name: 'Aug', value: 0 }, // Unpaid or future
  { name: 'Sep', value: 0 },
  { name: 'Oct', value: 0 },
  { name: 'Nov', value: 0 },
  { name: 'Dec', value: 0 },
];

export function MicroCharts() {
  return (
    <div className="h-24 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-2xl border border-white/10 uppercase tracking-wider">
                    {payload[0].payload.name}: ${payload[0].value}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={16}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value > 0 ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
