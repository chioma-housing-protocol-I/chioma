import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function KPICard({
  title,
  value,
  icon: Icon,
  trend,
}: KPICardProps) {
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-blue/10 rounded-full blur-2xl group-hover:bg-brand-blue/20 transition-all duration-500"></div>

      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
          {title}
        </h3>
        <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600 group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300">
          <Icon size={20} />
        </div>
      </div>

      <div className="relative">
        <p className="text-3xl font-bold text-neutral-900 tracking-tight">
          {value}
        </p>

        {trend && (
          <div className="mt-2 flex items-center space-x-1">
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {trend.isPositive ? '+' : '-'}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-neutral-400">vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
