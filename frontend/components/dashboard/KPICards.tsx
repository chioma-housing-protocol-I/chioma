'use client';

import React from 'react';
import { Building2, Wallet, ArrowRight } from 'lucide-react';

const KPICards = () => {
  const kpiData = [
    {
      label: 'Total Revenue',
      sublabel: '(YTD)',
      value: '₦45.2M',
      change: '+12%',
      changeLabel: 'vs last month',
      isPositive: true,
      icon: Wallet,
      iconBg: 'bg-blue-100',
      iconColor: 'text-brand-blue',
    },
    {
      label: 'Occupancy Rate',
      value: '92%',
      target: 'Target: 95%',
      progress: 92,
      icon: Building2,
      iconBg: 'bg-green-100',
      iconColor: 'text-brand-green',
      showProgress: true,
    },
    {
      label: 'Properties Owned',
      value: '12',
      sublabel: '2 Vacant',
      icon: Building2,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      badge: {
        text: '2 Vacant',
        color: 'bg-orange-100 text-orange-600',
      },
    },
    {
      label: 'Stellar Wallet',
      value: '45,200 XLM',
      action: 'Withdraw Funds',
      icon: Wallet,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      showAction: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {kpiData.map((kpi, index) => {
        const Icon = kpi.icon;

        return (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-neutral-500 font-medium">
                  {kpi.label}
                </p>
                {kpi.sublabel && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {kpi.sublabel}
                  </p>
                )}
              </div>
              <div className={`p-2.5 rounded-lg ${kpi.iconBg}`}>
                <Icon className={`${kpi.iconColor}`} size={20} />
              </div>
            </div>

            {/* Value */}
            <div className="mb-3">
              <h3 className="text-3xl font-bold text-neutral-900">
                {kpi.value}
              </h3>
            </div>

            {/* Footer Content */}
            {kpi.change && (
              <div className="flex items-center space-x-2 text-sm">
                <span
                  className={`font-semibold ${
                    kpi.isPositive ? 'text-brand-green' : 'text-red-500'
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-neutral-400">{kpi.changeLabel}</span>
              </div>
            )}

            {kpi.showProgress && (
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                  <span>{kpi.target}</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-green rounded-full transition-all duration-500"
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              </div>
            )}

            {kpi.badge && (
              <div className="flex items-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${kpi.badge.color}`}
                >
                  {kpi.badge.text}
                </span>
              </div>
            )}

            {kpi.showAction && (
              <button className="flex items-center space-x-2 text-sm font-semibold text-brand-blue hover:text-brand-blue-dark transition-colors group">
                <span>{kpi.action}</span>
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
