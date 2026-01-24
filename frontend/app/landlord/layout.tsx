import React from 'react';
import type { Metadata } from 'next';
import { DashboardSidebar } from '@/components/dashboard';

export const metadata: Metadata = {
    title: 'Landlord Dashboard | Chioma',
    description: 'Manage your properties, track revenue, and handle tenant relations on the Stellar network.',
};

export default function LandlordLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
            {/* Sidebar */}
            <DashboardSidebar />

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen">
                {/* Mobile header spacer */}
                <div className="lg:hidden h-16" />

                {/* Page content */}
                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
