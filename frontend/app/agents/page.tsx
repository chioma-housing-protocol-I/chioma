"use client";

import React from "react";
import DashboardLayout from "@/components/dashboard/agent/DashboardLayout";
import KPICards from "@/components/dashboard/agent/KPICards";
import RecentListings from "@/components/dashboard/agent/RecentListings";
import WalletCard from "@/components/dashboard/agent/WalletCard";
import RecentPayouts from "@/components/dashboard/agent/RecentPayouts";
import NewLeads from "@/components/dashboard/agent/NewLeads";

export default function AgentDashboardPage() {
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Top KPI Cards */}
                <KPICards />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column - Listings (Takes 2/3) */}
                    <div className="xl:col-span-2">
                        <RecentListings />
                    </div>

                    {/* Right Column - Widgets (Takes 1/3) */}
                    <div className="space-y-6">
                        <WalletCard />
                        <RecentPayouts />
                        <NewLeads />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
