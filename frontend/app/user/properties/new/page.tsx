'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  defaultPropertyData,
  getAmenityRecommendations,
  getCompletenessScore,
  getDescriptionSuggestion,
  getPricingSuggestion,
  validateStep,
  WIZARD_STEPS,
  type PhotoItem,
  type PropertyData,
  type WizardDraft,
} from '@/lib/property-wizard';
import { propertyWizardService } from '@/lib/services/property-wizard.service';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { useTranslation } from '@/lib/i18n';

const UTILITIES = ['Water', 'Electricity', 'Internet', 'Gas', 'Trash'];
const BASIC_INFO_NUMERIC_KEYS = [
  'bedrooms',
  'bathrooms',
  'squareFootage',
  'yearBuilt',
] as const;

async function inspectPhoto(file: File): Promise<{
  width: number;
  height: number;
  issues: string[];
}> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load image'));
      img.src = url;
    });

    const issues: string[] = [];
    if (image.width < 1000 || image.height < 700) {
      issues.push('Low resolution');
    }
    if (file.size > 8 * 1024 * 1024) {
      issues.push('Large file size');
    }

    return { width: image.width, height: image.height, issues };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function NewPropertyListingWizardPage() {
  const { formatCurrency: formatLocaleCurrency } = useTranslation();
  const formatCurrency = (value: number) =>
    formatLocaleCurrency(value, 'USD', { maximumFractionDigits: 0 });
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [data, setData] = useState<PropertyData>(defaultPropertyData);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = useState<string>('');

  const completenessScore = useMemo(() => getCompletenessScore(data), [data]);
  const pricingSuggestion = useMemo(() => getPricingSuggestion(data), [data]);
  const amenitySuggestions = useMemo(
    () => getAmenityRecommendations(data),
    [data],
  );
  const descriptionSuggestion = useMemo(
    () => getDescriptionSuggestion(data),
    [data],
  );
  const canPublish = useMemo(
    () =>
      WIZARD_STEPS.every((_, idx) => validateStep(idx, data).length === 0) &&
      completenessScore >= 90,
    [data, completenessScore],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await propertyWizardService.loadDraft();
      if (!mounted) return;
      if (draft) {
        setCurrentStep(draft.currentStep);
        setCompletedSteps(draft.completedSteps);
        setData(draft.propertyData);
        setDraftId(draft.draftId);
        setLastSavedAt(new Date(draft.updatedAt).toLocaleTimeString());
      }
      setHasLoadedDraft(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) return;
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const ensuredDraftId =
          draftId ||
          (await propertyWizardService.startDraft(data)) ||
          undefined;
        if (ensuredDraftId && ensuredDraftId !== draftId) {
          setDraftId(ensuredDraftId);
        }
        const payload: WizardDraft = {
          draftId: ensuredDraftId,
          currentStep,
          completedSteps,
          propertyData: data,
          updatedAt: new Date().toISOString(),
        };
        await propertyWizardService.saveDraft(payload);
        setLastSavedAt(new Date(payload.updatedAt).toLocaleTimeString());
      } finally {
        setIsSaving(false);
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [data, currentStep, completedSteps, hasLoadedDraft, draftId]);

  const validateCurrentStep = (): boolean => {
    const stepErrors = validateStep(currentStep, data);
    setErrors(stepErrors);
    return stepErrors.length === 0;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep],
    );
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const previousStep = () => {
    setErrors([]);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const nextPhotos: PhotoItem[] = [];

    for (const file of incoming) {
      const details = await inspectPhoto(file);
      nextPhotos.push({
        id: crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file),
        caption: '',
        order: data.photos.length + nextPhotos.length,
        size: file.size,
        width: details.width,
        height: details.height,
        qualityIssues: details.issues,
      });
    }

    setData((prev) => ({ ...prev, photos: [...prev.photos, ...nextPhotos] }));
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= data.photos.length) return;
    const updated = [...data.photos];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setData((prev) => ({
      ...prev,
      photos: updated.map((photo, idx) => ({ ...photo, order: idx })),
    }));
  };

  const removePhoto = (id: string) => {
    const photo = data.photos.find((p) => p.id === id);
    if (photo?.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url);
    }
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
  };

  const handlePublish = async () => {
    if (!canPublish) {
      setErrors(validateStep(currentStep, data));
      toast.error('Please complete all required fields before publishing.');
      return;
    }

    setIsPublishing(true);
    try {
      await propertyWizardService.publish(data);
      propertyWizardService.clearDraft();
      toast.success('Property listing published successfully.');
    } catch {
      toast.error('Could not publish listing. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const stepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="field md:col-span-2"
            placeholder="Listing title"
            value={data.basicInfo.title}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                basicInfo: { ...prev.basicInfo, title: e.target.value },
              }))
            }
          />
          <select
            className="field"
            value={data.basicInfo.propertyType}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                basicInfo: {
                  ...prev.basicInfo,
                  propertyType: e.target
                    .value as PropertyData['basicInfo']['propertyType'],
                },
              }))
            }
          >
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="room">Room</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
            <option value="other">Other</option>
          </select>
          <input
            className="field"
            placeholder="Address"
            value={data.basicInfo.address}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                basicInfo: { ...prev.basicInfo, address: e.target.value },
              }))
            }
          />
          {BASIC_INFO_NUMERIC_KEYS.map((key) => (
            <input
              key={key}
              className="field"
              type="number"
              placeholder={key.replace(/([A-Z])/g, ' $1')}
              value={data.basicInfo[key] ?? ''}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  basicInfo: {
                    ...prev.basicInfo,
                    [key]: e.target.value ? Number(e.target.value) : null,
                  },
                }))
              }
            />
          ))}
        </div>
      );
    }

    if (currentStep === 1) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="field"
              type="number"
              placeholder="Monthly rent"
              value={data.pricing.monthlyRent ?? ''}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  pricing: {
                    ...prev.pricing,
                    monthlyRent: e.target.value ? Number(e.target.value) : null,
                  },
                }))
              }
            />
            <input
              className="field"
              type="number"
              placeholder="Security deposit"
              value={data.pricing.securityDeposit ?? ''}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  pricing: {
                    ...prev.pricing,
                    securityDeposit: e.target.value
                      ? Number(e.target.value)
                      : null,
                  },
                }))
              }
            />
            <input
              className="field"
              type="number"
              placeholder="Lease term (months)"
              value={data.pricing.leaseTermMonths ?? ''}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  pricing: {
                    ...prev.pricing,
                    leaseTermMonths: e.target.value
                      ? Number(e.target.value)
                      : null,
                  },
                }))
              }
            />
            <input
              className="field"
              type="date"
              value={data.pricing.moveInDate}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  pricing: { ...prev.pricing, moveInDate: e.target.value },
                }))
              }
            />
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            <div className="font-semibold flex items-center gap-2">
              <Sparkles size={16} />
              Pricing suggestion
            </div>
            <p className="mt-1">
              Suggested range: {formatCurrency(pricingSuggestion.min)} -{' '}
              {formatCurrency(pricingSuggestion.max)} (median{' '}
              {formatCurrency(pricingSuggestion.median)}).
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-blue-100">Utilities included</label>
            <div className="flex flex-wrap gap-2">
              {UTILITIES.map((utility) => {
                const selected =
                  data.pricing.utilitiesIncluded.includes(utility);
                return (
                  <button
                    type="button"
                    key={utility}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      selected
                        ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                        : 'border-white/10 bg-white/5 text-blue-200/70'
                    }`}
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        pricing: {
                          ...prev.pricing,
                          utilitiesIncluded: selected
                            ? prev.pricing.utilitiesIncluded.filter(
                                (x) => x !== utility,
                              )
                            : [...prev.pricing.utilitiesIncluded, utility],
                        },
                      }))
                    }
                  >
                    {utility}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(data.amenities).map(([key, value]) => (
              <button
                key={key}
                type="button"
                className={`p-3 rounded-xl border text-left capitalize transition ${
                  value
                    ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                    : 'border-white/10 bg-white/5 text-blue-200/70'
                }`}
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    amenities: { ...prev.amenities, [key]: !value },
                  }))
                }
              >
                {key.replace(/([A-Z])/g, ' $1')}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100">
            Recommended to improve conversion:{' '}
            {amenitySuggestions.join(', ') || 'None'}.
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data.rules)
            .filter(([key]) => !['quietHours', 'guestPolicy'].includes(key))
            .map(([key, value]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-blue-100"
              >
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={() =>
                    setData((prev) => ({
                      ...prev,
                      rules: { ...prev.rules, [key]: !value },
                    }))
                  }
                />
                {key.replace(/([A-Z])/g, ' $1')}
              </label>
            ))}
          <input
            className="field md:col-span-2"
            placeholder="Quiet hours (e.g. 10pm - 7am)"
            value={data.rules.quietHours}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                rules: { ...prev.rules, quietHours: e.target.value },
              }))
            }
          />
          <textarea
            className="field md:col-span-2 min-h-24"
            placeholder="Guest policy"
            value={data.rules.guestPolicy}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                rules: { ...prev.rules, guestPolicy: e.target.value },
              }))
            }
          />
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className="space-y-4">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-sm text-blue-100 cursor-pointer">
            <ImagePlus size={16} />
            Upload Photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handlePhotoUpload(e.target.files)}
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.photos.map((photo, index) => (
              <div
                key={photo.id}
                className="rounded-xl border border-white/10 p-3 bg-white/5"
              >
                <NextImage
                  src={photo.url}
                  alt={photo.name}
                  width={640}
                  height={320}
                  unoptimized
                  className="w-full h-40 object-cover rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-blue-200/70">
                  <span>
                    {photo.width}x{photo.height}
                  </span>
                  <span>{Math.round(photo.size / 1024)}KB</span>
                </div>
                {photo.qualityIssues.length > 0 && (
                  <p className="text-xs text-amber-300 mt-1">
                    Issues: {photo.qualityIssues.join(', ')}
                  </p>
                )}
                <input
                  className="field mt-2"
                  placeholder="Caption"
                  value={photo.caption}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      photos: prev.photos.map((p) =>
                        p.id === photo.id
                          ? { ...p, caption: e.target.value }
                          : p,
                      ),
                    }))
                  }
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => movePhoto(index, -1)}
                    disabled={index === 0}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => movePhoto(index, 1)}
                    disabled={index === data.photos.length - 1}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn-danger ml-auto"
                    onClick={() => removePhoto(photo.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (currentStep === 5) {
      return (
        <div className="space-y-3">
          <textarea
            className="field min-h-28"
            placeholder="Property description"
            value={data.description.propertyDescription}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                description: {
                  ...prev.description,
                  propertyDescription: e.target.value,
                },
              }))
            }
          />
          <textarea
            className="field min-h-20"
            placeholder="Neighborhood description"
            value={data.description.neighborhoodDescription}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                description: {
                  ...prev.description,
                  neighborhoodDescription: e.target.value,
                },
              }))
            }
          />
          <textarea
            className="field min-h-20"
            placeholder="Transportation info"
            value={data.description.transportationInfo}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                description: {
                  ...prev.description,
                  transportationInfo: e.target.value,
                },
              }))
            }
          />
          <textarea
            className="field min-h-20"
            placeholder="Nearby amenities"
            value={data.description.nearbyAmenities}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                description: {
                  ...prev.description,
                  nearbyAmenities: e.target.value,
                },
              }))
            }
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setData((prev) => ({
                ...prev,
                description: {
                  ...prev.description,
                  propertyDescription:
                    prev.description.propertyDescription ||
                    descriptionSuggestion,
                },
              }))
            }
          >
            <Sparkles size={14} />
            Use suggestion
          </button>
        </div>
      );
    }

    if (currentStep === 6) {
      return (
        <div className="space-y-4">
          <input
            className="field"
            type="date"
            value={data.availability.availableFrom}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                availability: {
                  ...prev.availability,
                  availableFrom: e.target.value,
                },
              }))
            }
          />
          <input
            className="field"
            type="text"
            placeholder="Blocked dates (YYYY-MM-DD, comma separated)"
            value={data.availability.blockedDates.join(', ')}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                availability: {
                  ...prev.availability,
                  blockedDates: e.target.value
                    .split(',')
                    .map((d) => d.trim())
                    .filter(Boolean),
                },
              }))
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-4 text-sm text-blue-100">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-white">{data.basicInfo.title}</p>
          <p>{data.basicInfo.address}</p>
          <p className="mt-1">
            {data.basicInfo.bedrooms} bed / {data.basicInfo.bathrooms} bath •{' '}
            {data.basicInfo.squareFootage} sq ft
          </p>
          <p className="mt-1">
            Rent: {formatCurrency(data.pricing.monthlyRent ?? 0)}
          </p>
        </div>
        <p>
          Completeness score:{' '}
          <span className="font-semibold">{completenessScore}%</span>
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb
        backHref="/user/properties"
        backLabel="Back to properties"
        homeHref="/user"
        homeLabel="Dashboard"
        customLabels={{
          new: 'New Listing',
        }}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Create Property Listing
          </h1>
          <p className="text-blue-200/60 text-sm mt-1">
            Step {currentStep + 1} of {WIZARD_STEPS.length}:{' '}
            {WIZARD_STEPS[currentStep]}
          </p>
        </div>
        <Link href="/user/properties" className="btn-secondary">
          Back to properties
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {WIZARD_STEPS.map((step, idx) => {
            const done = completedSteps.includes(idx);
            const active = idx === currentStep;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs border transition ${
                  active
                    ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                    : done
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-blue-200/60'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {done && <CheckCircle2 size={12} />}
                  {idx + 1}. {step}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-100 font-medium">Step details</p>
          <p className="text-xs text-blue-200/50 flex items-center gap-1">
            <HelpCircle size={12} />
            Autosave {isSaving ? 'running...' : 'enabled'}
            {lastSavedAt ? ` · Last saved ${lastSavedAt}` : ''}
          </p>
        </div>
        {stepContent()}
        {errors.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            {errors.map((error) => (
              <p key={error} className="text-sm text-red-200">
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={previousStep}
          disabled={currentStep === 0}
          className="btn-secondary disabled:opacity-40"
        >
          <ArrowLeft size={16} />
          Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              propertyWizardService.clearDraft();
              toast.success('Draft cleared.');
              setData(defaultPropertyData);
              setCurrentStep(0);
              setCompletedSteps([]);
              setErrors([]);
            }}
          >
            Clear draft
          </button>
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button type="button" onClick={nextStep} className="btn-primary">
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePublish()}
              className="btn-primary"
              disabled={isPublishing || !canPublish}
            >
              {isPublishing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              Publish Property
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .field {
          width: 100%;
          padding: 0.65rem 0.8rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          color: #e2e8f0;
          font-size: 0.875rem;
          outline: none;
        }
        .field:focus {
          border-color: rgba(59, 130, 246, 0.6);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 0.75rem;
          padding: 0.6rem 0.95rem;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          background: linear-gradient(90deg, #2563eb, #4f46e5);
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 0.75rem;
          padding: 0.6rem 0.95rem;
          color: #cbd5e1;
          font-size: 0.875rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.6rem;
          padding: 0.45rem 0.55rem;
          color: #fecaca;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}
