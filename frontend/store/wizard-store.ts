'use client';

import { create } from 'zustand';
import { withMiddleware } from './middleware';
import axios from 'axios';

export interface PhotoData {
  url: string;
  caption?: string;
  order: number;
}

export interface PropertyData {
  propertyType?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  monthlyRent?: number;
  securityDeposit?: number;
  leaseTerm?: string;
  moveInDate?: string;
  utilitiesIncluded?: string[];
  amenities?: string[];
  houseRules?: Record<string, boolean>;
  photos?: PhotoData[];
  propertyDescription?: string;
  neighborhoodDescription?: string;
  transportationInfo?: string;
  nearbyAmenities?: string;
  availableFrom?: string;
  blockedDates?: string[];
}

interface WizardState {
  draftId: string | null;
  currentStep: number;
  completedSteps: number[];
  data: PropertyData;
  syncStatus: 'idle' | 'saving' | 'saved' | 'failed';
  validationErrors: Record<string, string>;
  isInitialized: boolean;
}

interface WizardActions {
  initDraft: (draftId?: string) => Promise<void>;
  updateData: (newData: Partial<PropertyData>) => void;
  setCurrentStep: (step: number) => void;
  setSyncStatus: (status: WizardState['syncStatus']) => void;
  saveStep: (step: number) => Promise<void>;
}

export type WizardStore = WizardState & WizardActions;

export const useWizardStore = create<WizardStore>()(
  withMiddleware(
    (set, get) => ({
      draftId: null,
      currentStep: 1,
      completedSteps: [],
      data: {},
      syncStatus: 'idle',
      validationErrors: {},
      isInitialized: false,

      initDraft: async (draftId) => {
        try {
          // Get auth token from store
          const { useAuthStore } = await import('@/store/authStore');
          const { accessToken } = useAuthStore.getState();

          const headers = accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {};

          if (draftId) {
            const response = await axios.get(
              `/api/property-listings/wizard/${draftId}/draft`,
              { headers },
            );
            const draft = response.data;
            set({
              draftId: draft.id,
              currentStep: draft.currentStep,
              completedSteps: draft.completedSteps || [],
              data: draft.data,
              isInitialized: true,
            });

            // Check localStorage backup
            if (typeof window !== 'undefined') {
              const backup = localStorage.getItem(`nepa-wizard-${draftId}`);
              if (backup) {
                const backupData = JSON.parse(backup);
                set((state) => {
                  state.data = { ...state.data, ...backupData };
                });
              }
            }
          } else {
            const response = await axios.post(
              '/api/property-listings/wizard/start',
              {},
              { headers },
            );
            const draft = response.data;
            set({
              draftId: draft.id,
              currentStep: 1,
              completedSteps: [],
              data: {},
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error('Failed to init wizard:', error);
        }
      },

      updateData: (newData) => {
        set((state) => {
          state.data = { ...state.data, ...newData };
          state.syncStatus = 'idle';
        });

        // Save to localStorage immediately as backup
        const { draftId, data } = get();
        if (draftId && typeof window !== 'undefined') {
          localStorage.setItem(`nepa-wizard-${draftId}`, JSON.stringify(data));
        }
      },

      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      setSyncStatus: (status) => {
        set({ syncStatus: status });
      },

      saveStep: async (step) => {
        const { draftId, data } = get();
        if (!draftId) return;

        set({ syncStatus: 'saving' });
        try {
          // Get auth token from store
          const { useAuthStore } = await import('@/store/authStore');
          const { accessToken } = useAuthStore.getState();

          const headers = accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {};

          const response = await axios.patch(
            `/api/property-listings/wizard/${draftId}/step`,
            {
              step,
              data,
            },
            { headers },
          );

          set({
            syncStatus: 'saved',
            validationErrors: response.data.validationErrors || {},
            completedSteps: response.data.completedSteps || [],
          });
        } catch (error) {
          set({ syncStatus: 'failed' });
          console.error('Failed to save step:', error);
        }
      },
    }),
    'wizard',
  ),
);
