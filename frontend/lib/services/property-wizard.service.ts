import { apiClient } from '@/lib/api-client';
import {
  readStorage,
  removeStorage,
  writeStorage,
} from '@/lib/persistence/storage';
import type { PropertyData, WizardDraft } from '@/lib/property-wizard';

const STORAGE_NAMESPACE = 'property_wizard';
const STORAGE_KEY = 'draft';
const STORAGE_VERSION = 1;

class PropertyWizardService {
  async loadDraft(): Promise<WizardDraft | null> {
    try {
      const local = readStorage<WizardDraft>(STORAGE_NAMESPACE, STORAGE_KEY, {
        version: STORAGE_VERSION,
      });
      return local;
    } catch {
      return null;
    }
  }

  async saveDraft(draft: WizardDraft): Promise<void> {
    writeStorage(STORAGE_NAMESPACE, STORAGE_KEY, draft, STORAGE_VERSION);

    if (!draft.draftId) return;

    try {
      await apiClient.patch(
        `/properties/property-listings/wizard/${draft.draftId}/step`,
        {
          currentStep: draft.currentStep,
          completedSteps: draft.completedSteps,
          data: draft.propertyData,
        },
      );
    } catch {
      // Draft endpoint not yet available in all environments.
    }
  }

  async startDraft(initialData: PropertyData): Promise<string | null> {
    try {
      const response = await apiClient.post<{ id: string }>(
        '/properties/property-listings/wizard/start',
        { data: initialData },
      );
      return response.data.id;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    removeStorage(STORAGE_NAMESPACE, STORAGE_KEY);
  }

  async publish(data: PropertyData): Promise<void> {
    const payload = this.mapToCreatePropertyPayload(data);
    const created = await apiClient.post<{ id: string }>(
      '/properties',
      payload,
    );
    await apiClient.post(`/properties/${created.data.id}/publish`);
  }

  private mapToCreatePropertyPayload(data: PropertyData) {
    const safeTitle =
      data.basicInfo.title.trim() ||
      `${data.basicInfo.propertyType} at ${data.basicInfo.address}`;

    const descriptionSections = [
      data.description.propertyDescription.trim(),
      data.description.neighborhoodDescription.trim(),
      data.description.transportationInfo.trim(),
      data.description.nearbyAmenities.trim(),
    ].filter(Boolean);

    const onlinePhotos = data.photos
      .filter((photo) => /^https?:\/\//.test(photo.url))
      .map((photo, index) => ({
        url: photo.url,
        sortOrder: index,
        isPrimary: index === 0,
      }));

    const amenities = Object.entries(data.amenities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => ({ name }));

    return {
      title: safeTitle,
      description: descriptionSections.join('\n\n'),
      type: data.basicInfo.propertyType,
      address: data.basicInfo.address,
      price: data.pricing.monthlyRent ?? 0,
      bedrooms: data.basicInfo.bedrooms ?? 0,
      bathrooms: data.basicInfo.bathrooms ?? 0,
      area: data.basicInfo.squareFootage ?? 0,
      isFurnished: data.amenities.furnished,
      hasParking: data.amenities.parking,
      petsAllowed: data.rules.petsAllowed,
      amenities,
      images: onlinePhotos,
      metadata: {
        yearBuilt: data.basicInfo.yearBuilt,
        securityDeposit: data.pricing.securityDeposit,
        leaseTermMonths: data.pricing.leaseTermMonths,
        moveInDate: data.pricing.moveInDate,
        utilitiesIncluded: data.pricing.utilitiesIncluded,
        houseRules: data.rules,
        availability: data.availability,
        localPhotoCount: data.photos.length,
      },
    };
  }
}

export const propertyWizardService = new PropertyWizardService();
