'use client';

import React, { useState } from 'react';
import {
    Search,
    Plus,
    FileText,
    Calendar,
    DollarSign,
    User,
    Home,
    Download,
    Eye,
    Edit,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';

// Mock contracts data
const mockContracts = [
    {
        id: '1',
        property: 'Sunset Apartments - Unit 4B',
        tenant: 'John Smith',
        type: 'Residential Lease',
        startDate: 'Jan 15, 2024',
        endDate: 'Dec 15, 2025',
        monthlyRent: '$1,200',
        status: 'active',
        signedDate: 'Jan 10, 2024',
    },
    {
        id: '2',
        property: 'Elm Street House',
        tenant: 'Sarah Johnson',
        type: 'Residential Lease',
        startDate: 'Mar 1, 2024',
        endDate: 'Mar 30, 2026',
        monthlyRent: '$1,100',
        status: 'active',
        signedDate: 'Feb 25, 2024',
    },
    {
        id: '3',
        property: 'Pine Road Duplex',
        tenant: 'Michael Chen',
        type: 'Residential Lease',
        startDate: 'Jul 1, 2024',
        endDate: 'Jul 1, 2025',
        monthlyRent: '$1,800',
        status: 'expiring',
        signedDate: 'Jun 25, 2024',
    },
    {
        id: '4',
        property: 'Cedar Lane Condo',
        tenant: 'Emily Davis',
        type: 'Residential Lease',
        startDate: 'Sep 15, 2024',
        endDate: 'Sep 15, 2025',
        monthlyRent: '$2,200',
        status: 'active',
        signedDate: 'Sep 10, 2024',
    },
    {
        id: '5',
        property: 'Oak View Residence',
        tenant: 'Pending Tenant',
        type: 'Residential Lease',
        startDate: 'TBD',
        endDate: 'TBD',
        monthlyRent: '$1,500',
        status: 'pending',
        signedDate: null,
    },
];

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; icon: React.ReactNode }> = {
        active: {
            bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            icon: <CheckCircle size={14} />,
        },
        pending: {
            bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            icon: <Clock size={14} />,
        },
        expiring: {
            bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            icon: <AlertCircle size={14} />,
        },
    };

    const { bg, icon } = config[status] || config.pending;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${bg}`}>
            {icon}
            {status}
        </span>
    );
};

export default function ContractsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const filteredContracts = mockContracts.filter((contract) => {
        const matchesSearch =
            contract.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contract.tenant.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || contract.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                        Contracts
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage lease agreements and smart contracts
                    </p>
                </div>
                <button className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-semibold transition-colors">
                    <Plus size={20} />
                    New Contract
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Contracts</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{mockContracts.length}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Active</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {mockContracts.filter((c) => c.status === 'active').length}
                    </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending Signature</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                        {mockContracts.filter((c) => c.status === 'pending').length}
                    </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Expiring Soon</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                        {mockContracts.filter((c) => c.status === 'expiring').length}
                    </p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search contracts..."
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
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expiring">Expiring</option>
                </select>
            </div>

            {/* Contracts Table / Cards */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50 dark:bg-neutral-700/50">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Property</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Tenant</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Duration</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Rent</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-neutral-600 dark:text-neutral-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {filteredContracts.map((contract) => (
                                <tr key={contract.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                                <FileText size={20} className="text-brand-blue" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-neutral-900 dark:text-white">{contract.property}</p>
                                                <p className="text-xs text-neutral-500">{contract.type}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">{contract.tenant}</td>
                                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                                        {contract.startDate} - {contract.endDate}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">{contract.monthlyRent}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={contract.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                                                <Eye size={18} className="text-neutral-600 dark:text-neutral-400" />
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                                                <Download size={18} className="text-neutral-600 dark:text-neutral-400" />
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                                                <Edit size={18} className="text-neutral-600 dark:text-neutral-400" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-neutral-100 dark:divide-neutral-700">
                    {filteredContracts.map((contract) => (
                        <div key={contract.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                                        <FileText size={20} className="text-brand-blue" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-white">{contract.property}</p>
                                        <p className="text-xs text-neutral-500">{contract.tenant}</p>
                                    </div>
                                </div>
                                <StatusBadge status={contract.status} />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">Monthly Rent</span>
                                <span className="font-semibold text-neutral-900 dark:text-white">{contract.monthlyRent}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">Duration</span>
                                <span className="text-neutral-700 dark:text-neutral-300">{contract.startDate} - {contract.endDate}</span>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button className="flex-1 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                                    View
                                </button>
                                <button className="flex-1 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium">
                                    Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
