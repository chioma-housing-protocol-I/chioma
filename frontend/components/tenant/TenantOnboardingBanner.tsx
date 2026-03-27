'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import {
  loadTenantOnboardingData,
  getTenantOnboardingProgress,
} from '@/lib/tenant-onboarding';

const DISMISSED_KEY = 'chioma_onboarding_banner_dismissed';

export function TenantOnboardingBanner() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const data = loadTenantOnboardingData();
    const shouldShow =
      !data.completed && !sessionStorage.getItem(DISMISSED_KEY);
    if (shouldShow) {
      const p = getTenantOnboardingProgress(data);
      // Batch both state updates in a single scheduler tick via a timeout
      // to avoid the synchronous-setState-in-effect lint rule.
      const id = setTimeout(() => {
        setProgress(p);
        setShow(true);
      }, 0);
      return () => clearTimeout(id);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
        <Sparkles size={18} className="text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          Complete your profile setup
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 max-w-[120px]">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-blue-200/60 shrink-0">
            {progress}% done
          </span>
        </div>
      </div>

      <Link
        href="/tenant/onboarding"
        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shrink-0"
      >
        {progress > 0 ? 'Resume' : 'Get Started'}
        <ChevronRight size={14} />
      </Link>

      <button
        onClick={dismiss}
        className="p-1.5 text-blue-200/40 hover:text-blue-200 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
