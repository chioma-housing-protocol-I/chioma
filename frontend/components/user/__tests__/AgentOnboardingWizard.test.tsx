import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import AgentOnboardingWizard from '../AgentOnboardingWizard';
import { AGENT_ONBOARDING_STORAGE_KEY } from '@/lib/agent-onboarding';

function fillProfileStep() {
  fireEvent.change(screen.getByLabelText('Full Name'), {
    target: { value: 'Ada Lovelace' },
  });
  fireEvent.change(screen.getByLabelText('Phone Number'), {
    target: { value: '+234 800 000 0000' },
  });
  fireEvent.change(screen.getByLabelText('Primary Markets'), {
    target: { value: 'Lekki, Yaba' },
  });
}

function fillAgencyStep() {
  fireEvent.change(screen.getByLabelText('Agency Name'), {
    target: { value: 'Chioma Realty' },
  });
  fireEvent.change(screen.getByLabelText('License Number'), {
    target: { value: 'LIC-12345' },
  });
}

function completeVerificationStep() {
  fireEvent.click(screen.getByText('Government-issued ID uploaded'));
  fireEvent.click(screen.getByText('Real estate license uploaded'));
  fireEvent.click(screen.getByText('Compliance terms acknowledged'));
}

function completeLeadToolsStep() {
  fireEvent.click(
    screen.getByText('I know how to use the CRM board for lead stages.'),
  );
  fireEvent.click(
    screen.getByText('I configured auto-replies for initial inquiries.'),
  );
  fireEvent.click(
    screen.getByText('I can track and prioritize hot leads in the pipeline.'),
  );
}

describe('AgentOnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders the first step with progress information', () => {
    render(<AgentOnboardingWizard />);

    expect(screen.getByText('Agent Onboarding Wizard')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('20% complete')).toBeInTheDocument();
    expect(screen.getByText('Set up your agent profile')).toBeInTheDocument();
  });

  it('disables Continue until the required profile fields are filled', () => {
    render(<AgentOnboardingWizard />);

    const continueButton = screen.getByText('Continue').closest('button')!;
    expect(continueButton).toBeDisabled();

    fillProfileStep();

    expect(continueButton).not.toBeDisabled();
  });

  it('disables Previous on the first step and enables it after advancing', () => {
    render(<AgentOnboardingWizard />);

    const previousButton = screen.getByText('Previous').closest('button')!;
    expect(previousButton).toBeDisabled();

    fillProfileStep();
    fireEvent.click(screen.getByText('Continue'));

    expect(screen.getByText('Agency verification details')).toBeInTheDocument();
    expect(previousButton).not.toBeDisabled();

    fireEvent.click(previousButton);
    expect(screen.getByText('Set up your agent profile')).toBeInTheDocument();
  });

  it('walks through every step and completes onboarding', () => {
    render(<AgentOnboardingWizard />);

    // Step 0: Profile
    fillProfileStep();
    fireEvent.click(screen.getByText('Continue'));

    // Step 1: Agency
    expect(screen.getByText('Agency verification details')).toBeInTheDocument();
    fillAgencyStep();
    fireEvent.click(screen.getByText('Continue'));

    // Step 2: Verification
    expect(
      screen.getByText('Complete verification checklist'),
    ).toBeInTheDocument();
    const verificationContinue = screen
      .getByText('Continue')
      .closest('button')!;
    expect(verificationContinue).toBeDisabled();
    completeVerificationStep();
    expect(verificationContinue).not.toBeDisabled();
    fireEvent.click(screen.getByText('Continue'));

    // Step 3: Commission (defaults already satisfy canGoNext)
    expect(
      screen.getByText('Configure commission structure'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Fixed'));
    fireEvent.click(screen.getByText('Continue'));

    // Step 4: Lead tools
    expect(
      screen.getByText('Lead management quick tutorial'),
    ).toBeInTheDocument();
    const completeButton = screen
      .getByText('Complete Setup')
      .closest('button')!;
    expect(completeButton).toBeDisabled();
    completeLeadToolsStep();
    expect(completeButton).not.toBeDisabled();

    fireEvent.click(screen.getByText('Complete Setup'));

    expect(pushMock).toHaveBeenCalledWith('/user');

    const saved = JSON.parse(
      window.localStorage.getItem(AGENT_ONBOARDING_STORAGE_KEY) || '{}',
    );
    expect(saved.completed).toBe(true);
    expect(saved.profile.fullName).toBe('Ada Lovelace');
    expect(saved.commission.model).toBe('fixed');
  });

  it('loads previously persisted data from localStorage', () => {
    window.localStorage.setItem(
      AGENT_ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        profile: {
          fullName: 'Existing Agent',
          phone: '123',
          markets: 'Ikeja',
          yearsExperience: '5',
        },
      }),
    );

    render(<AgentOnboardingWizard />);

    expect(screen.getByDisplayValue('Existing Agent')).toBeInTheDocument();
  });
});
