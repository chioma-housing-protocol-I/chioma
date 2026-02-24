import React from 'react';
import { Calendar, FileText, ArrowUpRight, TrendingUp } from 'lucide-react';
import { MicroCharts } from '@/components/dashboard/MicroCharts';

// Mock Data
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

export default function TenantDashboardOverview() {
  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Overview
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Welcome back. Here is the latest on your rentals.
          </p>
        </div>
      </div>

      {/* High-Fidelity Widgets (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Next Payment Due */}
        <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-sm p-6 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center">
              <Calendar size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-full">
              Due in 5 days
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Next Payment Due
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                $1,200
              </h3>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                /mo
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2 truncate">
              Sunset Apartments, Unit 4B
            </p>
          </div>
        </div>

        {/* Active Lease */}
        <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-sm p-6 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
              Active
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Active Lease
            </p>
            <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
              12 Months
            </h3>
            <div className="mt-2 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              7 months remaining
            </p>
          </div>
        </div>

        {/* Rent Paid This Year */}
        <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-sm p-6 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col justify-between sm:col-span-2 lg:col-span-1 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <ArrowUpRight size={14} /> +12%
            </span>
          </div>
          <div className="mt-4 flex flex-col pt-1">
            <MicroCharts />
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Rent Paid This Year
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-0.5">
                  $8,400
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agreements Table Area */}
      <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-sm border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Active Agreements
          </h3>
          <button className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark dark:text-blue-400 dark:hover:text-blue-300">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50/50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Agreement ID</th>
                <th className="px-6 py-4 font-medium">Property</th>
                <th className="px-6 py-4 font-medium">Monthly Rent</th>
                <th className="px-6 py-4 font-medium">Next Due</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/40">
              {mockAgreements.map((agreement) => (
                <tr
                  key={agreement.id}
                  className="hover:bg-neutral-50/50 dark:hover:bg-neutral-700/20 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                    {agreement.id}
                  </td>
                  <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300">
                    {agreement.property}
                  </td>
                  <td className="px-6 py-4 text-neutral-900 dark:text-white font-medium">
                    {agreement.amount}
                  </td>
                  <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                    {agreement.dueDate}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        agreement.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : agreement.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200/60 dark:bg-neutral-500/10 dark:text-neutral-400 dark:border-neutral-500/20'
                      }`}
                    >
                      {agreement.status}
                    </span>
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

// Ensure icons used internally in page are imported. Wait, I used FileText but didn't import it in Page.
// Ah, let me fix imports.
