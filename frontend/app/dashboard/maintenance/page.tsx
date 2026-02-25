import MaintenanceFlow from '@/components/maintenance/MaintenanceFlow';
import MaintenanceRequestForm from '@/components/maintenance/MaintenanceRequestForm';

export default function TenantMaintenancePage() {
    return (
        <div className='w-full flex flex-col gap-16 items-center justify-center ' >
            <MaintenanceRequestForm  />

            <MaintenanceFlow defaultRole="tenant" />
        </div>
    );
}
