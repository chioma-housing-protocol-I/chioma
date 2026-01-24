'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
    Search,
    Plus,
    Mail,
    Phone,
    Home,
    Calendar,
    MoreVertical,
    FileText,
    UserX,
    DollarSign,
    Clock,
    Star,
    Video,
    Edit,
    Trash2,
    Eye,
    Send
} from 'lucide-react';

// Mock tenants data with real profile pictures
const mockTenants = [
    {
        id: '1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1 (555) 123-4567',
        property: 'Sunset Apartments - Unit 4B',
        leaseStart: 'Jan 15, 2024',
        leaseEnd: 'Dec 15, 2025',
        rentAmount: '$1,200/mo',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        rating: 4.8,
        paymentStatus: 'paid',
        lastPayment: 'Jan 20, 2025',
    },
    {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        phone: '+1 (555) 234-5678',
        property: 'Elm Street House',
        leaseStart: 'Mar 1, 2024',
        leaseEnd: 'Mar 30, 2026',
        rentAmount: '$1,100/mo',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
        rating: 5.0,
        paymentStatus: 'paid',
        lastPayment: 'Jan 18, 2025',
    },
    {
        id: '3',
        name: 'Michael Chen',
        email: 'm.chen@email.com',
        phone: '+1 (555) 345-6789',
        property: 'Pine Road Duplex',
        leaseStart: 'Jul 1, 2024',
        leaseEnd: 'Jul 1, 2025',
        rentAmount: '$1,800/mo',
        status: 'expiring',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        rating: 4.5,
        paymentStatus: 'pending',
        lastPayment: 'Dec 28, 2024',
    },
    {
        id: '4',
        name: 'Emily Davis',
        email: 'emily.d@email.com',
        phone: '+1 (555) 456-7890',
        property: 'Cedar Lane Condo',
        leaseStart: 'Sep 15, 2024',
        leaseEnd: 'Sep 15, 2025',
        rentAmount: '$2,200/mo',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        rating: 4.9,
        paymentStatus: 'paid',
        lastPayment: 'Jan 22, 2025',
    },
    {
        id: '5',
        name: 'David Wilson',
        email: 'david.w@email.com',
        phone: '+1 (555) 567-8901',
        property: 'Birch View Loft',
        leaseStart: 'Feb 28, 2024',
        leaseEnd: 'Feb 28, 2026',
        rentAmount: '$1,650/mo',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        rating: 4.7,
        paymentStatus: 'paid',
        lastPayment: 'Jan 19, 2025',
    },
    {
        id: '6',
        name: 'Lisa Brown',
        email: 'lisa.b@email.com',
        phone: '+1 (555) 678-9012',
        property: 'Willow Creek Estate',
        leaseStart: 'Nov 1, 2024',
        leaseEnd: 'Nov 1, 2025',
        rentAmount: '$2,500/mo',
        status: 'expiring',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        rating: 4.6,
        paymentStatus: 'overdue',
        lastPayment: 'Dec 15, 2024',
    },
];

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string; dot: string }> = {
        active: {
            bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            dot: 'bg-emerald-500',
        },
        expiring: {
            bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            dot: 'bg-amber-500',
        },
        ended: {
            bg: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700/30 dark:text-neutral-400',
            dot: 'bg-neutral-500',
        },
    };

    const style = styles[status] || styles.active;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
            {status === 'expiring' ? 'Expiring Soon' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

const PaymentBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        paid: 'bg-emerald-500 text-white',
        pending: 'bg-amber-500 text-white',
        overdue: 'bg-red-500 text-white',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${styles[status]}`}>
            {status}
        </span>
    );
};

// Quick action dropdown
const TenantActions = ({ onAction }: { onAction: (action: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
                <MoreVertical size={18} className="text-neutral-500" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                        <button
                            onClick={() => { onAction('view'); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-brand-blue hover:text-white transition-colors"
                        >
                            <Eye size={16} />
                            View Profile
                        </button>
                        <button
                            onClick={() => { onAction('edit'); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-brand-blue hover:text-white transition-colors"
                        >
                            <Edit size={16} />
                            Edit Details
                        </button>
                        <button
                            onClick={() => { onAction('payment'); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-brand-blue hover:text-white transition-colors"
                        >
                            <DollarSign size={16} />
                            Payment History
                        </button>
                        <div className="border-t border-neutral-100 dark:border-neutral-700" />
                        <button
                            onClick={() => { onAction('delete'); setIsOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <Trash2 size={16} />
                            Remove Tenant
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default function TenantsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

    const filteredTenants = mockTenants.filter((tenant) =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.property.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAction = (tenantId: string, action: string) => {
        console.log(`Action: ${action} for tenant: ${tenantId}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
                        Tenants
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your tenants and their lease agreements
                    </p>
                </div>
                <button className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-blue/25">
                    <Plus size={20} />
                    Add Tenant
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow cursor-pointer group">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Tenants</p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{mockTenants.length}</p>
                        <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
                            <UserX size={20} className="text-brand-blue" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow cursor-pointer group">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Active Leases</p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-2xl font-bold text-emerald-600">{mockTenants.filter((t) => t.status === 'active').length}</p>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                            <FileText size={20} className="text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow cursor-pointer group">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Monthly Revenue</p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-2xl font-bold text-brand-blue">$10,450</p>
                        <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
                            <DollarSign size={20} className="text-brand-blue" />
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow cursor-pointer group">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Expiring Soon</p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-2xl font-bold text-amber-600">{mockTenants.filter((t) => t.status === 'expiring').length}</p>
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                            <Clock size={20} className="text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                    type="text"
                    placeholder="Search tenants by name, email, or property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                />
            </div>

            {/* Tenants Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredTenants.map((tenant) => (
                    <div
                        key={tenant.id}
                        className={`
                            bg-white dark:bg-neutral-800 rounded-2xl border-2 
                            ${selectedTenant === tenant.id
                                ? 'border-brand-blue shadow-lg shadow-brand-blue/10'
                                : 'border-neutral-200 dark:border-neutral-700 hover:border-brand-blue/50'
                            }
                            p-6 transition-all duration-300 cursor-pointer group
                        `}
                        onClick={() => setSelectedTenant(selectedTenant === tenant.id ? null : tenant.id)}
                    >
                        <div className="flex items-start gap-4">
                            {/* Avatar with real image */}
                            <div className="relative flex-shrink-0">
                                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-neutral-200 dark:ring-neutral-700 group-hover:ring-brand-blue transition-all">
                                    <Image
                                        src={tenant.avatar}
                                        alt={tenant.name}
                                        width={64}
                                        height={64}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                {/* Online indicator */}
                                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-neutral-800 rounded-full" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-neutral-900 dark:text-white group-hover:text-brand-blue transition-colors">
                                                {tenant.name}
                                            </h3>
                                            {/* Rating */}
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <Star size={14} fill="currentColor" />
                                                <span className="text-xs font-semibold">{tenant.rating}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                                            <Home size={14} />
                                            {tenant.property}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={tenant.status} />
                                        <TenantActions onAction={(action) => handleAction(tenant.id, action)} />
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                    <a
                                        href={`mailto:${tenant.email}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-blue transition-colors p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                    >
                                        <Mail size={14} />
                                        <span className="truncate">{tenant.email}</span>
                                    </a>
                                    <a
                                        href={`tel:${tenant.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-brand-blue transition-colors p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                    >
                                        <Phone size={14} />
                                        {tenant.phone}
                                    </a>
                                </div>

                                {/* Payment & Lease Info */}
                                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">Rent:</span>
                                        <span className="font-bold text-neutral-900 dark:text-white">{tenant.rentAmount}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">Status:</span>
                                        <PaymentBadge status={tenant.paymentStatus} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-neutral-400" />
                                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Ends: {tenant.leaseEnd}</span>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-blue-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Send size={16} />
                                        Message
                                    </button>
                                    <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Video size={16} />
                                        Call
                                    </button>
                                    <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <FileText size={16} />
                                        Lease
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTenants.length === 0 && (
                <div className="text-center py-12">
                    <UserX size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400">No tenants found.</p>
                </div>
            )}
        </div>
    );
}
