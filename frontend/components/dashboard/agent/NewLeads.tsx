'use client';

import React from 'react';
import Image from 'next/image';

const NewLeads = () => {
  const leads = [
    {
      id: 1,
      name: 'Michael Chen',
      message: 'Is this unit available for...',
      time: '10m',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    },
    {
      id: 2,
      name: 'Emma Wilson',
      message: "I'd like to schedule a view...",
      time: '1h',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    },
    {
      id: 3,
      name: 'David Miller',
      message: 'What are the lease terms?',
      time: '3h',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
          New Leads
        </h3>
        <span className="px-2 py-0.5 bg-blue-50 text-brand-blue text-[10px] font-bold rounded-full">
          3 New
        </span>
      </div>

      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-start gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0">
              <Image
                src={lead.avatar}
                alt={lead.name}
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <h4 className="text-sm font-bold text-neutral-900">
                  {lead.name}
                </h4>
                <span className="text-[10px] text-neutral-400">
                  {lead.time}
                </span>
              </div>
              <p className="text-xs text-neutral-500 truncate">
                {lead.message}
              </p>
            </div>

            <button className="text-xs font-semibold text-brand-blue hover:text-blue-700 transition-colors shrink-0 self-center">
              Reply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewLeads;
