import React from 'react';

export function SkeletonCard() {
  return (
    <div className="backdrop-blur-xl bg-slate-800/50 rounded-2xl p-6 border border-white/10 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-slate-700/50 rounded-full"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-700/50 rounded w-1/3"></div>
          <div className="h-3 bg-slate-700/50 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-slate-700/50 rounded w-full"></div>
        <div className="h-3 bg-slate-700/50 rounded w-5/6"></div>
        <div className="h-3 bg-slate-700/50 rounded w-4/6"></div>
      </div>
    </div>
  );
}
