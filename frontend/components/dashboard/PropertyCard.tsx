'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { Property } from '@/types/dashboard';
import { MapPin } from 'lucide-react';

interface PropertyCardProps {
    property: Property;
    onManage?: (id: string) => void;
    onListNow?: (id: string) => void;
    onViewReport?: (id: string) => void;
    className?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onManage,
    onListNow,
    onViewReport,
    className = '',
}) => {
    const handleManage = () => {
        if (onManage) onManage(property.id);
        else console.log('Manage clicked:', property.id);
    };

    const handleListNow = () => {
        if (onListNow) onListNow(property.id);
        else console.log('List Now clicked:', property.id);
    };

    const handleViewReport = () => {
        if (onViewReport) onViewReport(property.id);
        else console.log('View Report clicked:', property.id);
    };

    return (
        <article
            className={`
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-700
        rounded-xl p-4 shadow-sm
        hover:shadow-md transition-shadow duration-200
        ${className}
      `}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                        {property.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                        <MapPin size={14} />
                        <span>{property.address}</span>
                    </div>
                </div>
                <StatusBadge status={property.status} />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Tenant</span>
                    <p className="font-medium text-neutral-900 dark:text-white">
                        {property.tenant || '—'}
                    </p>
                </div>
                <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Contract</span>
                    <p className="font-medium text-neutral-900 dark:text-white">
                        {property.contractValue}
                    </p>
                </div>
                <div className="col-span-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Lease Ends</span>
                    <p className="font-medium text-neutral-900 dark:text-white">
                        {property.leaseEnds || '—'}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleManage}
                    className="
            flex-1 px-3 py-2 text-sm font-medium rounded-lg
            bg-brand-blue text-white
            hover:bg-brand-blue-dark
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2
            dark:focus:ring-offset-neutral-800
          "
                >
                    Manage
                </button>
                <button
                    onClick={handleListNow}
                    className="
            flex-1 px-3 py-2 text-sm font-medium rounded-lg
            border border-neutral-200 dark:border-neutral-600
            text-neutral-700 dark:text-neutral-300
            hover:bg-neutral-50 dark:hover:bg-neutral-700
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2
            dark:focus:ring-offset-neutral-800
          "
                >
                    List Now
                </button>
                <button
                    onClick={handleViewReport}
                    className="
            flex-1 px-3 py-2 text-sm font-medium rounded-lg
            border border-neutral-200 dark:border-neutral-600
            text-neutral-700 dark:text-neutral-300
            hover:bg-neutral-50 dark:hover:bg-neutral-700
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2
            dark:focus:ring-offset-neutral-800
          "
                >
                    View Report
                </button>
            </div>
        </article>
    );
};

export default PropertyCard;
