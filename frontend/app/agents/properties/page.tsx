import React from 'react';
import { Building2 } from 'lucide-react';

export default function PropertiesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Properties</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage your property listings
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-neutral-100">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <Building2 size={28} className="text-brand-blue" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">
          No properties yet
        </h2>
        <p className="text-sm text-neutral-500 mt-1 max-w-xs">
          Your property listings will appear here once you create them.
        </p>
      </div>
    </div>
  );
}
