'use client';

import React from 'react';
import { Home, FileText, Eye, TrendingUp } from 'lucide-react';
import { StellarLogo } from '@/components/icons/StellarLogo';

const KPICards = () => {
  const kpiData = [
    {
      label: 'Total Earnings',
      value: '$42,500',
      subValue: 'USDC',
      trend: '+12% this month',
      isPositive: true,
      icon: StellarLogo,
      iconBg: 'bg-white/5',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Active Properties',
      value: '12',
      footer: 'Total count',
      icon: Home,
      iconBg: 'bg-white/5',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Pending Contracts',
      value: '3',
      footer: 'Total count',
      icon: FileText,
      iconBg: 'bg-white/5',
      iconColor: 'text-orange-400',
    },
    {
      label: 'Total Views',
      value: '1,240',
      footer: 'Total count',
      icon: Eye,
      iconBg: 'bg-white/5',
      iconColor: 'text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon;

        return (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-300 group flex flex-col justify-between h-40"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                  {kpi.label}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {kpi.value}
                  </span>
                  {kpi.subValue && (
                    <span className="text-xs font-bold text-blue-300/40 tracking-wider">
                      {kpi.subValue}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`w-10 h-10 rounded-xl ${kpi.iconBg} ${kpi.iconColor} border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                {kpi.label === 'Total Earnings' ? (
                  <StellarLogo size={20} color="#34d399" />
                ) : (
                  <Icon size={20} />
                )}
              </div>
            </div>

            <div className="mt-auto">
              {kpi.trend ? (
                <div className="flex items-center text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <TrendingUp size={14} className="mr-1.5" />
                  {kpi.trend}
                </div>
              ) : (
                <div className="text-[10px] text-blue-300/40 font-bold uppercase tracking-widest">
                  {kpi.footer}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
