"use client";

import React from "react";
import KPICards from "@/components/dashboard/KPICards";
import RevenueChart from "@/components/dashboard/RevenueChart";
import RecentActivity from "@/components/dashboard/RecentActivity";
import PropertyPortfolio from "@/components/dashboard/PropertyPortfolio";

export default function DashboardPage() {
  return (
      <div className="space-y-8">
        {/* KPI Cards */}
        <KPICards />

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