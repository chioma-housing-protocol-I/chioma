'use client';

import React from 'react';
import DashboardLayout from '@/components/dashboard/agent/DashboardLayout';
import { ContractDashboard } from '@/components/dashboard/agent/contracts/ContractDashboard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AgentContractsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ContractDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
