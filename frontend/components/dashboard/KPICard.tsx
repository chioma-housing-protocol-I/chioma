'use client';

import React from 'react';
import {
    DollarSign,
    Building2,
    Wallet,
    TrendingUp,
    TrendingDown,
    LucideIcon
} from 'lucide-react';
import { OccupancyProgress } from './OccupancyProgress';

type KPIVariant = 'revenue' | 'occupancy' | 'properties' | 'wallet';

interface KPICardProps {
    variant: KPIVariant;
    value: string;
    title: string;
    subtitle?: string;
    trend?: {
        direction: 'up' | 'down';
        percentage: number;
    };
    occupancyRate?: number;
    walletUsdEquivalent?: string;
    onWithdraw?: () => void;
    className?: string;
}

const iconMap: Record<KPIVariant, LucideIcon> = {
    revenue: DollarSign,
    occupancy: Building2,
    properties: Building2,
    wallet: Wallet,
};

const bgGradientMap: Record<KPIVariant, string> = {
    revenue: 'from-emerald-500/10 to-emerald-600/5',
    occupancy: 'from-blue-500/10 to-blue-600/5',
    properties: 'from-purple-500/10 to-purple-600/5',
    wallet: 'from-amber-500/10 to-amber-600/5',
};

const iconBgMap: Record<KPIVariant, string> = {
    revenue: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    occupancy: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    properties: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    wallet: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

export const KPICard: React.FC<KPICardProps> = ({
    variant,
    value,
    title,
    subtitle,
    trend,
    occupancyRate,
    walletUsdEquivalent,
    onWithdraw,
    className = '',
}) => {
    const Icon = iconMap[variant];

    // Handle Withdraw button click
    const handleWithdraw = () => {
        if (onWithdraw) {
            onWithdraw();
        } else {
            console.log('Withdraw clicked - no handler provided');
        }
    };

    // Occupancy variant has different layout
    if (variant === 'occupancy' && occupancyRate !== undefined) {
        return (
            <article
                className={`
          relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800
          border border-neutral-200 dark:border-neutral-700
          p-6 shadow-sm hover:shadow-lg transition-all duration-300
          hover:-translate-y-0.5
          ${className}
        `}
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGradientMap[variant]} pointer-events-none`} />

                <div className="relative flex flex-col items-center text-center">
                    <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-4">
                        {title}
                    </h3>
                    <OccupancyProgress percentage={occupancyRate} size={100} strokeWidth={8} />
                    <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                        Occupancy Rate
                    </p>
                </div>
            </article>
        );
    }

    // Wallet variant includes a CTA button
    if (variant === 'wallet') {
        return (
            <article
                className={`
          relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800
          border border-neutral-200 dark:border-neutral-700
          p-6 shadow-sm hover:shadow-lg transition-all duration-300
          hover:-translate-y-0.5
          ${className}
        `}
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${bgGradientMap[variant]} pointer-events-none`} />

                <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${iconBgMap[variant]}`}>
                            <Icon size={24} />
                        </div>
                    </div>

                    <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                        {title}
                    </h3>

                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                        {value}
                    </p>

                    {walletUsdEquivalent && (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                            ≈ {walletUsdEquivalent} USD
                        </p>
                    )}

                    <button
                        onClick={handleWithdraw}
                        className="
              w-full mt-2 px-4 py-2.5 rounded-xl
              bg-brand-blue hover:bg-brand-blue-dark
              text-white font-semibold text-sm
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2
              dark:focus:ring-offset-neutral-800
            "
                        aria-label="Withdraw funds from wallet"
                    >
                        Withdraw
                    </button>
                </div>
            </article>
        );
    }

    // Default variant (revenue, properties)
    return (
        <article
            className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-700
        p-6 shadow-sm hover:shadow-lg transition-all duration-300
        hover:-translate-y-0.5
        ${className}
      `}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradientMap[variant]} pointer-events-none`} />

            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${iconBgMap[variant]}`}>
                        <Icon size={24} />
                    </div>

                    {trend && (
                        <div
                            className={`
                flex items-center space-x-1 text-sm font-semibold
                ${trend.direction === 'up'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }
              `}
                            aria-label={`Trend: ${trend.direction === 'up' ? 'up' : 'down'} ${trend.percentage}%`}
                        >
                            {trend.direction === 'up' ? (
                                <TrendingUp size={18} />
                            ) : (
                                <TrendingDown size={18} />
                            )}
                            <span>{trend.percentage}%</span>
                        </div>
                    )}
                </div>

                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                    {title}
                </h3>

                <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
                    {value}
                </p>

                {subtitle && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {subtitle}
                    </p>
                )}
            </div>
        </article>
    );
};

export default KPICard;
