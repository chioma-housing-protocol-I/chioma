'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

type OnboardingEventName =
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_step_skipped'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_resumed';

interface OnboardingEventPayload {
  step?: number;
  totalSteps?: number;
  progressPercent?: number;
  source?: string;
}

interface OnboardingContextValue {
  currentStep: number;
  totalSteps: number;
  setCurrentStep: (step: number) => void;
  setTotalSteps: (steps: number) => void;
  track: (eventName: OnboardingEventName, payload?: OnboardingEventPayload) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function emitOnboardingEvent(
  eventName: OnboardingEventName,
  payload: OnboardingEventPayload,
) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('chioma:onboarding:event', {
      detail: {
        eventName,
        payload,
        ts: new Date().toISOString(),
      },
    }),
  );
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      currentStep,
      totalSteps,
      setCurrentStep,
      setTotalSteps,
      track: (eventName, payload = {}) => emitOnboardingEvent(eventName, payload),
    }),
    [currentStep, totalSteps],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return value;
}
