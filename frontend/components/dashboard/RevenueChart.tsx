'use client';

import React, { useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { TimeRangeDropdown } from './TimeRangeDropdown';
import { TimeRange, RevenueDataPoint } from '@/types/dashboard';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Target,
    Zap
} from 'lucide-react';

interface RevenueChartProps {
    data: Record<TimeRange, RevenueDataPoint[]>;
    className?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value: number; payload: RevenueDataPoint }>;
    label?: string;
}

// Enhanced custom tooltip
const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label,
}) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const value = payload[0].value;
        // Calculate percentage change (mock)
        const percentChange = Math.random() > 0.5 ? Math.random() * 15 : -Math.random() * 10;
        const isPositive = percentChange > 0;

        return (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 shadow-xl min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                        <DollarSign size={16} className="text-brand-blue" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{data.date}</p>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
                    </div>
                </div>

                <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3 mt-2">
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                        ${value?.toLocaleString()}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <span className="text-sm font-semibold">
                            {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">vs prev month</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// Stat card component
const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    color
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    subtext?: string;
    color: string;
}) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer group">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon size={18} className="text-white" />
        </div>
        <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">{value}</p>
            {subtext && <p className="text-xs text-neutral-400">{subtext}</p>}
        </div>
    </div>
);

export const RevenueChart: React.FC<RevenueChartProps> = ({
    data,
    className = '',
}) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('6months');
    const [chartType, setChartType] = useState<'area' | 'line'>('area');
    const chartData = data[timeRange];

    // Calculate stats
    const stats = useMemo(() => {
        if (!chartData || chartData.length === 0) return null;

        const revenues = chartData.map(d => d.revenue);
        const total = revenues.reduce((sum, r) => sum + r, 0);
        const avg = total / revenues.length;
        const highest = Math.max(...revenues);
        const lowest = Math.min(...revenues);
        const current = revenues[revenues.length - 1];
        const previous = revenues[revenues.length - 2] || revenues[0];
        const growth = ((current - previous) / previous) * 100;

        return { total, avg, highest, lowest, current, growth };
    }, [chartData]);

    // Format Y-axis values
    const formatYAxis = (value: number): string => {
        if (value === 0) return '$0';
        if (value >= 1000) return `$${value / 1000}k`;
        return `$${value}`;
    };

    return (
        <section
            className={`
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-sm overflow-hidden
        ${className}
      `}
            aria-label="Revenue Analytics"
        >
            {/* Header */}
            <div className="p-6 pb-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-indigo-600 flex items-center justify-center">
                                <TrendingUp size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    Revenue Analytics
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Track your rental income over time
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Chart type toggle */}
                        <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
                            <button
                                onClick={() => setChartType('area')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === 'area'
                                        ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                                    }`}
                            >
                                Area
                            </button>
                            <button
                                onClick={() => setChartType('line')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === 'line'
                                        ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                                    }`}
                            >
                                Line
                            </button>
                        </div>
                        <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
                    </div>
                </div>

                {/* Stats Row */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <StatCard
                            icon={DollarSign}
                            label="Total Revenue"
                            value={`$${stats.total.toLocaleString()}`}
                            color="bg-brand-blue"
                        />
                        <StatCard
                            icon={stats.growth >= 0 ? TrendingUp : TrendingDown}
                            label="Growth"
                            value={`${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`}
                            subtext="vs last period"
                            color={stats.growth >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
                        />
                        <StatCard
                            icon={Target}
                            label="Average"
                            value={`$${Math.round(stats.avg).toLocaleString()}`}
                            subtext="per month"
                            color="bg-purple-500"
                        />
                        <StatCard
                            icon={Zap}
                            label="Peak Revenue"
                            value={`$${stats.highest.toLocaleString()}`}
                            color="bg-amber-500"
                        />
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="h-[300px] sm:h-[350px] w-full px-2 pb-6">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        >
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.4} />
                                    <stop offset="50%" stopColor="#2563EB" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#E2E8F0"
                                strokeOpacity={0.5}
                                vertical={false}
                            />
                            {stats && (
                                <ReferenceLine
                                    y={stats.avg}
                                    stroke="#10B981"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    label={{
                                        value: `Avg: $${Math.round(stats.avg / 1000)}k`,
                                        position: 'right',
                                        fill: '#10B981',
                                        fontSize: 12,
                                        fontWeight: 600
                                    }}
                                />
                            )}
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                tickFormatter={formatYAxis}
                                dx={-10}
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#2563EB"
                                strokeWidth={3}
                                fill="url(#revenueGradient)"
                                dot={false}
                                activeDot={{
                                    r: 8,
                                    stroke: '#2563EB',
                                    strokeWidth: 3,
                                    fill: '#fff',
                                    filter: 'drop-shadow(0 4px 6px rgba(37, 99, 235, 0.3))',
                                }}
                                animationDuration={1500}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    ) : (
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#E2E8F0"
                                strokeOpacity={0.5}
                                vertical={false}
                            />
                            {stats && (
                                <ReferenceLine
                                    y={stats.avg}
                                    stroke="#10B981"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                />
                            )}
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                tickFormatter={formatYAxis}
                                dx={-10}
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2563EB', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#2563EB"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#fff', stroke: '#2563EB', strokeWidth: 2 }}
                                activeDot={{
                                    r: 8,
                                    stroke: '#2563EB',
                                    strokeWidth: 3,
                                    fill: '#fff',
                                    filter: 'drop-shadow(0 4px 6px rgba(37, 99, 235, 0.3))',
                                }}
                                animationDuration={1500}
                                animationEasing="ease-out"
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Footer with insights */}
            <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-700/50 border-t border-neutral-100 dark:border-neutral-700">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-brand-blue" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Revenue</span>
                        <span className="w-3 h-3 rounded-full bg-emerald-500 ml-4" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Average Line</span>
                    </div>
                    <button className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors flex items-center gap-1">
                        <Calendar size={14} />
                        View Full Report
                        <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default RevenueChart;
