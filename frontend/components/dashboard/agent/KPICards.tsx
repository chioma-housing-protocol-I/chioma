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
      icon: StellarLogo, // Using StellarLogo component
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Active Properties',
      value: '12',
      footer: 'Total count',
      icon: Home,
      iconBg: 'bg-blue-100',
      iconColor: 'text-brand-blue',
    },
    {
      label: 'Pending Contracts',
      value: '3',
      footer: 'Total count',
      icon: FileText,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Total Views',
      value: '1,240',
      footer: 'Total count',
      icon: Eye,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon;

        return (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 flex flex-col justify-between h-40"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-neutral-500">
                  {kpi.label}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-neutral-900 tracking-tight">
                    {kpi.value}
                  </span>
                  {kpi.subValue && (
                    <span className="text-sm font-bold text-neutral-400">
                      {kpi.subValue}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`p-3 rounded-full ${kpi.iconBg} ${kpi.iconColor}`}
              >
                {kpi.label === 'Total Earnings' ? (
                  <StellarLogo size={20} color="#059669" />
                ) : (
                  <Icon size={20} />
                )}
              </div>
            </div>

            <div className="mt-auto">
              {kpi.trend ? (
                <div className="flex items-center text-sm font-semibold text-emerald-600">
                  <TrendingUp size={16} className="mr-1.5" />
                  {kpi.trend}
                </div>
              ) : (
                <div className="text-sm text-neutral-400 font-medium">
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
