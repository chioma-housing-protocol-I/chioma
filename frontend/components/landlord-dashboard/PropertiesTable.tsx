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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            Active
          </span>
        );
      case 'vacant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            Vacant
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
            Maintenance
          </span>
        );
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto -mx-px">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-left text-blue-300/40">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Property
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Monthly Rent
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">
                Tenants
              </th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {properties.map((property) => (
              <tr
                key={property.id}
                className="hover:bg-white/5 transition-all duration-200 group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-300/40 group-hover:bg-blue-500/10 group-hover:text-blue-400 border border-white/5 transition-all">
                      <Home size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                        {property.title}
                      </h4>
                      <div className="flex items-center text-xs text-blue-200/60 font-medium mt-1 uppercase tracking-wider">
                        <MapPin size={12} className="mr-1.5 opacity-60" />
                        {property.address}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(property.status)}</td>
                <td className="px-6 py-4">
                  <span className="font-bold text-white">
                    ${property.monthlyRent.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-300/40 block font-bold uppercase tracking-widest mt-0.5">
                    / month
                  </span>
                </td>
                <td className="px-6 py-4 text-blue-200/60 font-medium">
                  {property.tenants} unit{property.tenants !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 text-right cursor-pointer">
                  <button className="p-2 text-blue-300/40 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                    <MoreVertical size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
