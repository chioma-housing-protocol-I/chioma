'use client';

import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  isValid?: boolean;
  icon?: ReactNode;
}

export interface MultiStepFormWizardProps {
  steps: WizardStep[];
  onComplete: (data: Record<string, any>) => void | Promise<void>;
  onStepChange?: (stepIndex: number) => void;
  className?: string;
  allowSkip?: boolean;
  showStepNumbers?: boolean;
  formData?: Record<string, any>;
  onFormDataChange?: (data: Record<string, any>) => void;
}

export const MultiStepFormWizard: React.FC<MultiStepFormWizardProps> = ({
  steps,
  onComplete,
  onStepChange,
  className,
  allowSkip = false,
  showStepNumbers = true,
  formData = {},
  onFormDataChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const canProceed = currentStep.isValid !== false;

  const handleNext = async () => {
    if (!canProceed && !allowSkip) return;

    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }

    if (isLastStep) {
      setIsSubmitting(true);
      try {
        await onComplete(formData);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setDirection('forward');
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onStepChange?.(nextIndex);
    }
  };

  const handleBack = () => {
    if (isFirstStep) return;
    setDirection('backward');
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    onStepChange?.(prevIndex);
  };

  const handleStepClick = (index: number) => {
    if (index === currentStepIndex) return;
    if (!completedSteps.includes(index) && index > currentStepIndex) return;

    setDirection(index > currentStepIndex ? 'forward' : 'backward');
    setCurrentStepIndex(index);
    onStepChange?.(index);
  };

  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === 'forward' ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === 'forward' ? -1000 : 1000,
      opacity: 0,
    }),
  };

  return (
    <div className={cn('w-full max-w-5xl mx-auto', className)}>
      {/* Progress Header */}
      <div className="mb-8">
        {/* Desktop Progress Indicator */}
        <div className="hidden lg:flex items-center justify-between px-4">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = completedSteps.includes(index);
            const isClickable = isCompleted || isActive;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={cn(
                    'flex flex-col items-center group',
                    isClickable && 'cursor-pointer',
                  )}
                  onClick={() => isClickable && handleStepClick(index)}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                      isActive &&
                        'bg-blue-600 border-blue-600 text-white shadow-lg scale-110',
                      isCompleted &&
                        !isActive &&
                        'bg-green-500 border-green-500 text-white',
                      !isActive &&
                        !isCompleted &&
                        'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-400',
                      isClickable && 'hover:scale-105',
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="w-6 h-6" />
                    ) : step.icon ? (
                      step.icon
                    ) : showStepNumbers ? (
                      <span className="font-semibold">{index + 1}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 text-center">
                    <p
                      className={cn(
                        'text-sm font-semibold transition-colors',
                        isActive && 'text-blue-600 dark:text-blue-400',
                        isCompleted &&
                          !isActive &&
                          'text-green-600 dark:text-green-400',
                        !isActive &&
                          !isCompleted &&
                          'text-neutral-500 dark:text-neutral-400',
                      )}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="text-xs text-neutral-400 mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mb-6 mx-4 transition-all duration-500',
                      isCompleted
                        ? 'bg-green-500'
                        : 'bg-neutral-200 dark:bg-neutral-700',
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Progress Indicator */}
        <div className="lg:hidden bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                {currentStep.title}
              </p>
              {currentStep.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {currentStep.description}
                </p>
              )}
            </div>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-blue-600 h-full"
              initial={{ width: 0 }}
              animate={{
                width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="relative overflow-hidden bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 min-h-[400px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="p-6 md:p-8"
          >
            {currentStep.component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6 gap-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirstStep}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            isFirstStep
              ? 'opacity-0 pointer-events-none'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700',
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {allowSkip && !isLastStep && !canProceed && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={(!canProceed && !allowSkip) || isSubmitting}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
              canProceed || allowSkip
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed',
              isSubmitting && 'opacity-50 cursor-wait',
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : isLastStep ? (
              'Complete'
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
