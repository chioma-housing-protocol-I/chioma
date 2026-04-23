'use client';

export type TenantOnboardingEventName =
  | 'tenant_onboarding_started'
  | 'tenant_onboarding_resumed'
  | 'tenant_onboarding_step_viewed'
  | 'tenant_onboarding_step_skipped'
  | 'tenant_onboarding_step_completed'
  | 'tenant_onboarding_completed';

export function trackTenantOnboardingEvent(
  eventName: TenantOnboardingEventName,
  payload: Record<string, unknown> = {},
) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('chioma:tenant:onboarding:analytics', {
      detail: {
        eventName,
        payload,
        ts: new Date().toISOString(),
      },
    }),
  );
}
