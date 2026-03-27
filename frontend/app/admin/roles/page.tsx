'use client';

import { RoleManagement } from '@/components/admin/RoleManagement';
import { useAuth } from '@/store/authStore';

export default function AdminRolesPage() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-100">
        Only administrators can access role management.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8">
      <RoleManagement />
    </div>
  );
}
