'use client';

import { useAuth } from '@/store/authStore';
import { ProfileMetadataManagement } from '@/components/dashboard/profile/ProfileMetadataManagement';

export default function ProfileMetadataPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-100">
        Please login to manage profile metadata.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4 sm:p-6 lg:p-8">
      <ProfileMetadataManagement userId={user.id} />
    </div>
  );
}
