'use client';

import { useEffect, useState } from 'react';

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-900"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 text-sm">
        <span>
          You are offline. Some features may be unavailable until your
          connection is restored.
        </span>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-amber-400 px-3 py-1 font-medium hover:bg-amber-100"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
