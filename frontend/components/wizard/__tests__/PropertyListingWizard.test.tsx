import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockUseWizardStore = vi.fn();
const mockInitDraft = vi.fn();
const mockUpdateData = vi.fn();
const mockSaveStep = vi.fn();

vi.mock('@/store/wizard-store', () => ({
  useWizardStore: () => mockUseWizardStore(),
}));

vi.mock('../WizardProgressIndicator', () => ({
  WizardProgressIndicator: () => <div>progress-indicator</div>,
}));

vi.mock('../WizardNavigationButtons', () => ({
  WizardNavigationButtons: () => <div>navigation-buttons</div>,
}));

vi.mock('../steps/Step1BasicInfo', () => ({
  Step1BasicInfo: () => <div>step-1-basic-info</div>,
}));
vi.mock('../steps/Step2PricingTerms', () => ({
  Step2PricingTerms: () => <div>step-2-pricing-terms</div>,
}));
vi.mock('../steps/Step3Amenities', () => ({
  Step3Amenities: () => <div>step-3-amenities</div>,
}));
vi.mock('../steps/Step4HouseRules', () => ({
  Step4HouseRules: () => <div>step-4-house-rules</div>,
}));
vi.mock('../steps/Step5Photos', () => ({
  Step5Photos: () => <div>step-5-photos</div>,
}));
vi.mock('../steps/Step6Description', () => ({
  Step6Description: () => <div>step-6-description</div>,
}));
vi.mock('../steps/Step7Availability', () => ({
  Step7Availability: () => <div>step-7-availability</div>,
}));
vi.mock('../steps/Step8Preview', () => ({
  Step8Preview: () => <div>step-8-preview</div>,
}));

import { PropertyListingWizard } from '../PropertyListingWizard';

function setStoreState(overrides: Record<string, unknown> = {}) {
  mockUseWizardStore.mockReturnValue({
    currentStep: 1,
    initDraft: mockInitDraft,
    data: {},
    updateData: mockUpdateData,
    validationErrors: {},
    isInitialized: true,
    saveStep: mockSaveStep,
    ...overrides,
  });
}

describe('PropertyListingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitDraft.mockResolvedValue(undefined);
    mockSaveStep.mockResolvedValue(undefined);
    setStoreState();
  });

  it('shows a loading state while the wizard is not yet initialized', () => {
    setStoreState({ isInitialized: false });

    render(React.createElement(PropertyListingWizard, {}));

    expect(screen.getByText('Preparing your wizard...')).toBeInTheDocument();
    expect(
      screen.queryByText('Create Rental Property'),
    ).not.toBeInTheDocument();
  });

  it('renders the header, progress indicator and current step once initialized', () => {
    render(React.createElement(PropertyListingWizard, {}));

    expect(screen.getByText('Create Rental Property')).toBeInTheDocument();
    expect(screen.getByText('progress-indicator')).toBeInTheDocument();
    expect(screen.getByText('navigation-buttons')).toBeInTheDocument();
    expect(screen.getByText('step-1-basic-info')).toBeInTheDocument();
  });

  it('renders the matching step component for the current step', () => {
    setStoreState({ currentStep: 4 });

    render(React.createElement(PropertyListingWizard, {}));

    expect(screen.getByText('step-4-house-rules')).toBeInTheDocument();
    expect(screen.queryByText('step-1-basic-info')).not.toBeInTheDocument();
  });

  it('renders the preview step when on the final step', () => {
    setStoreState({ currentStep: 8 });

    render(React.createElement(PropertyListingWizard, {}));

    expect(screen.getByText('step-8-preview')).toBeInTheDocument();
  });

  it('calls initDraft with the provided draftId on mount', async () => {
    render(
      React.createElement(PropertyListingWizard, { draftId: 'draft-123' }),
    );

    await waitFor(() => {
      expect(mockInitDraft).toHaveBeenCalledWith('draft-123');
    });
  });

  it('shows an expiry message when the draft has expired (HTTP 410)', async () => {
    mockInitDraft.mockRejectedValue({ response: { status: 410 } });

    render(
      React.createElement(PropertyListingWizard, { draftId: 'draft-old' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          'Your draft has expired. Would you like to start a new one?',
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(
      screen.queryByText('Create Rental Property'),
    ).not.toBeInTheDocument();
  });

  it('shows a generic error message when the draft fails to load for another reason', async () => {
    mockInitDraft.mockRejectedValue(new Error('network down'));

    render(React.createElement(PropertyListingWizard, {}));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load draft. Please try again.'),
      ).toBeInTheDocument();
    });
  });
});
