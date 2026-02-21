'use client';

import React from 'react';
import { Home, Users, DollarSign, PenTool } from 'lucide-react';
import KPICard from '@/components/landlord-dashboard/KPICard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import PropertyPortfolio from '@/components/dashboard/PropertyPortfolio';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Overview</h1>
          <p className="text-neutral-500 mt-1">
            Here&apos;s what&apos;s happening with your properties today.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Properties"
          value={12}
          icon={Home}
          trend={{ value: 8.5, isPositive: true }}
        />
        <KPICard
          title="Active Tenants"
          value={48}
          icon={Users}
          trend={{ value: 2.1, isPositive: true }}
        />
        <KPICard
          title="Monthly Revenue"
          value="$24,500"
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="Pending Signatures"
          value={3}
          icon={PenTool}
          trend={{ value: 1.2, isPositive: false }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Revenue Chart - Takes 2 columns */}
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>

        {/* Recent Activity - Takes 1 column */}
        <div>
          <RecentActivity />
        </div>
      </div>

      {/* Property Portfolio Table */}
      <PropertyPortfolio />
    </div>
  );
}
