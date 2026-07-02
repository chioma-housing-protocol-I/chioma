export const WIZARD_STEPS = [
  'Basic Information',
  'Pricing & Terms',
  'Amenities',
  'House Rules',
  'Photos',
  'Description',
  'Availability',
  'Preview & Publish',
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export type PropertyTypeOption =
  | 'apartment'
  | 'house'
  | 'room'
  | 'commercial'
  | 'land'
  | 'other';

export interface BasicInfo {
  title: string;
  propertyType: PropertyTypeOption;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  yearBuilt: number | null;
}

export interface PricingTerms {
  monthlyRent: number | null;
  securityDeposit: number | null;
  leaseTermMonths: number | null;
  moveInDate: string;
  utilitiesIncluded: string[];
}

export interface Amenities {
  wifi: boolean;
  parking: boolean;
  kitchenAppliances: boolean;
  laundry: boolean;
  airConditioning: boolean;
  heating: boolean;
  furnished: boolean;
}

export interface HouseRules {
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  childrenAllowed: boolean;
  quietHours: string;
  guestPolicy: string;
}

export interface PhotoItem {
  id: string;
  name: string;
  url: string;
  caption: string;
  order: number;
  size: number;
  width: number;
  height: number;
  qualityIssues: string[];
}

export interface DescriptionData {
  propertyDescription: string;
  neighborhoodDescription: string;
  transportationInfo: string;
  nearbyAmenities: string;
}

export interface Availability {
  availableFrom: string;
  blockedDates: string[];
}

export interface PropertyData {
  basicInfo: BasicInfo;
  pricing: PricingTerms;
  amenities: Amenities;
  rules: HouseRules;
  photos: PhotoItem[];
  description: DescriptionData;
  availability: Availability;
}

export interface WizardDraft {
  draftId?: string;
  currentStep: number;
  completedSteps: number[];
  propertyData: PropertyData;
  updatedAt: string;
}

export const defaultPropertyData: PropertyData = {
  basicInfo: {
    title: '',
    propertyType: 'apartment',
    address: '',
    bedrooms: null,
    bathrooms: null,
    squareFootage: null,
    yearBuilt: null,
  },
  pricing: {
    monthlyRent: null,
    securityDeposit: null,
    leaseTermMonths: 12,
    moveInDate: '',
    utilitiesIncluded: [],
  },
  amenities: {
    wifi: false,
    parking: false,
    kitchenAppliances: false,
    laundry: false,
    airConditioning: false,
    heating: false,
    furnished: false,
  },
  rules: {
    smokingAllowed: false,
    petsAllowed: false,
    partiesAllowed: false,
    childrenAllowed: true,
    quietHours: '',
    guestPolicy: '',
  },
  photos: [],
  description: {
    propertyDescription: '',
    neighborhoodDescription: '',
    transportationInfo: '',
    nearbyAmenities: '',
  },
  availability: {
    availableFrom: '',
    blockedDates: [],
  },
};

export function validateStep(step: number, data: PropertyData): string[] {
  const errors: string[] = [];

  if (step === 0) {
    if (!data.basicInfo.title.trim()) errors.push('Listing title is required.');
    if (!data.basicInfo.address.trim()) errors.push('Address is required.');
    if (!data.basicInfo.bedrooms && data.basicInfo.bedrooms !== 0) {
      errors.push('Number of bedrooms is required.');
    }
    if (!data.basicInfo.bathrooms && data.basicInfo.bathrooms !== 0) {
      errors.push('Number of bathrooms is required.');
    }
    if (!data.basicInfo.squareFootage || data.basicInfo.squareFootage <= 0) {
      errors.push('Square footage must be greater than zero.');
    }
  }

  if (step === 1) {
    if (!data.pricing.monthlyRent || data.pricing.monthlyRent <= 0) {
      errors.push('Monthly rent must be greater than zero.');
    }
    if (
      data.pricing.securityDeposit === null ||
      data.pricing.securityDeposit < 0
    ) {
      errors.push('Security deposit is required.');
    }
    if (!data.pricing.leaseTermMonths || data.pricing.leaseTermMonths <= 0) {
      errors.push('Lease term is required.');
    }
    if (!data.pricing.moveInDate) errors.push('Move-in date is required.');
  }

  if (step === 4) {
    if (data.photos.length < 3) errors.push('At least 3 photos are required.');
  }

  if (step === 5) {
    if (data.description.propertyDescription.trim().length < 120) {
      errors.push('Property description must be at least 120 characters.');
    }
  }

  if (step === 6) {
    if (!data.availability.availableFrom) {
      errors.push('Available-from date is required.');
    }
    if (
      data.pricing.moveInDate &&
      data.availability.availableFrom &&
      new Date(data.availability.availableFrom) >
        new Date(data.pricing.moveInDate)
    ) {
      errors.push('Move-in date cannot be before available-from date.');
    }
  }

  return errors;
}

export function getCompletenessScore(data: PropertyData): number {
  let score = 0;
  const checks = [
    Boolean(data.basicInfo.title.trim()),
    Boolean(data.basicInfo.address.trim()),
    Boolean(data.basicInfo.bedrooms || data.basicInfo.bedrooms === 0),
    Boolean(data.basicInfo.bathrooms || data.basicInfo.bathrooms === 0),
    Boolean(data.basicInfo.squareFootage && data.basicInfo.squareFootage > 0),
    Boolean(data.pricing.monthlyRent && data.pricing.monthlyRent > 0),
    Boolean(
      data.pricing.securityDeposit !== null &&
      data.pricing.securityDeposit >= 0,
    ),
    Boolean(data.pricing.leaseTermMonths),
    Boolean(data.pricing.moveInDate),
    data.photos.length >= 3,
    data.description.propertyDescription.trim().length >= 120,
    Boolean(data.availability.availableFrom),
  ];

  for (const passed of checks) {
    if (passed) score += 1;
  }

  return Math.round((score / checks.length) * 100);
}

const MARKET_BASELINES: Record<PropertyTypeOption, number> = {
  apartment: 2200,
  house: 3200,
  room: 900,
  commercial: 4500,
  land: 1200,
  other: 1800,
};

export function getPricingSuggestion(data: PropertyData): {
  min: number;
  max: number;
  median: number;
} {
  const typeBase = MARKET_BASELINES[data.basicInfo.propertyType];
  const bedrooms = data.basicInfo.bedrooms ?? 1;
  const sqftFactor = Math.max((data.basicInfo.squareFootage ?? 700) / 700, 0.7);
  const bedroomFactor = 1 + Math.max(0, bedrooms - 1) * 0.18;
  const median = Math.round(typeBase * sqftFactor * bedroomFactor);
  return {
    min: Math.round(median * 0.88),
    max: Math.round(median * 1.15),
    median,
  };
}

export function getAmenityRecommendations(data: PropertyData): string[] {
  const recommendations: string[] = [];
  if (!data.amenities.wifi) recommendations.push('WiFi');
  if (!data.amenities.laundry) recommendations.push('Laundry');
  if (data.basicInfo.propertyType !== 'room' && !data.amenities.parking) {
    recommendations.push('Parking');
  }
  if (!data.amenities.airConditioning) recommendations.push('Air conditioning');
  return recommendations.slice(0, 3);
}

export function getDescriptionSuggestion(data: PropertyData): string {
  const beds = data.basicInfo.bedrooms ?? 0;
  const baths = data.basicInfo.bathrooms ?? 0;
  const sqft = data.basicInfo.squareFootage ?? 0;
  return `Beautiful ${beds}-bedroom, ${baths}-bath ${
    data.basicInfo.propertyType
  } offering approximately ${sqft.toLocaleString()} sq ft at ${
    data.basicInfo.address
  }. This home balances comfort and convenience with thoughtful design, practical layout, and excellent access to nearby transport and daily essentials.`;
}
