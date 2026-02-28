'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, CheckCircle2, ChevronRight } from 'lucide-react';
import {
  propertyBasicDetailsSchema,
  propertyAmenitiesSchema,
  propertyMediaSchema,
  type PropertyBasicDetails,
  type PropertyAmenities,
  type PropertyMedia,
} from '@/lib/validation/property';

const STEPS = [
  { id: 1, title: 'Basic Details', schema: propertyBasicDetailsSchema },
  { id: 2, title: 'Amenities & Rules', schema: propertyAmenitiesSchema },
  { id: 3, title: 'Media & Uploads', schema: propertyMediaSchema },
];

export default function AddPropertyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for each step
  const basicDetailsForm = useForm<PropertyBasicDetails>({
    resolver: zodResolver(propertyBasicDetailsSchema),
    defaultValues: {
      title: '',
      rent: undefined,
      address: '',
    },
  });

  const amenitiesForm = useForm<PropertyAmenities>({
    resolver: zodResolver(propertyAmenitiesSchema),
    defaultValues: {
      amenities: [],
    },
  });

  const mediaForm = useForm<PropertyMedia>({
    resolver: zodResolver(propertyMediaSchema),
    defaultValues: {
      images: [],
    },
  });

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1:
        return basicDetailsForm;
      case 2:
        return amenitiesForm;
      case 3:
        return mediaForm;
      default:
        return basicDetailsForm;
    }
  };

  const handleNext = async () => {
    const currentForm = getCurrentForm();
    const isValid = await currentForm.trigger();

    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    // Validate all forms before submission
    const basicValid = await basicDetailsForm.trigger();
    const amenitiesValid = await amenitiesForm.trigger();
    const mediaValid = await mediaForm.trigger();

    if (!basicValid || !amenitiesValid || !mediaValid) {
      return;
    }

    setIsSubmitting(true);

    // Collect all form data
    const basicData = basicDetailsForm.getValues();
    const amenitiesData = amenitiesForm.getValues();
    const mediaData = mediaForm.getValues();

    const formData = {
      ...basicData,
      ...amenitiesData,
      ...mediaData,
    };

    // Simulate API call and IPFS upload
    console.log('Submitting property data:', formData);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    router.push('/landlords/properties');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/landlords/properties"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Add New Property
          </h1>
          <p className="text-neutral-500 mt-1">
            List a new property to manage and automate smart contracts.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden">
        {/* Stepper Header */}
        <div className="bg-neutral-50/50 border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-neutral-200 z-0"></div>
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div
                  key={step.id}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                      isActive
                        ? 'bg-brand-blue text-white ring-4 ring-brand-blue/20'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-neutral-400 border-2 border-neutral-200'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : step.id}
                  </div>
                  <span
                    className={`mt-3 text-sm font-semibold ${
                      isActive ? 'text-brand-blue' : 'text-neutral-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="min-h-[300px]">
            {currentStep === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-neutral-900">
                      Property Title
                    </label>
                    <input
                      {...basicDetailsForm.register('title')}
                      type="text"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                      placeholder="e.g. Sunset View Apartments"
                    />
                    {basicDetailsForm.formState.errors.title && (
                      <p className="text-sm text-red-600">
                        {basicDetailsForm.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-neutral-900">
                      Monthly Rent (USDC)
                    </label>
                    <input
                      {...basicDetailsForm.register('rent', {
                        valueAsNumber: true,
                      })}
                      type="number"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                      placeholder="e.g. 2400"
                    />
                    {basicDetailsForm.formState.errors.rent && (
                      <p className="text-sm text-red-600">
                        {basicDetailsForm.formState.errors.rent.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-900">
                    Full Address
                  </label>
                  <textarea
                    {...basicDetailsForm.register('address')}
                    rows={3}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all resize-none"
                    placeholder="Enter the complete address..."
                  />
                  {basicDetailsForm.formState.errors.address && (
                    <p className="text-sm text-red-600">
                      {basicDetailsForm.formState.errors.address.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Included Amenities
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      'WiFi',
                      'Parking',
                      'Pool',
                      'Gym',
                      'Laundry',
                      'Furnished',
                    ].map((amenity) => (
                      <label
                        key={amenity}
                        className="flex items-center space-x-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors"
                      >
                        <input
                          {...amenitiesForm.register('amenities')}
                          type="checkbox"
                          value={amenity}
                          className="w-5 h-5 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="text-neutral-700 font-medium">
                          {amenity}
                        </span>
                      </label>
                    ))}
                  </div>
                  {amenitiesForm.formState.errors.amenities && (
                    <p className="text-sm text-red-600">
                      {amenitiesForm.formState.errors.amenities.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-900">
                    Property Images
                  </label>
                  <p className="text-xs text-neutral-500 mb-4">
                    Images will be uploaded to IPFS (Pinata) for immutable
                    storage.
                  </p>

                  <input
                    {...mediaForm.register('images')}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="border-2 border-dashed border-neutral-300 rounded-2xl p-12 text-center hover:bg-neutral-50 hover:border-brand-blue/50 transition-colors cursor-pointer group block"
                  >
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-brand-blue" size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-neutral-900 mb-1">
                      Click to upload or drag & drop
                    </h4>
                    <p className="text-neutral-500">
                      SVG, PNG, JPG or GIF (max. 5MB each, up to 10 images)
                    </p>
                  </label>
                  {mediaForm.formState.errors.images && (
                    <p className="text-sm text-red-600">
                      {mediaForm.formState.errors.images.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                currentStep === 1
                  ? 'text-neutral-300 cursor-not-allowed'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Back
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center space-x-2 px-6 py-3 bg-white border border-blue-500 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                <span>Continue</span>
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center justify-center space-x-2 px-8 py-3 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue-dark transition-all shadow-xl shadow-brand-blue/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Publish Data to IPFS</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
