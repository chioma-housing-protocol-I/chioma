'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCcw, ServerCrash, WifiOff } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-client';

type ConnectivityState = 'checking' | 'offline' | 'server-error' | 'online';

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** Probes the API's health endpoint to tell "no network" apart from "network is fine, API is down". */
async function probeApiHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    HEALTH_CHECK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function OfflinePage() {
  const [state, setState] = useState<ConnectivityState>('checking');
  const checkInFlight = useRef(false);

  const runCheck = useCallback(async () => {
    if (checkInFlight.current) return;
    checkInFlight.current = true;

    if (!navigator.onLine) {
      setState('offline');
      checkInFlight.current = false;
      return;
    }

    const healthy = await probeApiHealth();
    setState(healthy ? 'online' : 'server-error');
    checkInFlight.current = false;
  }, []);

  useEffect(() => {
    runCheck();

    const onOnline = () => runCheck();
    const onOffline = () => setState('offline');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [runCheck]);

  const isServerError = state === 'server-error';
  const isBackOnline = state === 'online';
  const isChecking = state === 'checking';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-16 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur">
        <div
          className={`inline-flex rounded-2xl p-4 ${
            isBackOnline
              ? 'bg-emerald-500/10 text-emerald-300'
              : isServerError
                ? 'bg-amber-500/10 text-amber-300'
                : 'bg-blue-500/10 text-blue-300'
          }`}
        >
          {isBackOnline ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : isServerError ? (
            <ServerCrash className="h-8 w-8" />
          ) : (
            <WifiOff className="h-8 w-8" />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {isBackOnline
            ? "You're back online"
            : isServerError
              ? "We can't reach Chioma"
              : "You're offline"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          {isBackOnline
            ? 'Your connection and Chioma are both up. Continue to pick up where you left off.'
            : isServerError
              ? "Your connection looks fine, but Chioma's servers aren't responding right now. This is on our end — try again in a moment."
              : 'Chioma cached this screen so you can still open the app shell. Reconnect to refresh listings, leases, messages, and payments.'}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {isBackOnline ? (
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              href="/"
            >
              Continue
            </Link>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => runCheck()}
              disabled={isChecking}
              type="button"
            >
              <RefreshCcw
                className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
              />
              {isServerError ? 'Check again' : 'Try again'}
            </button>
          )}
          <Link
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
