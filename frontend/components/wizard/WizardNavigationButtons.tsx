'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/store/wizard-store';
import {
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const WizardNavigationButtons: React.FC = () => {
  const router = useRouter();
  const {
    currentStep,
    setCurrentStep,
    draftId,
    validationErrors,
    saveStep,
    syncStatus,
  } = useWizardStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isStepValid = Object.keys(validationErrors).length === 0;

  const handleNext = async () => {
    if (currentStep < 8) {
      await saveStep(currentStep);
      // Advance to next step regardless if there are errors?
      // Requirement: "Disable Next if current step has validation errors"
      if (isStepValid) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    } else {
      // Publish
      handlePublish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePublish = async () => {
    if (!draftId) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `/api/property-listings/wizard/${draftId}/publish`,
      );
      toast.success('Property published successfully!');
      router.push(
        response.data.redirectUrl ||
          `/properties/${response.data.propertyListingId}`,
      );
    } catch (error: unknown) {
      const message =
        String(
          (
            (
              (error as unknown as Record<string, unknown>)
                ?.response as unknown as Record<string, unknown>
            )?.data as unknown as Record<string, unknown>
          )?.message,
        ) || 'Failed to publish property';
      toast.error(message);
      console.error('Publish error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    await saveStep(currentStep);
    router.push('/user');
  };

  // Status Indicator
  const renderStatus = () => {
    switch (syncStatus) {
      case 'saving':
        return (
          <span className="flex items-center text-xs text-neutral-500 animate-pulse">
            <Loader2 size={12} className="animate-spin mr-1" /> Saving...
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center text-xs text-green-500">
            <CheckCircle2 size={12} className="mr-1" /> Draft saved
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center text-xs text-red-500">
            <AlertCircle size={12} className="mr-1" /> Save failed — retry
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${
                currentStep === 1
                  ? 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
          >
            <ChevronLeft size={18} className="mr-1" /> Back
          </button>
          {renderStatus()}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveAndExit}
            className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-brand-blue transition-colors"
          >
            <Save size={18} className="mr-1" /> Save & Exit
          </button>

          <button
            onClick={handleNext}
            disabled={!isStepValid || isSubmitting}
            className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all transform active:scale-95 shadow-md
              ${
                !isStepValid || isSubmitting
                  ? 'bg-neutral-300 dark:bg-neutral-800 cursor-not-allowed'
                  : 'bg-brand-blue hover:bg-brand-blue-dark shadow-brand-blue/20'
              }`}
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : currentStep === 8 ? (
              'Publish Listing'
            ) : (
              <>
                Next <ChevronRight size={18} className="ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
