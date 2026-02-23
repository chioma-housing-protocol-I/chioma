import React from 'react';
import { Home, MapPin, MoreVertical } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  address: string;
  status: 'active' | 'vacant' | 'maintenance';
  monthlyRent: number;
  tenants: number;
}

interface PropertiesTableProps {
  properties: Property[];
}

export default function PropertiesTable({ properties }: PropertiesTableProps) {
  const getStatusBadge = (status: Property['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Active
          </span>
        );
      case 'vacant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Vacant
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Maintenance
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-neutral-50/50 border-b border-neutral-100 text-left">
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Property
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Monthly Rent
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Tenants
            </th>
            <th className="px-6 py-4 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {properties.map((property) => (
            <tr
              key={property.id}
              className="hover:bg-neutral-50/50 transition-colors group"
            >
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-colors">
                    <Home size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 group-hover:text-brand-blue transition-colors">
                      {property.title}
                    </h4>
                    <div className="flex items-center text-sm text-neutral-500 mt-0.5">
                      <MapPin size={14} className="mr-1" />
                      {property.address}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">{getStatusBadge(property.status)}</td>
              <td className="px-6 py-4">
                <span className="font-medium text-neutral-900">
                  ${property.monthlyRent.toLocaleString()}
                </span>
                <span className="text-sm text-neutral-500 block">/month</span>
              </td>
              <td className="px-6 py-4 text-neutral-600">
                {property.tenants} unit{property.tenants !== 1 ? 's' : ''}
              </td>
              <td className="px-6 py-4 text-right cursor-pointer">
                <button className="p-2 text-neutral-400 hover:text-brand-blue rounded-lg hover:bg-brand-blue/10 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
