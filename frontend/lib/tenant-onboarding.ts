'use client';

export type PropertyType = 'apartment' | 'house' | 'studio' | 'condo' | 'any';
export type BudgetRange =
  | 'under-500'
  | '500-1000'
  | '1000-2000'
  | '2000-3500'
  | 'over-3500';
export type MoveInTimeline =
  | 'asap'
  | '1-month'
  | '3-months'
  | '6-months'
  | 'flexible';

export interface TenantOnboardingData {
  profile: {
    phone: string;
    bio: string;
    location: string;
  };
  preferences: {
    propertyType: PropertyType;
    budgetRange: BudgetRange;
    bedrooms: string;
    moveInTimeline: MoveInTimeline;
    petFriendly: boolean;
    parkingRequired: boolean;
  };
  search: {
    savedSearchCity: string;
    notificationsEnabled: boolean;
    searchRadius: string;
  };
  discovery: {
    paymentsAcknowledged: boolean;
    disputesAcknowledged: boolean;
    blockchainAcknowledged: boolean;
  };
  completed: boolean;
  completedAt: string | null;
  skippedSteps: number[];
}

export const TENANT_ONBOARDING_STORAGE_KEY = 'chioma_tenant_onboarding_v1';

export const defaultTenantOnboardingData: TenantOnboardingData = {
  profile: {
    phone: '',
    bio: '',
    location: '',
  },
  preferences: {
    propertyType: 'any',
    budgetRange: '1000-2000',
    bedrooms: '1',
    moveInTimeline: 'flexible',
    petFriendly: false,
    parkingRequired: false,
  },
  search: {
    savedSearchCity: '',
    notificationsEnabled: true,
    searchRadius: '10',
  },
  discovery: {
    paymentsAcknowledged: false,
    disputesAcknowledged: false,
    blockchainAcknowledged: false,
  },
  completed: false,
  completedAt: null,
  skippedSteps: [],
};

export function loadTenantOnboardingData(): TenantOnboardingData {
  if (typeof window === 'undefined') return defaultTenantOnboardingData;
  try {
    const raw = localStorage.getItem(TENANT_ONBOARDING_STORAGE_KEY);
    if (!raw) return defaultTenantOnboardingData;
    const parsed = JSON.parse(raw) as Partial<TenantOnboardingData>;
    return {
      ...defaultTenantOnboardingData,
      ...parsed,
      profile: {
        ...defaultTenantOnboardingData.profile,
        ...(parsed.profile ?? {}),
      },
      preferences: {
        ...defaultTenantOnboardingData.preferences,
        ...(parsed.preferences ?? {}),
      },
      search: {
        ...defaultTenantOnboardingData.search,
        ...(parsed.search ?? {}),
      },
      discovery: {
        ...defaultTenantOnboardingData.discovery,
        ...(parsed.discovery ?? {}),
      },
      skippedSteps: parsed.skippedSteps ?? [],
    };
  } catch {
    return defaultTenantOnboardingData;
  }
}

export function saveTenantOnboardingData(data: TenantOnboardingData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TENANT_ONBOARDING_STORAGE_KEY, JSON.stringify(data));
}

export function getTenantOnboardingProgress(
  data: TenantOnboardingData,
): number {
  const steps = [
    data.profile.phone.trim() !== '' || data.profile.location.trim() !== '',
    data.preferences.propertyType !== 'any' ||
      data.preferences.budgetRange !== '1000-2000',
    data.search.savedSearchCity.trim() !== '',
    data.discovery.paymentsAcknowledged &&
      data.discovery.disputesAcknowledged &&
      data.discovery.blockchainAcknowledged,
  ];
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
}
