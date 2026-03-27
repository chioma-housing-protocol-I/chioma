'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileCheck,
  Target,
  UserCircle2,
} from 'lucide-react';
import {
  loadAgentOnboardingData,
  saveAgentOnboardingData,
  type AgentOnboardingData,
  type CommissionModel,
} from '@/lib/agent-onboarding';

const totalSteps = 5;

export default function AgentOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AgentOnboardingData>(() =>
    loadAgentOnboardingData(),
  );

  const progressPercent = Math.round(((step + 1) / totalSteps) * 100);

  const stepTitles = [
    'Profile Setup',
    'Agency Details',
    'Verification',
    'Commission Preferences',
    'Lead Management Tools',
  ];

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return (
        data.profile.fullName.trim() !== '' &&
        data.profile.phone.trim() !== '' &&
        data.profile.markets.trim() !== ''
      );
    }
    if (step === 1) {
      return (
        data.agency.agencyName.trim() !== '' &&
        data.agency.licenseNumber.trim() !== ''
      );
    }
    if (step === 2) {
      return (
        data.verification.idUploaded &&
        data.verification.licenseUploaded &&
        data.verification.complianceAccepted
      );
    }
    if (step === 3) {
      return (
        data.commission.baseRate.trim() !== '' &&
        data.commission.splitPreference.trim() !== ''
      );
    }
    if (step === 4) {
      return (
        data.leadTools.crmChecklist &&
        data.leadTools.autoReplyChecklist &&
        data.leadTools.pipelineChecklist
      );
    }
    return true;
  }, [data, step]);

  const updateAndPersist = (next: AgentOnboardingData) => {
    setData(next);
    saveAgentOnboardingData(next);
  };

  const nextStep = () => {
    if (!canGoNext) return;
    if (step < totalSteps - 1) {
      setStep((prev) => prev + 1);
      return;
    }
    const completedData: AgentOnboardingData = {
      ...data,
      completed: true,
      completedAt: new Date().toISOString(),
    };
    updateAndPersist(completedData);
    router.push('/agents');
  };

  const prevStep = () => {
    if (step === 0) return;
    setStep((prev) => prev - 1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Agent Onboarding Wizard
        </h1>
        <p className="mt-1 text-blue-200/70">
          Complete your setup to unlock the full agent workflow.
        </p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-blue-200/70">
            <span>
              Step {step + 1} of {totalSteps}
            </span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-blue-100">{stepTitles[step]}</p>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        {step === 0 && (
          <ProfileStep
            data={data}
            onChange={(next) => updateAndPersist(next)}
          />
        )}
        {step === 1 && (
          <AgencyStep data={data} onChange={(next) => updateAndPersist(next)} />
        )}
        {step === 2 && (
          <VerificationStep
            data={data}
            onChange={(next) => updateAndPersist(next)}
          />
        )}
        {step === 3 && (
          <CommissionStep
            data={data}
            onChange={(next) => updateAndPersist(next)}
          />
        )}
        {step === 4 && (
          <LeadToolsStep
            data={data}
            onChange={(next) => updateAndPersist(next)}
          />
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prevStep}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <button
          onClick={nextStep}
          disabled={!canGoNext}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
        >
          {step === totalSteps - 1 ? 'Complete Setup' : 'Continue'}
          {step < totalSteps - 1 && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}

function ProfileStep({
  data,
  onChange,
}: {
  data: AgentOnboardingData;
  onChange: (next: AgentOnboardingData) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<UserCircle2 size={18} />}
        title="Set up your agent profile"
        description="Tell clients who you are and where you operate."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Full Name"
          value={data.profile.fullName}
          onChange={(value) =>
            onChange({
              ...data,
              profile: { ...data.profile, fullName: value },
            })
          }
        />
        <TextField
          label="Phone Number"
          value={data.profile.phone}
          onChange={(value) =>
            onChange({
              ...data,
              profile: { ...data.profile, phone: value },
            })
          }
        />
        <TextField
          label="Primary Markets"
          placeholder="e.g. Lekki, Yaba, Ikeja"
          value={data.profile.markets}
          onChange={(value) =>
            onChange({
              ...data,
              profile: { ...data.profile, markets: value },
            })
          }
        />
        <TextField
          label="Years of Experience"
          value={data.profile.yearsExperience}
          onChange={(value) =>
            onChange({
              ...data,
              profile: { ...data.profile, yearsExperience: value },
            })
          }
        />
      </div>
    </div>
  );
}

function AgencyStep({
  data,
  onChange,
}: {
  data: AgentOnboardingData;
  onChange: (next: AgentOnboardingData) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Building2 size={18} />}
        title="Agency verification details"
        description="Provide agency information for trust and compliance checks."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Agency Name"
          value={data.agency.agencyName}
          onChange={(value) =>
            onChange({
              ...data,
              agency: { ...data.agency, agencyName: value },
            })
          }
        />
        <TextField
          label="License Number"
          value={data.agency.licenseNumber}
          onChange={(value) =>
            onChange({
              ...data,
              agency: { ...data.agency, licenseNumber: value },
            })
          }
        />
      </div>
      <TextAreaField
        label="Agency Address"
        value={data.agency.agencyAddress}
        onChange={(value) =>
          onChange({
            ...data,
            agency: { ...data.agency, agencyAddress: value },
          })
        }
      />
    </div>
  );
}

function VerificationStep({
  data,
  onChange,
}: {
  data: AgentOnboardingData;
  onChange: (next: AgentOnboardingData) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<FileCheck size={18} />}
        title="Complete verification checklist"
        description="Confirm required verification artifacts for onboarding approval."
      />
      <ChecklistItem
        checked={data.verification.idUploaded}
        label="Government-issued ID uploaded"
        onToggle={() =>
          onChange({
            ...data,
            verification: {
              ...data.verification,
              idUploaded: !data.verification.idUploaded,
            },
          })
        }
      />
      <ChecklistItem
        checked={data.verification.licenseUploaded}
        label="Real estate license uploaded"
        onToggle={() =>
          onChange({
            ...data,
            verification: {
              ...data.verification,
              licenseUploaded: !data.verification.licenseUploaded,
            },
          })
        }
      />
      <ChecklistItem
        checked={data.verification.complianceAccepted}
        label="Compliance terms acknowledged"
        onToggle={() =>
          onChange({
            ...data,
            verification: {
              ...data.verification,
              complianceAccepted: !data.verification.complianceAccepted,
            },
          })
        }
      />
    </div>
  );
}

function CommissionStep({
  data,
  onChange,
}: {
  data: AgentOnboardingData;
  onChange: (next: AgentOnboardingData) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<DollarSign size={18} />}
        title="Configure commission structure"
        description="Choose how your commissions are calculated and split."
      />
      <div>
        <label className="text-sm text-blue-200/80">Commission Model</label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['percentage', 'fixed', 'tiered'] as CommissionModel[]).map(
            (model) => (
              <button
                key={model}
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    commission: { ...data.commission, model },
                  })
                }
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  data.commission.model === model
                    ? 'border-blue-400 bg-blue-500/20 text-white'
                    : 'border-white/15 bg-white/5 text-blue-200/80 hover:bg-white/10'
                }`}
              >
                {model[0].toUpperCase() + model.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Base Rate (%)"
          value={data.commission.baseRate}
          onChange={(value) =>
            onChange({
              ...data,
              commission: { ...data.commission, baseRate: value },
            })
          }
        />
        <TextField
          label="Split Preference"
          placeholder="e.g. 70/30"
          value={data.commission.splitPreference}
          onChange={(value) =>
            onChange({
              ...data,
              commission: { ...data.commission, splitPreference: value },
            })
          }
        />
      </div>
    </div>
  );
}

function LeadToolsStep({
  data,
  onChange,
}: {
  data: AgentOnboardingData;
  onChange: (next: AgentOnboardingData) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        icon={<Target size={18} />}
        title="Lead management quick tutorial"
        description="Review each core tool to activate your lead management stack."
      />
      <ChecklistItem
        checked={data.leadTools.crmChecklist}
        label="I know how to use the CRM board for lead stages."
        onToggle={() =>
          onChange({
            ...data,
            leadTools: {
              ...data.leadTools,
              crmChecklist: !data.leadTools.crmChecklist,
            },
          })
        }
      />
      <ChecklistItem
        checked={data.leadTools.autoReplyChecklist}
        label="I configured auto-replies for initial inquiries."
        onToggle={() =>
          onChange({
            ...data,
            leadTools: {
              ...data.leadTools,
              autoReplyChecklist: !data.leadTools.autoReplyChecklist,
            },
          })
        }
      />
      <ChecklistItem
        checked={data.leadTools.pipelineChecklist}
        label="I can track and prioritize hot leads in the pipeline."
        onToggle={() =>
          onChange({
            ...data,
            leadTools: {
              ...data.leadTools,
              pipelineChecklist: !data.leadTools.pipelineChecklist,
            },
          })
        }
      />
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100/90">
        Completing this step unlocks your onboarding status and prepares your
        dashboard with agent-focused defaults.
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-blue-200/80">
        {icon}
        {title}
      </div>
      <p className="text-sm text-blue-200/65">{description}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm text-blue-200/80">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 block">
      <span className="text-sm text-blue-200/80">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
      />
    </label>
  );
}

function ChecklistItem({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        checked
          ? 'border-emerald-300/40 bg-emerald-500/15'
          : 'border-white/15 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <CheckCircle2
          size={18}
          className={checked ? 'text-emerald-300' : 'text-blue-200/50'}
        />
        <span className="text-sm text-white">{label}</span>
      </div>
    </button>
  );
}
