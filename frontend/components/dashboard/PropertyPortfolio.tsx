'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Filter } from 'lucide-react';
import { format } from 'date-fns';

const PropertyPortfolio = () => {
  const properties = [
    {
      id: 1,
      name: '101 Adeola Odeku St',
      address: 'Victoria Island, Lagos',
      image:
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
      status: 'occupied',
      tenant: {
        name: 'Sarah Okafor',
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      },
      contractValue: 2.5,
      currency: '₦',
      period: 'yr',
      leaseEnds: new Date('2024-11-30'),
    },
    {
      id: 2,
      name: 'Block 4, Admiralty Way',
      address: 'Lekki Phase 1, Lagos',
      image:
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop',
      status: 'vacant',
      contractValue: 3.8,
      currency: '₦',
      period: 'yr',
    },
    {
      id: 3,
      name: 'Glover Road, Ikoyi',
      address: 'Ikoyi, Lagos',
      image:
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop',
      status: 'maintenance',
      contractValue: 1.8,
      currency: '₦',
      period: 'yr',
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges = {
      occupied: {
        text: 'Occupied',
        color: 'bg-green-100 text-brand-green',
      },
      vacant: {
        text: 'Vacant',
        color: 'bg-orange-100 text-orange-600',
      },
      maintenance: {
        text: 'Maintenance',
        color: 'bg-yellow-100 text-yellow-700',
      },
    };

    return badges[status as keyof typeof badges];
  };

  const getActionButton = (status: string) => {
    if (status === 'occupied') {
      return (
        <button className="px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors">
          Manage
        </button>
      );
    }
    if (status === 'vacant') {
      return (
        <button className="px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors">
          List Now
        </button>
      );
    }
    return (
      <button className="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-semibold rounded-lg hover:bg-neutral-200 transition-colors">
        View Report
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-neutral-900">
          Property Portfolio
        </h2>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-700 transition-colors">
            <Filter size={16} />
            <span>Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-brand-blue-dark transition-colors">
            <Download size={16} />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-4 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Property
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Contract Value
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Lease Ends
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {properties.map((property) => {
              const badge = getStatusBadge(property.status);

              return (
                <tr
                  key={property.id}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  {/* Property */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={property.image}
                          alt={property.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {property.name}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {property.address}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                    >
                      {badge.text}
                    </span>
                  </td>

                  {/* Tenant */}
                  <td className="py-4 px-4">
                    {property.tenant ? (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={property.tenant.avatar}
                            alt={property.tenant.name}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                        <span className="text-sm text-neutral-700">
                          {property.tenant.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-neutral-400">--</span>
                    )}
                  </td>

                  {/* Contract Value */}
                  <td className="py-4 px-4">
                    <span className="font-semibold text-neutral-900">
                      {property.currency}
                      {property.contractValue}M / {property.period}
                    </span>
                  </td>

                  {/* Lease Ends */}
                  <td className="py-4 px-4">
                    {property.leaseEnds ? (
                      <span className="text-sm text-neutral-700">
                        {format(property.leaseEnds, 'MMM yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-400">--</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-4 px-4">
                    {getActionButton(property.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {properties.map((property) => {
          const badge = getStatusBadge(property.status);

          return (
            <div
              key={property.id}
              className="border border-neutral-200 rounded-xl p-4 space-y-4"
            >
              {/* Property Info */}
              <div className="flex items-start space-x-3">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={property.image}
                    alt={property.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 mb-1">
                    {property.name}
                  </p>
                  <p className="text-sm text-neutral-500 mb-2">
                    {property.address}
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                  >
                    {badge.text}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">
                    Contract Value
                  </p>
                  <p className="font-semibold text-neutral-900">
                    {property.currency}
                    {property.contractValue}M / {property.period}
                  </p>
                </div>
                {property.leaseEnds && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Lease Ends</p>
                    <p className="font-semibold text-neutral-900">
                      {format(property.leaseEnds, 'MMM yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Tenant */}
              {property.tenant && (
                <div className="flex items-center space-x-2 pt-2 border-t border-neutral-100">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={property.tenant.avatar}
                      alt={property.tenant.name}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Tenant</p>
                    <p className="text-sm font-medium text-neutral-900">
                      {property.tenant.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">{getActionButton(property.status)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyPortfolio;
