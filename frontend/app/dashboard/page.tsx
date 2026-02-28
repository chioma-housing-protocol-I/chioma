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
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Overview
          </h2>
          <p className="text-neutral-500 mt-1">
            Welcome back. Here is the latest on your rentals.
          </p>
        </div>
      </div>

      {/* High-Fidelity Widgets (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Next Payment Due */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-neutral-100 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <Calendar size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
              Due in 5 days
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-500">
              Next Payment Due
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-bold tracking-tight text-neutral-900">
                $1,200
              </h3>
              <span className="text-sm text-neutral-500">/mo</span>
            </div>
            <p className="text-sm text-neutral-600 mt-2 truncate">
              Sunset Apartments, Unit 4B
            </p>
          </div>
        </div>

        {/* Active Lease */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-neutral-100 flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Active
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-500">Active Lease</p>
            <h3 className="text-xl font-bold tracking-tight text-neutral-900 mt-1">
              12 Months
            </h3>
            <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">7 months remaining</p>
          </div>
        </div>

        {/* Rent Paid This Year */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-neutral-100 flex flex-col justify-between sm:col-span-2 lg:col-span-1 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} strokeWidth={1.5} />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <ArrowUpRight size={14} /> +12%
            </span>
          </div>
          <div className="mt-4 flex flex-col pt-1">
            <MicroCharts />
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  Rent Paid This Year
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-neutral-900 mt-0.5">
                  $8,400
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agreements Table Area */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            Active Agreements
          </h3>
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50/50 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">
                  Agreement ID
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">
                  Property
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">
                  Monthly Rent
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">
                  Next Due
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px] text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {mockAgreements.map((agreement) => (
                <tr
                  key={agreement.id}
                  className="hover:bg-neutral-50/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {agreement.id}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {agreement.property}
                  </td>
                  <td className="px-6 py-4 text-neutral-900 font-semibold">
                    {agreement.amount}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {agreement.dueDate}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        agreement.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : agreement.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-100'
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
