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

// Types
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

  useEffect(() => {
    fetchRentals();
  }, []);

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
          currency: 'NGN',
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
          currency: 'NGN',
          status: 'expired',
        },
      ]);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayRent = (_agreementId: string) => {
    // Stellar payment flow - pending integration
  };

  const handleViewContract = (_smartContractId?: string) => {
    // Smart contract view - pending integration
  };

  const handleRequestMaintenance = (propertyId: string) => {
    // TODO: Navigate to maintenance request form
    window.location.href = `/tenant/maintenance?propertyId=${propertyId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
          My Rentals
        </h1>
        <p className="text-neutral-500 mt-2">
          View and manage your current and past rental properties
        </p>
      </div>

      {/* Active Rentals Section */}
      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">
          Active Leases
        </h2>

        {activeRentals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
            <Home className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
            <p className="text-neutral-600">
              You don&apos;t have any active rentals at the moment
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {activeRentals.map((rental) => (
              <div
                key={rental.id}
                className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Property Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {rental.propertyTitle}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {rental.propertyAddress}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </span>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Monthly Rent</p>
                      <p className="text-lg font-semibold text-neutral-900">
                        {rental.currency} {rental.monthlyRent.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Next Due Date</p>
                      <p className="text-lg font-semibold text-neutral-900">
                        {format(rental.nextDueDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Lease Period</p>
                      <p className="text-sm font-medium text-neutral-900">
                        {format(rental.leaseStartDate, 'MMM yyyy')} -{' '}
                        {format(rental.leaseEndDate, 'MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-100">
                  <button
                    onClick={() => handlePayRent(rental.agreementId)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Pay Rent</span>
                  </button>

                  <button
                    onClick={() => handleViewContract(rental.smartContractId)}
                    className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Smart Contract</span>
                  </button>

                  <button
                    onClick={() => handleRequestMaintenance(rental.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Request Maintenance</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historical Rentals Section */}
      <section>
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">
          Rental History
        </h2>

        {historicalRentals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
            <p className="text-neutral-600">No rental history available</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Lease Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Monthly Rent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {historicalRentals.map((rental) => (
                    <tr key={rental.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {rental.propertyTitle}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {rental.propertyAddress}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {format(rental.leaseStartDate, 'MMM yyyy')} -{' '}
                        {format(rental.leaseEndDate, 'MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                        {rental.currency} {rental.monthlyRent.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rental.status === 'expired'
                              ? 'bg-neutral-100 text-neutral-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
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
