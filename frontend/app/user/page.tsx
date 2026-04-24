'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  ArrowUpRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { MicroCharts } from '@/components/dashboard/MicroCharts';
import { TenantOnboardingBanner } from '@/components/user/TenantOnboardingBanner';
import { useRoleRedirect } from '@/hooks/useRoleRedirect';
import { useModal } from '@/contexts/ModalContext';
import { apiClient } from '@/lib/api-client';
import type { AgreementSigningData } from '@/components/modals/types';

const mockAgreements = [
  {
    id: 'AGR-4921',
    property: 'Sunset Apartments, Unit 4B',
    amount: '$1,200',
    dueDate: 'Oct 1, 2023',
    status: 'Active',
  },
  {
    id: 'AGR-4922',
    property: 'Downtown Loft, Unit 12',
    amount: '$2,500',
    dueDate: 'Nov 1, 2023',
    status: 'Pending',
  },
  {
    id: 'AGR-3810',
    property: 'Suburban Home',
    amount: '$1,800',
    dueDate: 'Sep 1, 2023',
    status: 'Completed',
  },
];

const agreements = process.env.NODE_ENV === 'production' ? [] : mockAgreements;

const analyticsPreviewData = [
  { month: 'Jan', views: 120 },
  { month: 'Feb', views: 180 },
  { month: 'Mar', views: 240 },
  { month: 'Apr', views: 200 },
  { month: 'May', views: 320 },
  { month: 'Jun', views: 410 },
];

export default function UserDashboardOverview() {
  // AUTH DISABLED - useRoleRedirect commented out for development
  // useRoleRedirect(['user']);

  const { openModal } = useModal();

  const handleAgreementClick = (agreement: (typeof mockAgreements)[0]) => {
    openModal('agreementView', {
      agreement: {
        agreementId: agreement.id,
        propertyTitle: agreement.property,
        propertyAddress: agreement.property,
        landlordName: 'Landlord',
        tenantName: 'Tenant',
        monthlyRent: parseFloat(agreement.amount.replace(/[^0-9.]/g, '')),
        securityDeposit: 0,
        startDate: new Date().toISOString(),
        endDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1),
        ).toISOString(),
        status:
          agreement.status === 'Active'
            ? 'active'
            : agreement.status === 'Pending'
              ? 'pending'
              : 'signed',
      },
      onSignSubmit: async (data: AgreementSigningData) => {
        await apiClient.patch(`/agreements/${data.agreementId}`, {
          status: 'signed',
          signedAt: data.signedAt,
          signerName: data.signerName,
          signature: data.signature,
        });
      },
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <TenantOnboardingBanner />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Overview
          </h2>
          <p className="text-blue-200/60 mt-1">
            Welcome back. Here is the latest on your rentals.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Next Payment Due */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/10 flex flex-col justify-between group hover:border-white/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-white/5 text-rose-400 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
              <Calendar size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Due in 5 days
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-blue-200/60 uppercase tracking-wider">
              Next Payment Due
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-bold tracking-tight text-white">
                $1,200
              </h3>
              <span className="text-sm text-blue-300/40">/mo</span>
            </div>
            <p className="text-sm text-blue-200/60 mt-2 truncate">
              Sunset Apartments, Unit 4B
            </p>
          </div>
        </div>

        {/* Active Lease */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/10 flex flex-col justify-between group hover:border-white/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-white/5 text-emerald-400 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Active
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-blue-200/60 uppercase tracking-wider">
              Active Lease
            </p>
            <h3 className="text-xl font-bold tracking-tight text-white mt-1">
              12 Months
            </h3>
            <div className="mt-3 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: '60%' }}
              />
            </div>
            <p className="text-xs text-blue-300/40 mt-3 font-medium uppercase tracking-wider">
              7 months remaining
            </p>
          </div>
        </div>

        {/* Rent Paid This Year */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/10 flex flex-col justify-between sm:col-span-2 lg:col-span-1 group hover:border-white/20 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-white/5 text-blue-400 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <ArrowUpRight size={14} /> +12%
            </span>
          </div>
          <div className="mt-4 flex flex-col pt-1">
            <MicroCharts />
            <div className="flex items-baseline justify-between mt-4">
              <div>
                <p className="text-sm font-medium text-blue-200/60 uppercase tracking-wider">
                  Rent Paid This Year
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
                  $8,400
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Preview */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 text-blue-400 rounded-2xl flex items-center justify-center border border-white/5">
              <BarChart3 size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Analytics
              </h3>
              <p className="text-xs text-blue-200/40">
                Property performance overview
              </p>
            </div>
          </div>
          <Link
            href="/user/analytics"
            className="flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Analytics
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="md:col-span-2 h-40">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart
                data={analyticsPreviewData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="analyticsGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'rgba(147, 197, 253, 0.4)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px 12px',
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  labelStyle={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '10px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  fill="url(#analyticsGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-4 justify-center">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Property Views
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-white">1,470</p>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400">
                  <ArrowUpRight size={12} />
                  +12%
                </span>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Inquiries
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-white">83</p>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-400">
                  <ArrowUpRight size={12} />
                  +8%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agreements Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Active Agreements
          </h3>
          <button className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 text-blue-300/40">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Agreement ID
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Property
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Monthly Rent
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">
                  Next Due
                </th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agreements.map((agreement) => (
                <tr
                  key={agreement.id}
                  onClick={() => handleAgreementClick(agreement)}
                  className="hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 font-bold text-white group-hover:text-blue-400 transition-colors">
                    {agreement.id}
                  </td>
                  <td className="px-6 py-4 text-blue-200/60 font-medium">
                    {agreement.property}
                  </td>
                  <td className="px-6 py-4 text-white font-bold">
                    {agreement.amount}
                  </td>
                  <td className="px-6 py-4 text-blue-200/60 font-medium">
                    {agreement.dueDate}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {agreement.status === 'Pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAgreementClick(agreement);
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          Sign
                        </button>
                      )}
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          agreement.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : agreement.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-white/5 text-blue-300/40 border-white/10'
                        }`}
                      >
                        {agreement.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
