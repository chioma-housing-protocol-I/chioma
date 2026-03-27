'use client';

import { useAuth } from '@/store/authStore';
import { MfaDeviceManagement } from '@/components/dashboard/mfa/MfaDeviceManagement';

export default function MfaDevicesPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-100">
        Please login to manage MFA devices.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8">
      <MfaDeviceManagement userId={user.id} />
    </div>
  );
}
