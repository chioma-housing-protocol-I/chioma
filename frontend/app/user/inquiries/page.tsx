'use client';

import React from 'react';
import Link from 'next/link';
import { Inbox, Send } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { InquiriesList } from '@/components/user/InquiriesList';

type InquiryTab = 'incoming' | 'outgoing';

export default function UserInquiriesPage() {
  const { user, isAuthenticated, loading } = useAuthStore();
  const [tab, setTab] = React.useState<InquiryTab>('incoming');

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <Inbox className="mb-5 h-16 w-16 text-blue-400/50" />
        <h1 className="mb-2 text-2xl font-black text-white">Access Denied</h1>
        <p className="mb-6 text-blue-200/50">
          Inquiries are only available to verified users.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Connect Wallet
        </Link>
      </div>
    );
  }

  const tabs: { key: InquiryTab; label: string; icon: typeof Inbox }[] = [
    { key: 'incoming', label: 'Incoming', icon: Inbox },
    { key: 'outgoing', label: 'Sent', icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Inquiries
        </h1>
        <p className="mt-1 text-blue-200/50">
          Questions about your listings, and questions you&apos;ve sent to other
          landlords.
        </p>
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === key
                ? 'border-blue-500 text-white'
                : 'border-transparent text-blue-300/40 hover:text-blue-200/70'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <InquiriesList direction={tab} />
    </div>
  );
}
