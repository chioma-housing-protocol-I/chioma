'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Filter } from 'lucide-react';
import type { PropertyPortfolioProps } from './types';

const PropertyPortfolio = ({
  properties,
  onPropertyClick,
  className = '',
}: PropertyPortfolioProps) => {
  const getStatusBadge = (status: string) => {
    const badges = {
      active: {
        text: 'Active',
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      },
      inactive: {
        text: 'Inactive',
        color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      },
      maintenance: {
        text: 'Maintenance',
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      },
    };

    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getActionButton = (status: string) => {
    if (status === 'active') {
      return (
        <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg">
          Manage
        </button>
      );
    }
    if (status === 'inactive') {
      return (
        <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg">
          List Now
        </button>
      );
    }
    return (
      <button className="px-4 py-2 bg-white/5 text-blue-200 text-xs font-bold rounded-lg hover:bg-white/10 transition-all border border-white/10">
        View Report
      </button>
    );
  };

  return (
    <div
      className={`bg-white/5 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/10 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Property Portfolio
        </h2>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-blue-200 transition-colors">
            <Filter size={14} />
            <span>Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg">
            <Download size={14} />
            <span>Download Report</span>
          </button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-blue-200/60 text-sm">No properties yet</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-blue-300/40">
                  <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest">
                    Property
                  </th>
                  <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest">
                    Monthly Revenue
                  </th>
                  <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest">
                    Occupancy
                  </th>
                  <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {properties.map((property) => {
                  const badge = getStatusBadge(property.status);

                  return (
                    <tr
                      key={property.id}
                      onClick={() => onPropertyClick?.(property)}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      {/* Property */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          {property.image && (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-white/20 transition-colors">
                              <Image
                                src={property.image}
                                alt={property.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {property.name}
                            </p>
                            <p className="text-xs text-blue-200/60 font-medium">
                              {property.address}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}
                        >
                          {badge.text}
                        </span>
                      </td>

                      {/* Monthly Revenue */}
                      <td className="py-4 px-4">
                        {property.monthlyRevenue ? (
                          <span className="font-bold text-white">
                            ${property.monthlyRevenue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-blue-200/40">--</span>
                        )}
                      </td>

                      {/* Occupancy */}
                      <td className="py-4 px-4">
                        {property.occupancy !== undefined ? (
                          <span className="font-bold text-white">
                            {property.occupancy}%
                          </span>
                        ) : (
                          <span className="text-sm text-blue-200/40">--</span>
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
                  onClick={() => onPropertyClick?.(property)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5 shadow-lg cursor-pointer hover:bg-white/10 transition-colors"
                >
                  {/* Property Info */}
                  <div className="flex items-start space-x-4">
                    {property.image && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <Image
                          src={property.image}
                          alt={property.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white mb-1 truncate">
                        {property.name}
                      </p>
                      <p className="text-xs text-blue-200/60 font-medium mb-3">
                        {property.address}
                      </p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.color}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1">
                        Monthly Revenue
                      </p>
                      <p className="font-bold text-white">
                        {property.monthlyRevenue
                          ? `$${property.monthlyRevenue.toLocaleString()}`
                          : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mb-1">
                        Occupancy
                      </p>
                      <p className="font-bold text-white">
                        {property.occupancy !== undefined
                          ? `${property.occupancy}%`
                          : '--'}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <div className="w-full">
                      {getActionButton(property.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PropertyPortfolio;
