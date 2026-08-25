import { RetryOptions } from '../../common/interfaces/retry-options.interface';

/**
 * Delivery channels `NotificationsService.notify()` dispatches through.
 * `email`/`push` are reserved for when those channels are wired up here
 * directly; today only `persist` (the notifications table) and `realtime`
 * (the in-app websocket push) are exercised by this service.
 */
export type NotificationChannel = 'persist' | 'realtime' | 'email' | 'push';

/**
 * Per-channel retry/backoff policy. Channels differ a lot in failure and
 * retry characteristics: a DB write is cheap to retry a couple of times
 * with a short exponential backoff, while a websocket emit to a
 * potentially-offline client is not worth retrying much at all. Treating
 * every channel identically either spams a flaky channel or gives up on a
 * slow one too early — see issue #1580.
 */
export const NOTIFICATION_CHANNEL_RETRY_POLICY: Record<
  NotificationChannel,
  RetryOptions
> = {
  persist: {
    maxAttempts: 3,
    delay: 200,
    backoff: 'exponential',
    backoffMultiplier: 2,
  },
  realtime: {
    maxAttempts: 2,
    delay: 250,
    backoff: 'linear',
    backoffMultiplier: 1,
  },
  // Not yet dispatched from this service (see EmailService, which already
  // has its own @Retry policy on each send method) but declared here so the
  // full per-channel policy table is visible in one place.
  email: {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    backoffMultiplier: 2,
  },
  push: {
    maxAttempts: 3,
    delay: 500,
    backoff: 'exponential',
    backoffMultiplier: 2,
  },
};
