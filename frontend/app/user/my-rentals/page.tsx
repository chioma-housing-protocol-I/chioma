'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  DollarSign,
  FileText,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface RentalProperty {
  id: string;
  agreementId: string;
  propertyAddress: string;
  propertyTitle: string;
  monthlyRent: number;
  currency: string;
  nextDueDate: Date;
  leaseStartDate: Date;
  leaseEndDate: Date;
  status: 'active' | 'expired' | 'terminated';
  landlordName: string;
  smartContractId?: string;
  lastPaymentDate?: Date;
  totalPaid: number;
}

interface HistoricalRental {
  id: string;
  propertyAddress: string;
  propertyTitle: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  monthlyRent: number;
  currency: string;
  status: 'expired' | 'terminated';
}

export default function MyRentalsPage() {
  const [activeRentals, setActiveRentals] = useState<RentalProperty[]>([]);
  const [historicalRentals, setHistoricalRentals] = useState<
    HistoricalRental[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      setActiveRentals([
        {
          id: '1',
          agreementId: 'AGR-2024-001',
          propertyAddress: '123 Sunset Boulevard, Unit 4B, Lagos',
          propertyTitle: 'Sunset Apartments',
          monthlyRent: 150000,
          currency: 'USDC',
          nextDueDate: new Date('2024-04-01'),
          leaseStartDate: new Date('2023-01-01'),
          leaseEndDate: new Date('2024-12-31'),
          status: 'active',
          landlordName: 'John Doe',
          smartContractId: '0x1234...5678',
          lastPaymentDate: new Date('2024-03-01'),
          totalPaid: 450000,
        },
      ]);
      setHistoricalRentals([
        {
          id: '2',
          propertyAddress: '456 Marina Drive, Apartment 12, Lagos',
          propertyTitle: 'Marina Heights',
          leaseStartDate: new Date('2021-06-01'),
          leaseEndDate: new Date('2022-12-31'),
          monthlyRent: 120000,
          currency: 'USDC',
          status: 'expired',
        },
      ]);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRentals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          My Rentals
        </h1>
        <p className="text-blue-200/50 mt-1">
          View and manage your current and past rental properties.
        </p>
      </div>

      {/* Active Leases */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Active Leases</h2>
        {activeRentals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 text-center">
            <Home className="mx-auto h-10 w-10 text-blue-300/30 mb-3" />
            <p className="text-blue-200/50">
              You don&apos;t have any active rentals at the moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeRentals.map((rental) => (
              <div
                key={rental.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {rental.propertyTitle}
                    </h3>
                    <p className="text-sm text-blue-200/50 mt-0.5">
                      {rental.propertyAddress}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  {[
                    {
                      icon: DollarSign,
                      color: 'text-blue-400',
                      bg: 'bg-blue-500/10 border-blue-500/20',
                      label: 'Monthly Rent',
                      value: `${rental.currency} ${rental.monthlyRent.toLocaleString()}`,
                    },
                    {
                      icon: Calendar,
                      color: 'text-rose-400',
                      bg: 'bg-rose-500/10 border-rose-500/20',
                      label: 'Next Due Date',
                      value: format(rental.nextDueDate, 'MMM dd, yyyy'),
                    },
                    {
                      icon: Clock,
                      color: 'text-purple-400',
                      bg: 'bg-purple-500/10 border-purple-500/20',
                      label: 'Lease Period',
                      value: `${format(rental.leaseStartDate, 'MMM yyyy')} – ${format(rental.leaseEndDate, 'MMM yyyy')}`,
                    },
                  ].map(({ icon: Icon, color, bg, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 ${bg} border rounded-xl flex items-center justify-center shrink-0`}
                      >
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-blue-200/40 font-medium uppercase tracking-wider">
                          {label}
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    <DollarSign className="w-4 h-4" /> Pay Rent
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-semibold transition-colors">
                    <FileText className="w-4 h-4" /> View Contract
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = `/tenant/maintenance?propertyId=${rental.id}`;
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Wrench className="w-4 h-4" /> Request Maintenance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rental History */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Rental History</h2>
        {historicalRentals.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-blue-300/30 mb-3" />
            <p className="text-blue-200/50">No rental history available.</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    {['Property', 'Lease Period', 'Monthly Rent', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-left text-xs font-bold text-blue-300/40 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historicalRentals.map((rental) => (
                    <tr
                      key={rental.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">
                          {rental.propertyTitle}
                        </p>
                        <p className="text-xs text-blue-200/40 mt-0.5">
                          {rental.propertyAddress}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-blue-200/60">
                        {format(rental.leaseStartDate, 'MMM yyyy')} –{' '}
                        {format(rental.leaseEndDate, 'MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {rental.currency} {rental.monthlyRent.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            rental.status === 'expired'
                              ? 'bg-white/5 text-blue-300/40 border-white/10'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          <AlertCircle className="w-3 h-3" />
                          {rental.status === 'expired'
                            ? 'Expired'
                            : 'Terminated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
