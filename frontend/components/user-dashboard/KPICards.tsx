'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { KPICardsProps } from './types';

/**
 * Key Performance Indicator cards
 * Displays metrics with optional trend indicators
 */
export function KPICards({ data, columns = 4, className = '' }: KPICardsProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {data.map((kpi, index) => {
        const colorClass = {
          blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          green: 'bg-green-500/10 border-green-500/20 text-green-400',
          red: 'bg-red-500/10 border-red-500/20 text-red-400',
          yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        }[kpi.color || 'blue'];

        const trendIcon =
          kpi.changeType === 'increase' ? (
            <TrendingUp size={16} className="text-green-400" />
          ) : kpi.changeType === 'decrease' ? (
            <TrendingDown size={16} className="text-red-400" />
          ) : null;

        return (
          <div
            key={index}
            className={`rounded-2xl border p-6 backdrop-blur-sm transition-all hover:border-opacity-100 ${colorClass}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-blue-200/70 mb-1">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
              </div>
              {kpi.icon && (
                <div className="text-2xl opacity-50">{kpi.icon}</div>
              )}
            </div>

            {kpi.change !== undefined && (
              <div className="flex items-center gap-2">
                {trendIcon}
                <span
                  className={`text-sm font-medium ${
                    kpi.changeType === 'increase'
                      ? 'text-green-400'
                      : kpi.changeType === 'decrease'
                        ? 'text-red-400'
                        : 'text-blue-200/70'
                  }`}
                >
                  {kpi.change > 0 ? '+' : ''}
                  {kpi.change}%
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default KPICards;
