import { describe, it, expect } from 'vitest';
import {
  maintenanceSchema,
  contactSchema,
  propertyInquirySchema,
  disputeFilingSchema,
  tenantOnboardingProfileSchema,
  tenantOnboardingSearchSchema,
  tenantOnboardingDiscoverySchema,
} from '@/lib/validation/forms';

describe('maintenance form validation', () => {
  it('rejects empty title and description', () => {
    const parsed = maintenanceSchema.safeParse({
      title: '',
      description: '',
      priority: 'MEDIUM',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain('Title is required');
      expect(messages).toContain('Description is required');
    }
  });

  it('accepts valid maintenance data', () => {
    const parsed = maintenanceSchema.safeParse({
      title: 'Leaky faucet',
      description: 'The kitchen faucet has been dripping for two days.',
      priority: 'HIGH',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects title over 200 characters', () => {
    const parsed = maintenanceSchema.safeParse({
      title: 'x'.repeat(201),
      description: 'Valid description here',
      priority: 'LOW',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('contact form validation', () => {
  it('rejects invalid email', () => {
    const parsed = contactSchema.safeParse({
      name: 'Jane Doe',
      email: 'not-an-email',
      phone: '+2348000000000',
      subject: 'Hello',
      message: 'This is a valid message body',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'Enter a valid email address',
      );
    }
  });

  it('rejects short name', () => {
    const parsed = contactSchema.safeParse({
      name: 'J',
      email: 'jane@example.com',
      subject: 'Hello',
      message: 'This is a valid message body',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'Enter your name',
      );
    }
  });

  it('accepts valid contact data', () => {
    const parsed = contactSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '',
      subject: 'Hello there',
      message: 'This is a valid message body',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('property inquiry validation', () => {
  it('rejects empty name and message', () => {
    const parsed = propertyInquirySchema.safeParse({
      name: '',
      email: '',
      phone: '',
      message: '',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message);
      expect(messages).toContain('Name is required');
      expect(messages).toContain('Enter a valid email address');
    }
  });

  it('accepts valid inquiry data', () => {
    const parsed = propertyInquirySchema.safeParse({
      propertyId: 'prop-123',
      propertyTitle: 'Lagos apartment',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '',
      message: 'Hello, I am interested.',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('dispute filing validation', () => {
  it('rejects short description', () => {
    const parsed = disputeFilingSchema.safeParse({
      agreementId: 'AGR-2025-014',
      disputeType: 'RENT_PAYMENT',
      description: 'Too short',
      requestedAmount: undefined,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'Description must be at least 20 characters',
      );
    }
  });

  it('rejects negative requested amount', () => {
    const parsed = disputeFilingSchema.safeParse({
      agreementId: 'AGR-2025-014',
      disputeType: 'RENT_PAYMENT',
      description: 'This is a sufficiently long description for the dispute.',
      requestedAmount: '-5',
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'Must be a positive number',
      );
    }
  });

  it('accepts valid dispute data', () => {
    const parsed = disputeFilingSchema.safeParse({
      agreementId: 'AGR-2025-014',
      disputeType: 'MAINTENANCE',
      description: 'This is a sufficiently long description for the dispute.',
      requestedAmount: '',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('tenant onboarding validation', () => {
  it('accepts empty profile fields', () => {
    const parsed = tenantOnboardingProfileSchema.safeParse({
      phone: '',
      bio: '',
      location: '',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty saved search city', () => {
    const parsed = tenantOnboardingSearchSchema.safeParse({
      savedSearchCity: '',
      notificationsEnabled: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'Please enter a city or neighborhood',
      );
    }
  });

  it('requires all discovery acknowledgements', () => {
    const parsed = tenantOnboardingDiscoverySchema.safeParse({
      paymentsAcknowledged: true,
      disputesAcknowledged: false,
      blockchainAcknowledged: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((i) => i.message)).toContain(
        'Please acknowledge the dispute resolution feature',
      );
    }
  });

  it('accepts complete discovery acknowledgements', () => {
    const parsed = tenantOnboardingDiscoverySchema.safeParse({
      paymentsAcknowledged: true,
      disputesAcknowledged: true,
      blockchainAcknowledged: true,
    });
    expect(parsed.success).toBe(true);
  });
});