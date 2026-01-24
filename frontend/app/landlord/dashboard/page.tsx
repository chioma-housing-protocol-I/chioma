'use client';

import React from 'react';
import { KPICard, RevenueChart, RecentActivity, PropertyTable } from '@/components/dashboard';
import { mockDashboardData } from '@/data/mockDashboard';

export default function LandlordDashboardPage() {
    const { kpis, revenueData, activities, properties } = mockDashboardData;

    const handleWithdraw = () => {
        console.log('Withdraw initiated');
        // TODO: Implement actual withdraw flow
    };

    const handleManageProperty = (id: string) => {
        console.log('Managing property:', id);
        // TODO: Navigate to property management
    };

    const handleListProperty = (id: string) => {
        console.log('Listing property:', id);
        // TODO: Navigate to listing flow
    };

    const handleViewReport = (id: string) => {
        console.log('Viewing report for property:', id);
        // TODO: Navigate to property report
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            {/* Page Header */}
            <header>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                    Dashboard
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                    Welcome back! Here&apos;s an overview of your property portfolio.
                </p>
            </header>

            {/* KPI Cards Grid */}
            <section aria-label="Key Performance Indicators">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                    {/* Total Revenue */}
                    <KPICard
                        variant="revenue"
                        value={kpis.totalRevenue.value}
                        title={kpis.totalRevenue.title}
                        subtitle={kpis.totalRevenue.subtitle}
                        trend={kpis.totalRevenue.trend}
                    />

                    {/* Occupancy Rate */}
                    <KPICard
                        variant="occupancy"
                        value=""
                        title="Occupancy Rate"
                        occupancyRate={kpis.occupancyRate}
                    />

                    {/* Properties Owned */}
                    <KPICard
                        variant="properties"
                        value={kpis.propertiesOwned.value}
                        title={kpis.propertiesOwned.title}
                        subtitle={kpis.propertiesOwned.subtitle}
                    />

                    {/* Stellar Wallet */}
                    <KPICard
                        variant="wallet"
                        value={kpis.walletBalance.balance}
                        title="Stellar Wallet"
                        walletUsdEquivalent={kpis.walletBalance.usdEquivalent}
                        onWithdraw={handleWithdraw}
                    />
                </div>
            </section>

            {/* Revenue Analytics */}
            <RevenueChart data={revenueData} />

            {/* Activity & Properties Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                {/* Recent Activity - Takes 1/3 on XL screens */}
                <div className="xl:col-span-1">
                    <RecentActivity activities={activities} maxItems={5} />
                </div>

                {/* Property Table - Takes 2/3 on XL screens */}
                <div className="xl:col-span-2">
                    <PropertyTable
                        properties={properties}
                        onManage={handleManageProperty}
                        onListNow={handleListProperty}
                        onViewReport={handleViewReport}
                    />
                </div>
            </div>
        </div>
    );
}
