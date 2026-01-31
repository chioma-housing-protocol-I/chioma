"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      {/* Header with Add Property Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Your Properties
          </h1>
          <p className="text-neutral-500 mt-1">
            Manage and monitor all your properties
          </p>
        </div>
        <Link
          href="/landlords/properties/add"
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Property</span>
        </Link>
      </div>

      {/* Empty State or Property List */}
      <div className="bg-white rounded-2xl p-12 shadow-sm border border-neutral-200 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="text-brand-blue" size={40} />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">
            No Properties Yet
          </h3>
          <p className="text-neutral-500 mb-6">
            Start by adding your first property to manage rentals and track
            performance.
          </p>
          <Link
            href="/landlords/properties/add"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors"
          >
            <Plus size={20} />
            <span>Add Your First Property</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
