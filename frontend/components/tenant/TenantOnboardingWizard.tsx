'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Search,
  Home,
  Zap,
  Check,
  SkipForward,
  Phone,
  MapPin,
  Bell,
  CreditCard,
  Shield,
  Link,
} from 'lucide-react';
import {
  type TenantOnboardingData,
  type PropertyType,
  type BudgetRange,
  type MoveInTimeline,
  loadTenantOnboardingData,
  saveTenantOnboardingData,
} from '@/lib/tenant-onboarding';

const TOTAL_STEPS = 4;

const STEP_META = [
  {
    title: 'Your Profile',
    icon: User,
    description: 'Help landlords know who you are',
  },
  {
    title: 'Rental Preferences',
    icon: Home,
    description: "Tell us what you're looking for",
  },
  {
    title: 'Property Search',
    icon: Search,
    description: 'Set up your search alerts',
  },
  {
    title: 'Feature Discovery',
    icon: Zap,
    description: 'Learn what Chioma offers',
  },
];

// ─── Step Components ──────────────────────────────────────────────────────────

function ProfileStep({
  data,
  onChange,
}: {
  data: TenantOnboardingData;
  onChange: (d: TenantOnboardingData) => void;
}) {
  const update = (
    field: keyof TenantOnboardingData['profile'],
    value: string,
  ) => onChange({ ...data, profile: { ...data.profile, [field]: value } });

  return (
    <div className="space-y-5">
      <SectionTitle icon={Phone} label="Contact & Location" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Phone Number"
          placeholder="+1 (555) 000-0000"
          value={data.profile.phone}
          onChange={(v) => update('phone', v)}
          type="tel"
        />
        <TextField
          label="Current City / Location"
          placeholder="e.g. Lagos, Nigeria"
          value={data.profile.location}
          onChange={(v) => update('location', v)}
          icon={MapPin}
        />
      </div>
      <TextAreaField
        label="Short Bio (optional)"
        placeholder="Tell landlords a bit about yourself — your lifestyle, occupation, etc."
        value={data.profile.bio}
        onChange={(v) => update('bio', v)}
        maxLength={300}
      />
    </div>
  );
}

function PreferencesStep({
  data,
  onChange,
}: {
  data: TenantOnboardingData;
  onChange: (d: TenantOnboardingData) => void;
}) {
  const update = <K extends keyof TenantOnboardingData['preferences']>(
    field: K,
    value: TenantOnboardingData['preferences'][K],
  ) =>
    onChange({ ...data, preferences: { ...data.preferences, [field]: value } });

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'any', label: 'Any' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'house', label: 'House' },
    { value: 'studio', label: 'Studio' },
    { value: 'condo', label: 'Condo' },
  ];

  const budgetRanges: { value: BudgetRange; label: string }[] = [
    { value: 'under-500', label: 'Under $500' },
    { value: '500-1000', label: '$500 – $1,000' },
    { value: '1000-2000', label: '$1,000 – $2,000' },
    { value: '2000-3500', label: '$2,000 – $3,500' },
    { value: 'over-3500', label: 'Over $3,500' },
  ];

  const timelines: { value: MoveInTimeline; label: string }[] = [
    { value: 'asap', label: 'ASAP' },
    { value: '1-month', label: 'Within 1 month' },
    { value: '3-months', label: '1–3 months' },
    { value: '6-months', label: '3–6 months' },
    { value: 'flexible', label: 'Flexible' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={Home} label="Property Type" />
        <div className="flex flex-wrap gap-2 mt-3">
          {propertyTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => update('propertyType', value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                data.preferences.propertyType === value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white/5 border-white/15 text-blue-100 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle icon={CreditCard} label="Monthly Budget" />
        <div className="flex flex-wrap gap-2 mt-3">
          {budgetRanges.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => update('budgetRange', value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                data.preferences.budgetRange === value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white/5 border-white/15 text-blue-100 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-blue-200/70 uppercase tracking-wider mb-2">
            Bedrooms
          </label>
          <select
            value={data.preferences.bedrooms}
            onChange={(e) => update('bedrooms', e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {['Studio', '1', '2', '3', '4', '5+'].map((v) => (
              <option key={v} value={v} className="bg-slate-800">
                {v === 'Studio'
                  ? 'Studio'
                  : `${v} Bedroom${v === '1' ? '' : 's'}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-blue-200/70 uppercase tracking-wider mb-2">
            Move-in Timeline
          </label>
          <select
            value={data.preferences.moveInTimeline}
            onChange={(e) =>
              update('moveInTimeline', e.target.value as MoveInTimeline)
            }
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {timelines.map(({ value, label }) => (
              <option key={value} value={value} className="bg-slate-800">
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <ToggleChip
          label="Pet Friendly"
          checked={data.preferences.petFriendly}
          onChange={(v) => update('petFriendly', v)}
        />
        <ToggleChip
          label="Parking Required"
          checked={data.preferences.parkingRequired}
          onChange={(v) => update('parkingRequired', v)}
        />
      </div>
    </div>
  );
}

function SearchStep({
  data,
  onChange,
}: {
  data: TenantOnboardingData;
  onChange: (d: TenantOnboardingData) => void;
}) {
  const update = <K extends keyof TenantOnboardingData['search']>(
    field: K,
    value: TenantOnboardingData['search'][K],
  ) => onChange({ ...data, search: { ...data.search, [field]: value } });

  return (
    <div className="space-y-5">
      <SectionTitle icon={Search} label="Search Setup" />
      <TextField
        label="Target City or Neighborhood"
        placeholder="e.g. Victoria Island, Lagos"
        value={data.search.savedSearchCity}
        onChange={(v) => update('savedSearchCity', v)}
        icon={MapPin}
      />

      <div>
        <label className="block text-xs font-semibold text-blue-200/70 uppercase tracking-wider mb-2">
          Search Radius (km)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={50}
            value={data.search.searchRadius}
            onChange={(e) => update('searchRadius', e.target.value)}
            className="flex-1 accent-blue-500"
          />
          <span className="text-sm font-semibold text-white w-16 text-right">
            {data.search.searchRadius} km
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-4">
        <Bell size={20} className="text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Property Alerts</p>
          <p className="text-xs text-blue-200/60 mt-0.5">
            Get notified when new properties matching your criteria are listed.
          </p>
        </div>
        <button
          onClick={() =>
            update('notificationsEnabled', !data.search.notificationsEnabled)
          }
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            data.search.notificationsEnabled ? 'bg-blue-600' : 'bg-white/20'
          }`}
          role="switch"
          aria-checked={data.search.notificationsEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
              data.search.notificationsEnabled
                ? 'translate-x-5'
                : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function DiscoveryStep({
  data,
  onChange,
}: {
  data: TenantOnboardingData;
  onChange: (d: TenantOnboardingData) => void;
}) {
  const update = <K extends keyof TenantOnboardingData['discovery']>(
    field: K,
    value: boolean,
  ) => onChange({ ...data, discovery: { ...data.discovery, [field]: value } });

  const features = [
    {
      key: 'paymentsAcknowledged' as const,
      icon: CreditCard,
      title: 'Instant Rent Payments',
      description:
        'Pay rent directly on-chain via Stellar. Instant, transparent, and fee-minimal.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      key: 'disputesAcknowledged' as const,
      icon: Shield,
      title: 'Dispute Resolution',
      description:
        'Raise and track disputes with evidence uploads and structured resolution flows.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      key: 'blockchainAcknowledged' as const,
      icon: Link,
      title: 'Blockchain Lease Agreements',
      description:
        'Your lease is recorded on the Stellar blockchain — immutable and verifiable.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-blue-200/70">
        Tap each feature to acknowledge you&apos;ve seen it. You can explore
        them anytime from your dashboard.
      </p>
      {features.map(({ key, icon: Icon, title, description, color, bg }) => (
        <button
          key={key}
          onClick={() => update(key, !data.discovery[key])}
          className={`w-full text-left rounded-2xl border p-4 flex items-start gap-4 transition-all ${
            data.discovery[key]
              ? 'border-blue-500/50 bg-blue-500/10'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}
          >
            <Icon size={20} className={color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-blue-200/60 mt-0.5">{description}</p>
          </div>
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              data.discovery[key]
                ? 'bg-blue-600 border-blue-600'
                : 'border-white/30'
            }`}
          >
            {data.discovery[key] && <Check size={12} className="text-white" />}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon size={16} className="text-blue-400" />
      <span className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  icon: Icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-blue-200/70 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/50"
          />
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/15 rounded-xl py-2.5 text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${Icon ? 'pl-9 pr-4' : 'px-4'}`}
        />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
          {label}
        </label>
        {maxLength && (
          <span className="text-xs text-blue-200/40">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={3}
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
      />
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
        checked
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white/5 border-white/15 text-blue-100 hover:bg-white/10'
      }`}
    >
      {checked && <Check size={14} />}
      {label}
    </button>
  );
}

// ─── Step Dots ────────────────────────────────────────────────────────────────

function StepDots({
  current,
  total,
  skipped,
}: {
  current: number;
  total: number;
  skipped: number[];
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i === current
              ? 'w-6 h-2 bg-blue-500'
              : skipped.includes(i)
                ? 'w-2 h-2 bg-white/20'
                : i < current
                  ? 'w-2 h-2 bg-blue-400'
                  : 'w-2 h-2 bg-white/20'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function TenantOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<TenantOnboardingData>(() =>
    loadTenantOnboardingData(),
  );

  const progressPercent = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const currentMeta = STEP_META[step];
  const StepIcon = currentMeta.icon;

  const canGoNext = useMemo(() => {
    if (step === 0) return true; // profile is optional, can skip
    if (step === 1) return true; // preferences always valid
    if (step === 2) return data.search.savedSearchCity.trim() !== '';
    if (step === 3) {
      return (
        data.discovery.paymentsAcknowledged &&
        data.discovery.disputesAcknowledged &&
        data.discovery.blockchainAcknowledged
      );
    }
    return true;
  }, [data, step]);

  const updateAndPersist = (next: TenantOnboardingData) => {
    setData(next);
    saveTenantOnboardingData(next);
  };

  const skipStep = () => {
    const skipped = data.skippedSteps.includes(step)
      ? data.skippedSteps
      : [...data.skippedSteps, step];
    const next = { ...data, skippedSteps: skipped };
    updateAndPersist(next);
    if (step < TOTAL_STEPS - 1) {
      setStep((prev) => prev + 1);
    } else {
      complete(next);
    }
  };

  const complete = (finalData: TenantOnboardingData) => {
    const completed: TenantOnboardingData = {
      ...finalData,
      completed: true,
      completedAt: new Date().toISOString(),
    };
    updateAndPersist(completed);
    router.push('/tenant');
  };

  const nextStep = () => {
    if (!canGoNext) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((prev) => prev + 1);
    } else {
      complete(data);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((prev) => prev - 1);
  };

  const isSkippable = step === 0 || step === 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <StepIcon size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {currentMeta.title}
            </h1>
            <p className="text-sm text-blue-200/60">
              {currentMeta.description}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-200/60">
            <span>
              Step {step + 1} of {TOTAL_STEPS}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <StepDots
            current={step}
            total={TOTAL_STEPS}
            skipped={data.skippedSteps}
          />
        </div>
      </header>

      {/* Step Content */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        {step === 0 && <ProfileStep data={data} onChange={updateAndPersist} />}
        {step === 1 && (
          <PreferencesStep data={data} onChange={updateAndPersist} />
        )}
        {step === 2 && <SearchStep data={data} onChange={updateAndPersist} />}
        {step === 3 && (
          <DiscoveryStep data={data} onChange={updateAndPersist} />
        )}
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2">
          {isSkippable && (
            <button
              onClick={skipStep}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-4 py-2.5 text-sm font-medium text-blue-200/60 hover:text-blue-200 hover:bg-white/5 transition-colors"
            >
              <SkipForward size={14} />
              Skip
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!canGoNext}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
          >
            {step === TOTAL_STEPS - 1 ? (
              <>
                <Check size={16} />
                Finish Setup
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resume hint */}
      <p className="text-center text-xs text-blue-200/40">
        Your progress is saved automatically. You can resume anytime.
      </p>
    </div>
  );
}
