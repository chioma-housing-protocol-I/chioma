'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Wallet,
    Users,
    Bell,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/landlord/dashboard', icon: LayoutDashboard },
    { label: 'Properties', href: '/landlord/properties', icon: Building2 },
    { label: 'Tenants', href: '/landlord/tenants', icon: Users },
    { label: 'Contracts', href: '/landlord/contracts', icon: FileText },
    { label: 'Wallet', href: '/landlord/wallet', icon: Wallet },
];

const bottomNavItems: NavItem[] = [
    { label: 'Notifications', href: '/landlord/notifications', icon: Bell },
    { label: 'Settings', href: '/landlord/settings', icon: Settings },
];

interface DashboardSidebarProps {
    className?: string;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href: string) => pathname === href;

    const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
        const active = isActive(item.href);
        const Icon = item.icon;

        return (
            <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
          flex items-center gap-3 px-4 py-3 rounded-xl
          text-sm font-medium transition-all duration-200
          ${active
                        ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-neutral-900 dark:hover:text-white'
                    }
        `}
                aria-current={active ? 'page' : undefined}
            >
                <Icon size={20} />
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/landlord/dashboard" className="flex items-center gap-2">
                        <span className="text-xl font-bold text-neutral-900 dark:text-white">
                            Chioma
                        </span>
                    </Link>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 z-40 h-full w-64
          bg-white dark:bg-neutral-800
          border-r border-neutral-200 dark:border-neutral-700
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${className}
        `}
                aria-label="Dashboard navigation"
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="hidden lg:flex items-center gap-2 px-6 py-6 border-b border-neutral-100 dark:border-neutral-700">
                        <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center">
                            <Building2 size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-neutral-900 dark:text-white">
                            Chioma
                        </span>
                    </div>

                    {/* Mobile Spacer */}
                    <div className="lg:hidden h-16" />

                    {/* Main Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </nav>

                    {/* Bottom Navigation */}
                    <div className="px-4 py-4 border-t border-neutral-100 dark:border-neutral-700 space-y-1">
                        {bottomNavItems.map((item) => (
                            <NavLink key={item.href} item={item} />
                        ))}
                        <button
                            onClick={() => console.log('Logout clicked')}
                            className="
                flex items-center gap-3 px-4 py-3 rounded-xl w-full
                text-sm font-medium text-red-600 dark:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20
                transition-colors duration-200
              "
                        >
                            <LogOut size={20} />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default DashboardSidebar;
