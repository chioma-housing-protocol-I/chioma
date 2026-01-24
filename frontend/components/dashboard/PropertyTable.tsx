'use client';

import React, { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { PropertyCard } from './PropertyCard';
import { Property } from '@/types/dashboard';
import {
    Building2,
    Settings,
    Tag,
    FileBarChart,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2
} from 'lucide-react';

interface PropertyTableProps {
    properties: Property[];
    onManage?: (id: string) => void;
    onListNow?: (id: string) => void;
    onViewReport?: (id: string) => void;
    className?: string;
}

// Tooltip component
const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
    return (
        <div className="group relative inline-flex">
            {children}
            <span className="
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                bg-neutral-900 dark:bg-neutral-700 text-white text-xs rounded-md
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                pointer-events-none whitespace-nowrap z-50
                before:absolute before:top-full before:left-1/2 before:-translate-x-1/2
                before:border-4 before:border-transparent before:border-t-neutral-900
                dark:before:border-t-neutral-700
            ">
                {text}
            </span>
        </div>
    );
};

// Action dropdown component
const ActionDropdown = ({
    property,
    onManage,
    onListNow,
    onViewReport
}: {
    property: Property;
    onManage: (id: string) => void;
    onListNow: (id: string) => void;
    onViewReport: (id: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
                    p-2 rounded-lg
                    text-neutral-500 hover:text-neutral-700 
                    dark:text-neutral-400 dark:hover:text-neutral-200
                    hover:bg-neutral-100 dark:hover:bg-neutral-700
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-brand-blue/50
                "
                aria-label="More actions"
            >
                <MoreHorizontal size={18} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="
                        absolute right-0 top-full mt-1 z-20
                        bg-white dark:bg-neutral-800
                        border border-neutral-200 dark:border-neutral-700
                        rounded-xl shadow-lg overflow-hidden
                        min-w-[160px]
                        animate-in fade-in slide-in-from-top-2 duration-200
                    ">
                        <button
                            onClick={() => { onManage(property.id); setIsOpen(false); }}
                            className="
                                w-full flex items-center gap-3 px-4 py-2.5
                                text-sm text-neutral-700 dark:text-neutral-300
                                hover:bg-brand-blue hover:text-white
                                transition-colors duration-150
                            "
                        >
                            <Eye size={16} />
                            View Details
                        </button>
                        <button
                            onClick={() => { onListNow(property.id); setIsOpen(false); }}
                            className="
                                w-full flex items-center gap-3 px-4 py-2.5
                                text-sm text-neutral-700 dark:text-neutral-300
                                hover:bg-brand-blue hover:text-white
                                transition-colors duration-150
                            "
                        >
                            <Edit size={16} />
                            Edit Property
                        </button>
                        <button
                            onClick={() => { onViewReport(property.id); setIsOpen(false); }}
                            className="
                                w-full flex items-center gap-3 px-4 py-2.5
                                text-sm text-neutral-700 dark:text-neutral-300
                                hover:bg-brand-blue hover:text-white
                                transition-colors duration-150
                            "
                        >
                            <FileBarChart size={16} />
                            View Report
                        </button>
                        <div className="border-t border-neutral-100 dark:border-neutral-700" />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="
                                w-full flex items-center gap-3 px-4 py-2.5
                                text-sm text-red-600 dark:text-red-400
                                hover:bg-red-50 dark:hover:bg-red-900/20
                                transition-colors duration-150
                            "
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export const PropertyTable: React.FC<PropertyTableProps> = ({
    properties,
    onManage,
    onListNow,
    onViewReport,
    className = '',
}) => {
    const handleManage = (id: string) => {
        if (onManage) onManage(id);
        else console.log('Manage clicked:', id);
    };

    const handleListNow = (id: string) => {
        if (onListNow) onListNow(id);
        else console.log('List Now clicked:', id);
    };

    const handleViewReport = (id: string) => {
        if (onViewReport) onViewReport(id);
        else console.log('View Report clicked:', id);
    };

    // Empty state
    if (properties.length === 0) {
        return (
            <section
                className={`
          bg-white dark:bg-neutral-800
          border border-neutral-200 dark:border-neutral-700
          rounded-2xl p-8 shadow-sm text-center
          ${className}
        `}
            >
                <Building2 size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                    No Properties Yet
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400">
                    Add your first property to start managing your portfolio.
                </p>
            </section>
        );
    }

    return (
        <section
            className={`
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-700
        rounded-2xl shadow-sm overflow-hidden
        ${className}
      `}
            aria-label="Property Portfolio"
        >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-neutral-100 dark:border-neutral-700">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Property Portfolio
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Manage your rental properties
                </p>
            </div>

            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-700/50">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Property
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Tenant
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Contract Value
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Lease Ends
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                        {properties.map((property, index) => (
                            <tr
                                key={property.id}
                                className={`
                  hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10
                  transition-colors duration-150 group
                  ${index % 2 === 1 ? 'bg-neutral-50/50 dark:bg-neutral-700/20' : ''}
                `}
                            >
                                {/* Property */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-blue/10 flex items-center justify-center group-hover:from-brand-blue/30 group-hover:to-brand-blue/20 transition-colors">
                                            <Building2 size={18} className="text-brand-blue" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-neutral-900 dark:text-white group-hover:text-brand-blue transition-colors">
                                                {property.name}
                                            </p>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                                {property.address}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-4">
                                    <StatusBadge status={property.status} />
                                </td>

                                {/* Tenant */}
                                <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                                    {property.tenant || <span className="text-neutral-400">—</span>}
                                </td>

                                {/* Contract Value */}
                                <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-white">
                                    {property.contractValue}
                                </td>

                                {/* Lease Ends */}
                                <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                                    {property.leaseEnds || <span className="text-neutral-400">—</span>}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4">
                                    <div className="flex justify-end items-center gap-1">
                                        {/* Primary Action - Manage */}
                                        <Tooltip text="Manage Property">
                                            <button
                                                onClick={() => handleManage(property.id)}
                                                className="
                                                    p-2 rounded-lg
                                                    bg-brand-blue text-white
                                                    hover:bg-brand-blue-dark hover:scale-105
                                                    active:scale-95
                                                    transition-all duration-200
                                                    focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2
                                                    dark:focus:ring-offset-neutral-800
                                                    shadow-sm hover:shadow-md
                                                "
                                                aria-label={`Manage ${property.name}`}
                                            >
                                                <Settings size={16} />
                                            </button>
                                        </Tooltip>

                                        {/* List Now */}
                                        <Tooltip text="List Property">
                                            <button
                                                onClick={() => handleListNow(property.id)}
                                                className="
                                                    p-2 rounded-lg
                                                    text-neutral-600 dark:text-neutral-400
                                                    hover:bg-emerald-100 hover:text-emerald-600
                                                    dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400
                                                    hover:scale-105 active:scale-95
                                                    transition-all duration-200
                                                    focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                                                "
                                                aria-label={`List ${property.name}`}
                                            >
                                                <Tag size={16} />
                                            </button>
                                        </Tooltip>

                                        {/* View Report */}
                                        <Tooltip text="View Report">
                                            <button
                                                onClick={() => handleViewReport(property.id)}
                                                className="
                                                    p-2 rounded-lg
                                                    text-neutral-600 dark:text-neutral-400
                                                    hover:bg-purple-100 hover:text-purple-600
                                                    dark:hover:bg-purple-900/30 dark:hover:text-purple-400
                                                    hover:scale-105 active:scale-95
                                                    transition-all duration-200
                                                    focus:outline-none focus:ring-2 focus:ring-purple-500/50
                                                "
                                                aria-label={`View report for ${property.name}`}
                                            >
                                                <FileBarChart size={16} />
                                            </button>
                                        </Tooltip>

                                        {/* More Options Dropdown */}
                                        <ActionDropdown
                                            property={property}
                                            onManage={handleManage}
                                            onListNow={handleListNow}
                                            onViewReport={handleViewReport}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards - Hidden on desktop */}
            <div className="md:hidden p-4 space-y-4">
                {properties.map((property) => (
                    <PropertyCard
                        key={property.id}
                        property={property}
                        onManage={handleManage}
                        onListNow={handleListNow}
                        onViewReport={handleViewReport}
                    />
                ))}
            </div>
        </section>
    );
};

export default PropertyTable;
