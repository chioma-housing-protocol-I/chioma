'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, X, ChevronRight } from 'lucide-react';
import {
  COMPLETE_PROFILE_ROUTE,
  skipEmailOnboarding,
  useOnboardingGate,
} from '@/hooks/useOnboardingGate';

/**
 * Prompts wallet-only accounts for an email from inside the dashboard.
 *
 * Connecting a wallet proves control of an address, not of a mailbox, so these
 * accounts land with no email on file. We still want one for receipts and
 * account recovery — but asking for it must not block the dashboard, so this
 * is a dismissible banner rather than a gate.
 */
export function WalletEmailBanner() {
  const { shouldPrompt } = useOnboardingGate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Deferred to a scheduler tick to keep setState out of the effect body,
    // matching the sibling onboarding banner.
    if (!shouldPrompt) {
      setShow(false);
      return;
    }
    const id = setTimeout(() => setShow(true), 0);
    return () => clearTimeout(id);
  }, [shouldPrompt]);

  const dismiss = () => {
    skipEmailOnboarding();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-brass-500/30 bg-brass-500/10 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-brass-500/20 flex items-center justify-center shrink-0">
        <Mail size={18} className="text-brass-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Add an email address</p>
        <p className="text-xs text-blue-200/60 mt-1">
          So we can send receipts, lease updates, and help you recover your
          account.
        </p>
      </div>

      <Link
        href={COMPLETE_PROFILE_ROUTE}
        className="inline-flex items-center gap-1.5 rounded-xl bg-brass-500 px-3 py-2 text-xs font-semibold text-ink-950 hover:bg-brass-400 transition-colors shrink-0"
      >
        Add email
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
