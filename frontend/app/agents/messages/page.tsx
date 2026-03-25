import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
          Messages
        </h1>
        <p className="text-sm text-blue-200/60 font-medium mt-1">
          Communicate with clients and leads
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5 shadow-inner">
          <MessageSquare
            size={32}
            className="text-blue-400"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          No messages yet
        </h2>
        <p className="text-sm text-blue-300/40 font-bold uppercase tracking-widest mt-2 max-w-xs">
          Conversations with your clients will appear here.
        </p>
      </div>
    </div>
  );
}
