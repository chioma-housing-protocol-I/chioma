'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/agent/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
