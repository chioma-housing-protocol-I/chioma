'use client';

import React from 'react';
import KPICards from '@/components/dashboard/agent/KPICards';
import RecentListings from '@/components/dashboard/agent/RecentListings';
import WalletCard from '@/components/dashboard/agent/WalletCard';
import RecentPayouts from '@/components/dashboard/agent/RecentPayouts';
import NewLeads from '@/components/dashboard/agent/NewLeads';
import Link from 'next/link';
import { useState } from 'react';
import {
  loadAgentOnboardingData,
  type AgentOnboardingData,
} from '@/lib/agent-onboarding';

export default function AgentDashboardPage() {
  const [onboarding] = useState<AgentOnboardingData>(loadAgentOnboardingData);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {!onboarding.completed && (
        <section className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-amber-100">
              Complete your agent onboarding
            </h2>
            <p className="mt-1 text-sm text-amber-100/85">
              Finish profile, verification, commission setup, and lead tool
              activation to unlock the full agent experience.
            </p>
          </div>
          <Link
            href="/agents/onboarding"
            className="inline-flex items-center justify-center rounded-xl bg-amber-300 text-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-amber-200 transition-colors"
          >
            Continue Onboarding
          </Link>
        </section>
      )}

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
  );
}
