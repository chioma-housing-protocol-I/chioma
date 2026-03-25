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
      iconBg: 'bg-white/5',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Occupancy Rate',
      value: '92%',
      target: 'Target: 95%',
      progress: 92,
      icon: Building2,
      iconBg: 'bg-white/5',
      iconColor: 'text-emerald-400',
      showProgress: true,
    },
    {
      label: 'Properties Owned',
      value: '12',
      sublabel: '2 Vacant',
      icon: Building2,
      iconBg: 'bg-white/5',
      iconColor: 'text-indigo-400',
      badge: {
        text: '2 Vacant',
        color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
      },
    },
    {
      label: 'Stellar Wallet',
      value: '45,200 XLM',
      action: 'Withdraw Funds',
      icon: Wallet,
      iconBg: 'bg-white/5',
      iconColor: 'text-blue-400',
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
            className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-300 group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-blue-200/60 font-bold uppercase tracking-widest">
                  {kpi.label}
                </p>
                {kpi.sublabel && (
                  <p className="text-[10px] text-blue-300/40 mt-1 font-bold uppercase tracking-wider">
                    {kpi.sublabel}
                  </p>
                )}
              </div>
              <div
                className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform`}
              >
                <Icon className={`${kpi.iconColor}`} size={20} />
              </div>
            </div>

            {/* Value */}
            <div className="mb-4">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {kpi.value}
              </h3>
            </div>

            {/* Footer Content */}
            {kpi.change && (
              <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider">
                <span
                  className={`${
                    kpi.isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-blue-300/40">{kpi.changeLabel}</span>
              </div>
            )}

            {kpi.showProgress && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-3">
                  <span>{kpi.target}</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              </div>
            )}

            {kpi.badge && (
              <div className="flex items-center">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${kpi.badge.color}`}
                >
                  {kpi.badge.text}
                </span>
              </div>
            )}

            {kpi.showAction && (
              <button className="flex items-center space-x-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest group">
                <span>{kpi.action}</span>
                <ArrowRight
                  size={14}
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
