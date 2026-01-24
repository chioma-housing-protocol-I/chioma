'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    MapPin,
    Users,
    DollarSign,
    Calendar,
    Edit,
    Trash2,
    Eye
} from 'lucide-react';
import { mockDashboardData } from '@/data/mockDashboard';

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        occupied: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        vacant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        maintenance: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || styles.vacant}`}>
            {status}
        </span>
    );
};

export default function PropertiesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const { properties } = mockDashboardData;

    const filteredProperties = properties.filter((property) => {
        const matchesSearch = property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            property.address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || property.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: properties.length,
        occupied: properties.filter((p) => p.status === 'occupied').length,
        vacant: properties.filter((p) => p.status === 'vacant').length,
        maintenance: properties.filter((p) => p.status === 'maintenance').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                        Properties
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your property portfolio
                    </p>
                </div>
                <button className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                    <Plus size={20} />
                    Add Property
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Properties</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Occupied</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.occupied}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Vacant</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{stats.vacant}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Maintenance</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.maintenance}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search properties..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                    <option value="all">All Status</option>
                    <option value="occupied">Occupied</option>
                    <option value="vacant">Vacant</option>
                    <option value="maintenance">Maintenance</option>
                </select>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                    <div
                        key={property.id}
                        className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                        {/* Property Image */}
                        <div className="h-40 relative overflow-hidden">
                            <Image
                                src={property.image}
                                alt={property.name}
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>

                        <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-neutral-900 dark:text-white">{property.name}</h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
                                        <MapPin size={14} />
                                        {property.address}
                                    </p>
                                </div>
                                <StatusBadge status={property.status} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-neutral-100 dark:border-neutral-700">
                                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    <Users size={16} />
                                    <span>{property.tenant || 'No tenant'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                    <DollarSign size={16} />
                                    <span>{property.contractValue}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 col-span-2">
                                    <Calendar size={16} />
                                    <span>Lease ends: {property.leaseEnds || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white font-medium hover:bg-brand-blue-dark transition-colors">
                                    <Eye size={16} />
                                    View
                                </button>
                                <button className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                                    <Edit size={16} className="text-neutral-600 dark:text-neutral-400" />
                                </button>
                                <button className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <Trash2 size={16} className="text-red-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProperties.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-neutral-500 dark:text-neutral-400">No properties found.</p>
                </div>
            )}
        </div>
    );
}
