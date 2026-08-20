import { describe, it, expect } from 'vitest';
import {
  maintenanceSchema,
  contactSchema,
  propertyInquirySchema,
  disputeFilingSchema,
  tenantOnboardingSearchSchema,
  tenantOnboardingDiscoverySchema,
} from '@/lib/validation/forms';

describe('maintenanceSchema', () => {
  const valid = {
    title: 'Broken faucet',
    description: 'The kitchen faucet is leaking water steadily.',
    priority: 'MEDIUM',
    propertyId: '',
    propertyName: 'Apartment 4B',
  };

  it('accepts a valid maintenance request', () => {
    expect(maintenanceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing title with message', () => {
    const result = maintenanceSchema.safeParse({
      ...valid,
      title: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'title');
      expect(issue?.message).toBe('Title is required');
    }
  });

  it('rejects a missing description with message', () => {
    const result = maintenanceSchema.safeParse({
      ...valid,
      description: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'description',
      );
      expect(issue?.message).toBe('Description is required');
    }
  });

  it('rejects an invalid priority enum value', () => {
    const result = maintenanceSchema.safeParse({
      ...valid,
      priority: 'CRITICAL',
    });
    expect(result.success).toBe(false);
  });
});

describe('contactSchema', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '',
    subject: 'Property inquiry',
    message: 'I would like more information about the apartment.',
  };

  it('accepts a valid contact submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email with message', () => {
    const result = contactSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(issue?.message).toBe('Enter a valid email address');
    }
  });

  it('rejects a short name with message', () => {
    const result = contactSchema.safeParse({ ...valid, name: 'J' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'name');
      expect(issue?.message).toBe('Enter your name');
    }
  });

  it('rejects a short message with message', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'hi' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'message');
      expect(issue?.message).toBe(
        'Message should be at least 12 characters',
      );
    }
  });
});

describe('propertyInquirySchema', () => {
  const valid = {
    propertyId: 'prop-1',
    propertyTitle: 'Ocean View Loft',
    name: 'John Smith',
    email: 'john@example.com',
    phone: '',
    message: 'Hello, I am interested in this property.',
  };

  it('accepts a valid inquiry', () => {
    expect(propertyInquirySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing name with message', () => {
    const result = propertyInquirySchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'name');
      expect(issue?.message).toBe('Name is required');
    }
  });

  it('rejects an invalid email with message', () => {
    const result = propertyInquirySchema.safeParse({
      ...valid,
      email: 'bad-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'email');
      expect(issue?.message).toBe('Enter a valid email address');
    }
  });

  it('rejects a too-short message with message', () => {
    const result = propertyInquirySchema.safeParse({
      ...valid,
      message: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('disputeFilingSchema', () => {
  const valid = {
    agreementId: 'ag-123',
    disputeType: 'MAINTENANCE',
    description:
      'The landlord failed to fix the broken water heater for over two weeks despite multiple requests.',
    requestedAmount: '',
  };

  it('accepts a valid dispute filing', () => {
    expect(disputeFilingSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing agreementId with message', () => {
    const result = disputeFilingSchema.safeParse({
      ...valid,
      agreementId: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'agreementId',
      );
      expect(issue?.message).toBe('Agreement ID is required');
    }
  });

  it('rejects a too-short description with message', () => {
    const result = disputeFilingSchema.safeParse({
      ...valid,
      description: 'Too short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'description',
      );
      expect(issue?.message).toBe(
        'Description must be at least 20 characters',
      );
    }
  });

  it('rejects a negative requested amount', () => {
    const result = disputeFilingSchema.safeParse({
      ...valid,
      requestedAmount: '-5',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid disputeType enum', () => {
    const result = disputeFilingSchema.safeParse({
      ...valid,
      disputeType: 'FAKE_TYPE',
    });
    expect(result.success).toBe(false);
  });
});

describe('tenantOnboardingSearchSchema', () => {
  it('accepts a city entry', () => {
    const result = tenantOnboardingSearchSchema.safeParse({
      savedSearchCity: 'Lagos',
      notificationsEnabled: true,
      searchRadius: '10',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty city with message', () => {
    const result = tenantOnboardingSearchSchema.safeParse({
      savedSearchCity: '',
      notificationsEnabled: true,
      searchRadius: '10',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'savedSearchCity',
      );
      expect(issue?.message).toBe('Please enter a city or neighborhood');
    }
  });
});

describe('tenantOnboardingDiscoverySchema', () => {
  const allAcknowledged = {
    paymentsAcknowledged: true,
    disputesAcknowledged: true,
    blockchainAcknowledged: true,
  };

  it('accepts when all features are acknowledged', () => {
    expect(
      tenantOnboardingDiscoverySchema.safeParse(allAcknowledged).success,
    ).toBe(true);
  });

  it('rejects when payments are not acknowledged with message', () => {
    const result = tenantOnboardingDiscoverySchema.safeParse({
      ...allAcknowledged,
      paymentsAcknowledged: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'paymentsAcknowledged',
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('instant rent payments');
    }
  });

  it('rejects when disputes are not acknowledged', () => {
    const result = tenantOnboardingDiscoverySchema.safeParse({
      ...allAcknowledged,
      disputesAcknowledged: false,
    });
    expect(result.success).toBe(false);
  });
});