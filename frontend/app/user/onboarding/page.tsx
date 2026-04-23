import { TenantOnboardingWizard } from '@/components/user/TenantOnboardingWizard';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

export const metadata = {
  title: 'Get Started | Tenant Portal',
};

export default function TenantOnboardingPage() {
  return (
    <div className="py-4">
      <OnboardingProvider>
        <TenantOnboardingWizard />
      </OnboardingProvider>
    </div>
  );
}
