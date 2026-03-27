import { TenantOnboardingWizard } from '@/components/tenant/TenantOnboardingWizard';

export const metadata = {
  title: 'Get Started | Tenant Portal',
};

export default function TenantOnboardingPage() {
  return (
    <div className="py-4">
      <TenantOnboardingWizard />
    </div>
  );
}
