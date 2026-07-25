'use client';

import { useEffect } from 'react';
import { globalRateLimitTracker } from '@/lib/rate-limit';
import { notify } from '@/components/ui/toast';

export default function RateLimitNotifier() {
  useEffect(() => {
    const unsubscribe = globalRateLimitTracker.subscribe(
      (state, retryAfterMs) => {
        let message = 'You have made too many requests. Please wait a moment.';
        if (retryAfterMs) {
          const seconds = Math.ceil(retryAfterMs / 1000);
          message = `You have made too many requests. Please wait ${seconds} second${seconds === 1 ? '' : 's'} before trying again.`;
        } else if (state.resetTimeMs) {
          const now = Date.now();
          const seconds = Math.max(
            1,
            Math.ceil((state.resetTimeMs - now) / 1000),
          );
          message = `You have made too many requests. Please wait ${seconds} second${seconds === 1 ? '' : 's'} before trying again.`;
        }

        notify.error(message, {
          id: 'rate-limit-toast', // Use an ID to prevent duplicate toasts
          duration: retryAfterMs || 4000,
        });
      },
    );

    return unsubscribe;
  }, []);

  return null;
}
