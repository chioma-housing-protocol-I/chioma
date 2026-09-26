'use client';

import { useState } from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { startOAuth, type OAuthProvider } from '@/lib/oauth';

const providers: { id: OAuthProvider; label: string; icon: typeof FaGoogle }[] =
  [
    { id: 'google', label: 'Google', icon: FaGoogle },
    { id: 'github', label: 'GitHub', icon: FaGithub },
  ];

export default function OAuthButtons() {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  const handleClick = async (provider: OAuthProvider) => {
    if (pending) return;
    setPending(provider);
    try {
      await startOAuth(provider);
      // Navigation away happens on success; only errors reach the next line.
    } catch {
      toast.error(
        `Could not reach ${provider === 'google' ? 'Google' : 'GitHub'} sign-in. Please try again.`,
      );
      setPending(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          disabled={pending !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-cream/12 bg-ink-800 text-cream text-sm font-medium hover:border-brass-500/40 hover:text-brass-300 disabled:opacity-60 transition-colors"
        >
          {pending === id ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Icon size={15} />
          )}
          {label}
        </button>
      ))}
    </div>
  );
}
