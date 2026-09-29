import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/onboarding-analytics', () => ({
  trackTenantOnboardingEvent: vi.fn(),
}));

import { TenantOnboardingWizard } from '../TenantOnboardingWizard';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { TENANT_ONBOARDING_STORAGE_KEY } from '@/lib/tenant-onboarding';

function renderWizard() {
  return render(
    <OnboardingProvider>
      <TenantOnboardingWizard />
    </OnboardingProvider>,
  );
}

describe('TenantOnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the first step (profile) by default', () => {
    renderWizard();

    expect(screen.getByText('Your Profile')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('+1 (555) 000-0000'),
    ).toBeInTheDocument();
  });

  it('advances to the preferences step when Continue is clicked', () => {
    renderWizard();

    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('Rental Preferences')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('goes back to the previous step when Back is clicked', () => {
    renderWizard();

    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
  });

  it('disables Continue on the search step until a city is entered', () => {
    renderWizard();

    fireEvent.click(screen.getByText('Continue')); // -> preferences
    fireEvent.click(screen.getByText('Continue')); // -> search

    expect(screen.getByText('Property Search')).toBeInTheDocument();
    expect(screen.getByText('Continue').closest('button')).toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText('e.g. Victoria Island, Lagos'),
      { target: { value: 'Lagos' } },
    );

    expect(screen.getByText('Continue').closest('button')).not.toBeDisabled();
  });

  it('persists skipped steps and lets the user skip the profile step', () => {
    renderWizard();

    fireEvent.click(screen.getByText('Skip'));

    expect(screen.getByText('Rental Preferences')).toBeInTheDocument();

    const stored = JSON.parse(
      localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY) ?? '{}',
    );
    expect(stored.skippedSteps).toContain(0);
  });

  it('requires all discovery acknowledgements before finishing, then completes onboarding', () => {
    renderWizard();

    // Step 0 -> 1 -> 2 (fill city) -> 3
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.change(
      screen.getByPlaceholderText('e.g. Victoria Island, Lagos'),
      { target: { value: 'Lagos' } },
    );
    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('Feature Discovery')).toBeInTheDocument();
    const finishButton = screen.getByText('Finish Setup').closest('button')!;
    expect(finishButton).toBeDisabled();

    fireEvent.click(screen.getByText('Instant Rent Payments'));
    fireEvent.click(screen.getByText('Dispute Resolution'));
    fireEvent.click(screen.getByText('Blockchain Lease Agreements'));

    expect(finishButton).not.toBeDisabled();

    fireEvent.click(finishButton);

    expect(mockPush).toHaveBeenCalledWith('/user');
    const stored = JSON.parse(
      localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY) ?? '{}',
    );
    expect(stored.completed).toBe(true);
  });
});
