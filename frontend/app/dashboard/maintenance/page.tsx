import MaintenanceFlow from '@/components/maintenance/MaintenanceFlow';
import MaintenanceRequestForm from '@/components/maintenance/MaintenanceRequestForm';

export default function TenantMaintenancePage() {
  return <MaintenanceFlow defaultRole="tenant" />;
}
