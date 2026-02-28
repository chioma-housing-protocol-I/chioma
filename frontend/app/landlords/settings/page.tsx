import { SettingsPageClient } from '@/components/settings/SettingsPageClient';

export default function LandlordSettingsPage() {
  return <SettingsPageClient embedded requireAuthGuard={false} />;
}
