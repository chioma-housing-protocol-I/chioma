'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight, Eye } from 'lucide-react';

const RecentListings = () => {
  const listings = [
    {
      id: 1,
      title: 'Highland Luxury Apt',
      address: '123 Main St, New York',
      image:
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&h=200&fit=crop',
      status: 'Active',
      price: '$2,400',
      period: '/mo',
      views: 245,
    },
    {
      id: 2,
      title: 'Sunset Villa',
      address: '456 Oak Dr, Los Angeles',
      image:
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&h=200&fit=crop',
      status: 'Pending',
      price: '$3,500',
      period: '/mo',
      views: 189,
    },
    {
      id: 3,
      title: 'Downtown Studio',
      address: '789 Pine Ln, Chicago',
      image:
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=200&h=200&fit=crop',
      status: 'Active',
      price: '$1,800',
      period: '/mo',
      views: 120,
    },
    {
      id: 4,
      title: 'Seaside Condo',
      address: '321 Beach Blvd, Miami',
      image:
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&h=200&fit=crop',
      status: 'Draft',
      price: '$4,200',
      period: '/mo',
      views: 0,
    },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700';
      case 'Pending':
        return 'bg-orange-100 text-orange-700';
      case 'Draft':
        return 'bg-neutral-100 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-neutral-900">Recent Listings</h2>
        <button className="flex items-center text-sm font-semibold text-brand-blue hover:text-blue-700 transition-colors">
          View All
          <ArrowRight size={16} className="ml-1" />
        </button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-50 text-left">
            <th className="pb-3 text-xs font-bold text-neutral-400 uppercase tracking-wider pl-0">
              Property
            </th>
            <th className="pb-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Status
            </th>
            <th className="pb-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Price
            </th>
            <th className="pb-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Views
            </th>
            <th className="pb-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {listings.map((item) => (
            <tr key={item.id} className="group">
              <td className="py-4 pl-0">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-neutral-900 text-sm">
                      {item.title}
                    </div>
                    <div className="text-xs text-neutral-500 font-medium">
                      {item.address}
                    </div>
                  </div>
                </div>
              </td>

              <td className="py-4">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${getStatusStyle(item.status)}`}
                >
                  {item.status}
                </span>
              </td>

              <td className="py-4">
                <div className="text-sm font-bold text-neutral-900">
                  {item.price}
                  <span className="text-neutral-400 text-xs font-medium">
                    {item.period}
                  </span>
                </div>
              </td>

              <td className="py-4">
                <div className="flex items-center gap-1.5 text-neutral-500 text-sm font-medium">
                  <Eye size={16} />
                  {item.views}
                </div>
              </td>

              <td className="py-4">{/* Placeholder for action menu */}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecentListings;
