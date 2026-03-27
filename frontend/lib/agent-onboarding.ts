'use client';

export type CommissionModel = 'percentage' | 'fixed' | 'tiered';

export interface AgentOnboardingData {
  profile: {
    fullName: string;
    phone: string;
    markets: string;
    yearsExperience: string;
  };
  agency: {
    agencyName: string;
    licenseNumber: string;
    agencyAddress: string;
  };
  verification: {
    idUploaded: boolean;
    licenseUploaded: boolean;
    complianceAccepted: boolean;
  };
  commission: {
    model: CommissionModel;
    baseRate: string;
    splitPreference: string;
  };
  leadTools: {
    crmChecklist: boolean;
    autoReplyChecklist: boolean;
    pipelineChecklist: boolean;
  };
  completed: boolean;
  completedAt: string | null;
}

export const AGENT_ONBOARDING_STORAGE_KEY = 'chioma_agent_onboarding_v1';

export const defaultAgentOnboardingData: AgentOnboardingData = {
  profile: {
    fullName: '',
    phone: '',
    markets: '',
    yearsExperience: '',
  },
  agency: {
    agencyName: '',
    licenseNumber: '',
    agencyAddress: '',
  },
  verification: {
    idUploaded: false,
    licenseUploaded: false,
    complianceAccepted: false,
  },
  commission: {
    model: 'percentage',
    baseRate: '7',
    splitPreference: '70/30',
  },
  leadTools: {
    crmChecklist: false,
    autoReplyChecklist: false,
    pipelineChecklist: false,
  },
  completed: false,
  completedAt: null,
};

export function loadAgentOnboardingData(): AgentOnboardingData {
  if (typeof window === 'undefined') return defaultAgentOnboardingData;
  try {
    const raw = localStorage.getItem(AGENT_ONBOARDING_STORAGE_KEY);
    if (!raw) return defaultAgentOnboardingData;
    const parsed = JSON.parse(raw) as Partial<AgentOnboardingData>;
    return {
      ...defaultAgentOnboardingData,
      ...parsed,
      profile: {
        ...defaultAgentOnboardingData.profile,
        ...(parsed.profile ?? {}),
      },
      agency: {
        ...defaultAgentOnboardingData.agency,
        ...(parsed.agency ?? {}),
      },
      verification: {
        ...defaultAgentOnboardingData.verification,
        ...(parsed.verification ?? {}),
      },
      commission: {
        ...defaultAgentOnboardingData.commission,
        ...(parsed.commission ?? {}),
      },
      leadTools: {
        ...defaultAgentOnboardingData.leadTools,
        ...(parsed.leadTools ?? {}),
      },
    };
  } catch {
    return defaultAgentOnboardingData;
  }
}

export function saveAgentOnboardingData(data: AgentOnboardingData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AGENT_ONBOARDING_STORAGE_KEY, JSON.stringify(data));
}
