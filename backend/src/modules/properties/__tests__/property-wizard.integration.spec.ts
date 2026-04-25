import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  GoneException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PropertyWizardService } from '../property-wizard.service';
import { PropertyListingDraft } from '../entities/property-listing-draft.entity';
import { PropertiesService } from '../properties.service';

const VALID_DATA = {
  propertyType: 'apartment',
  address: '42 Lagos Street, Victoria Island',
  bedrooms: 2,
  bathrooms: 1,
  monthlyRent: 1200,
  securityDeposit: 1200,
  leaseTerm: '1-year',
  moveInDate: '2027-06-01',
  photos: [
    { url: 'https://cdn.example.com/img1.jpg', order: 0 },
    { url: 'https://cdn.example.com/img2.jpg', order: 1 },
    { url: 'https://cdn.example.com/img3.jpg', order: 2 },
  ],
  propertyDescription: 'A beautiful 2-bedroom apartment in the heart of VI with great amenities and views.',
  availableFrom: '2027-06-01',
};

describe('Property Wizard — Integration Flow', () => {
  let service: PropertyWizardService;
  let draftRepository: any;
  let propertiesService: any;

  const makeDraft = (overrides = {}) => ({
    id: 'draft-uuid',
    landlordId: 'landlord-uuid',
    data: {},
    currentStep: 1,
    completedSteps: [] as number[],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  });

  beforeEach(async () => {
    draftRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ ...d, id: d.id ?? 'draft-uuid' })),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    propertiesService = {
      create: jest.fn().mockResolvedValue({ id: 'prop-uuid' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyWizardService,
        { provide: getRepositoryToken(PropertyListingDraft), useValue: draftRepository },
        { provide: PropertiesService, useValue: propertiesService },
      ],
    }).compile();

    service = module.get<PropertyWizardService>(PropertyWizardService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── start ──────────────────────────────────────────────────────────────────

  describe('start', () => {
    it('creates a draft with the correct landlordId', async () => {
      const result = await service.start('landlord-uuid');
      expect(result.landlordId).toBe('landlord-uuid');
      expect(draftRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ landlordId: 'landlord-uuid', currentStep: 1 }),
      );
    });

    it('sets an expiry 30 days in the future', async () => {
      const before = Date.now();
      const result = await service.start('landlord-uuid');
      const after = Date.now();

      const expiresMs = result.expiresAt.getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 29 * 24 * 60 * 60 * 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + 31 * 24 * 60 * 60 * 1000);
    });

    it('initialises completedSteps as empty array', async () => {
      const result = await service.start('landlord-uuid');
      expect(result.completedSteps).toEqual([]);
    });
  });

  // ── findDraft ──────────────────────────────────────────────────────────────

  describe('findDraft', () => {
    it('throws NotFoundException when draft does not exist', async () => {
      draftRepository.findOne.mockResolvedValue(null);
      await expect(service.findDraft('missing', 'landlord-uuid')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong landlord', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft({ landlordId: 'other-landlord' }));
      await expect(service.findDraft('draft-uuid', 'landlord-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('throws GoneException for expired draft', async () => {
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.findDraft('draft-uuid', 'landlord-uuid')).rejects.toThrow(GoneException);
    });

    it('returns the draft when valid and owned', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      const draft = await service.findDraft('draft-uuid', 'landlord-uuid');
      expect(draft.id).toBe('draft-uuid');
    });
  });

  // ── updateStep ─────────────────────────────────────────────────────────────

  describe('updateStep', () => {
    it('merges step data and marks step as completed', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      const result = await service.updateStep('draft-uuid', 'landlord-uuid', 1, {
        propertyType: 'apartment',
        address: '42 Lagos Street',
        bedrooms: 2,
        bathrooms: 1,
      });

      expect(result.data.propertyType).toBe('apartment');
      expect(result.completedSteps).toContain(1);
    });

    it('does not duplicate a step in completedSteps on repeated update', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft({ completedSteps: [1] }));
      const result = await service.updateStep('draft-uuid', 'landlord-uuid', 1, {
        propertyType: 'house',
      });

      const count = result.completedSteps.filter((s: number) => s === 1).length;
      expect(count).toBe(1);
    });

    it('throws UnprocessableEntityException for step 0', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      await expect(
        service.updateStep('draft-uuid', 'landlord-uuid', 0, {}),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException for step 9', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      await expect(
        service.updateStep('draft-uuid', 'landlord-uuid', 9, {}),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('returns validation errors for step 1 when required fields are missing', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      const result = await service.updateStep('draft-uuid', 'landlord-uuid', 1, {});

      expect(result.validationErrors.propertyType).toBeDefined();
      expect(result.validationErrors.address).toBeDefined();
    });

    it('returns no validation errors when step 2 data is complete', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      const result = await service.updateStep('draft-uuid', 'landlord-uuid', 2, {
        monthlyRent: 1000,
        securityDeposit: 500,
        leaseTerm: '6-month',
        moveInDate: '2027-01-01',
      });

      expect(Object.keys(result.validationErrors)).toHaveLength(0);
    });

    it('deep-merges nested objects without overwriting sibling keys', async () => {
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ data: { propertyType: 'apartment', address: 'existing' } }),
      );
      const result = await service.updateStep('draft-uuid', 'landlord-uuid', 1, {
        bedrooms: 3,
        bathrooms: 2,
      });

      expect(result.data.propertyType).toBe('apartment');
      expect(result.data.address).toBe('existing');
      expect(result.data.bedrooms).toBe(3);
    });
  });

  // ── publish ────────────────────────────────────────────────────────────────

  describe('publish', () => {
    it('publishes and returns propertyListingId when all steps are valid', async () => {
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ completedSteps: [1, 2, 3, 5, 6, 7], data: VALID_DATA }),
      );

      const result = await service.publish('draft-uuid', 'landlord-uuid');

      expect(propertiesService.create).toHaveBeenCalled();
      expect(draftRepository.remove).toHaveBeenCalled();
      expect(result.propertyListingId).toBe('prop-uuid');
      expect(result.redirectUrl).toBe('/properties/prop-uuid');
    });

    it('throws when a required step is missing', async () => {
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ completedSteps: [1, 2, 3, 5, 6], data: VALID_DATA }),
      );

      await expect(service.publish('draft-uuid', 'landlord-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws when fewer than 3 photos provided', async () => {
      const data = { ...VALID_DATA, photos: [{ url: 'u1', order: 0 }, { url: 'u2', order: 1 }] };
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ completedSteps: [1, 2, 3, 5, 6, 7], data }),
      );

      await expect(service.publish('draft-uuid', 'landlord-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws when description is too short', async () => {
      const data = { ...VALID_DATA, propertyDescription: 'short' };
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ completedSteps: [1, 2, 3, 5, 6, 7], data }),
      );

      await expect(service.publish('draft-uuid', 'landlord-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('does not call propertiesService.create if validation fails', async () => {
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ completedSteps: [1], data: {} }),
      );

      await expect(service.publish('draft-uuid', 'landlord-uuid')).rejects.toThrow();
      expect(propertiesService.create).not.toHaveBeenCalled();
    });

    it('does not remove the draft if property creation throws', async () => {
      draftRepository.findOne.mockResolvedValue(
        makeDraft({ completedSteps: [1, 2, 3, 5, 6, 7], data: VALID_DATA }),
      );
      propertiesService.create.mockRejectedValue(new Error('DB error'));

      await expect(service.publish('draft-uuid', 'landlord-uuid')).rejects.toThrow('DB error');
      expect(draftRepository.remove).not.toHaveBeenCalled();
    });
  });

  // ── removeDraft ────────────────────────────────────────────────────────────

  describe('removeDraft', () => {
    it('removes draft owned by the landlord', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft());
      await service.removeDraft('draft-uuid', 'landlord-uuid');
      expect(draftRepository.remove).toHaveBeenCalled();
    });

    it('throws ForbiddenException when landlord does not own draft', async () => {
      draftRepository.findOne.mockResolvedValue(makeDraft({ landlordId: 'someone-else' }));
      await expect(service.removeDraft('draft-uuid', 'landlord-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── full wizard flow ───────────────────────────────────────────────────────

  describe('end-to-end wizard flow', () => {
    it('completes all steps then publishes successfully', async () => {
      // Simulate a stateful draft that accumulates updates
      let currentDraft = makeDraft();
      draftRepository.findOne.mockImplementation(() => Promise.resolve({ ...currentDraft }));
      draftRepository.save.mockImplementation((d: any) => {
        currentDraft = { ...currentDraft, ...d };
        return Promise.resolve({ ...currentDraft });
      });

      await service.updateStep('draft-uuid', 'landlord-uuid', 1, {
        propertyType: 'apartment',
        address: '42 Lagos Street',
        bedrooms: 2,
        bathrooms: 1,
      });
      await service.updateStep('draft-uuid', 'landlord-uuid', 2, {
        monthlyRent: 1200,
        securityDeposit: 1200,
        leaseTerm: '1-year',
        moveInDate: '2027-06-01',
      });
      await service.updateStep('draft-uuid', 'landlord-uuid', 3, {});
      await service.updateStep('draft-uuid', 'landlord-uuid', 5, {
        photos: [
          { url: 'u1', order: 0 },
          { url: 'u2', order: 1 },
          { url: 'u3', order: 2 },
        ],
      });
      await service.updateStep('draft-uuid', 'landlord-uuid', 6, {
        propertyDescription: 'A beautiful 2-bedroom apartment in the heart of VI with great amenities.',
      });
      await service.updateStep('draft-uuid', 'landlord-uuid', 7, {
        availableFrom: '2027-06-01',
      });

      expect(currentDraft.completedSteps).toEqual(expect.arrayContaining([1, 2, 3, 5, 6, 7]));

      // Publish
      draftRepository.findOne.mockResolvedValue({ ...currentDraft });
      const result = await service.publish('draft-uuid', 'landlord-uuid');

      expect(result.propertyListingId).toBe('prop-uuid');
      expect(draftRepository.remove).toHaveBeenCalled();
    });
  });
});
