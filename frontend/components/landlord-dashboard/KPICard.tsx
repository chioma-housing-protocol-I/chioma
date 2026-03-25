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
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>

      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
          {title}
        </h3>
        <div className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-blue-400/60 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>

      <div className="relative">
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>

        {trend && (
          <div className="mt-3 flex items-center space-x-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {trend.isPositive ? '+' : '-'}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
              Growth
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
