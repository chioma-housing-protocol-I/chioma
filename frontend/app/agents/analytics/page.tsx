import React from 'react';
import { PieChart } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Insights into your performance and activity
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-neutral-100">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <PieChart size={28} className="text-brand-blue" />
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">No data yet</h2>
        <p className="text-sm text-neutral-500 mt-1 max-w-xs">
          Your performance analytics will appear here as activity builds up.
        </p>
      </div>
    </div>
  );
}
