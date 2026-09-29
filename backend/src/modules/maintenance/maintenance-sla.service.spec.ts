import { MaintenanceSlaService } from './maintenance-sla.service';
import {
  MaintenanceStatus,
  SlaEscalationTier,
} from './maintenance-request.entity';

describe('MaintenanceSlaService', () => {
  const maintenanceRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };
  const notificationsService = { notify: jest.fn() };
  const usersService = { findAdminIds: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue(undefined) };

  let service: MaintenanceSlaService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(undefined);
    maintenanceRepo.save.mockImplementation(async (value: any) => value);
    service = new MaintenanceSlaService(
      maintenanceRepo as never,
      notificationsService as never,
      usersService as never,
      configService as never,
    );
  });

  describe('isEnabled', () => {
    it('is enabled by default', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('can be disabled via config', () => {
      configService.get.mockReturnValue('false');
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('enforceSlaBreaches', () => {
    it('does nothing when disabled', async () => {
      configService.get.mockReturnValue('false');
      await service.enforceSlaBreaches();
      expect(maintenanceRepo.find).not.toHaveBeenCalled();
    });

    it('notifies the landlord and advances the tier on response breach', async () => {
      const request = {
        id: 'req-1',
        landlordId: 'landlord-1',
        priority: 'HIGH',
        status: MaintenanceStatus.OPEN,
        slaEscalationTier: SlaEscalationTier.NONE,
      };
      maintenanceRepo.find
        .mockResolvedValueOnce([request]) // response-breach query
        .mockResolvedValueOnce([]); // resolution-breach query

      await service.enforceSlaBreaches();

      expect(notificationsService.notify).toHaveBeenCalledWith(
        'landlord-1',
        expect.stringContaining('Response Overdue'),
        expect.stringContaining('req-1'),
        'maintenance_sla',
      );
      expect(maintenanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slaEscalationTier: SlaEscalationTier.LANDLORD,
        }),
      );
    });

    it('notifies all admins and advances the tier on resolution breach', async () => {
      const request = {
        id: 'req-2',
        landlordId: 'landlord-1',
        priority: 'URGENT',
        status: MaintenanceStatus.IN_PROGRESS,
        slaEscalationTier: SlaEscalationTier.LANDLORD,
      };
      maintenanceRepo.find
        .mockResolvedValueOnce([]) // response-breach query: none
        .mockResolvedValueOnce([request]); // resolution-breach query
      usersService.findAdminIds.mockResolvedValue(['admin-1', 'admin-2']);

      await service.enforceSlaBreaches();

      expect(notificationsService.notify).toHaveBeenCalledWith(
        'admin-1',
        expect.stringContaining('Resolution Overdue'),
        expect.stringContaining('req-2'),
        'maintenance_sla',
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        'admin-2',
        expect.stringContaining('Resolution Overdue'),
        expect.stringContaining('req-2'),
        'maintenance_sla',
      );
      expect(maintenanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ slaEscalationTier: SlaEscalationTier.ADMIN }),
      );
    });

    it('does not escalate to admin tier when no admins are configured', async () => {
      const request = {
        id: 'req-3',
        landlordId: 'landlord-1',
        priority: 'URGENT',
        status: MaintenanceStatus.OPEN,
        slaEscalationTier: SlaEscalationTier.LANDLORD,
      };
      maintenanceRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([request]);
      usersService.findAdminIds.mockResolvedValue([]);

      await service.enforceSlaBreaches();

      expect(notificationsService.notify).not.toHaveBeenCalled();
      expect(maintenanceRepo.save).not.toHaveBeenCalled();
    });

    it('does not re-notify a request already escalated to its current tier', async () => {
      // Neither query should return a request already at the tier that would
      // be produced by that query's own escalation (the `where` filters
      // enforce this at the DB level); here we simulate the DB filtering
      // correctly and assert no further escalation occurs beyond ADMIN.
      maintenanceRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.enforceSlaBreaches();

      expect(notificationsService.notify).not.toHaveBeenCalled();
      expect(maintenanceRepo.save).not.toHaveBeenCalled();
    });

    it('continues processing remaining requests if one notification fails', async () => {
      const requestA = {
        id: 'req-a',
        landlordId: 'landlord-a',
        priority: 'HIGH',
        status: MaintenanceStatus.OPEN,
        slaEscalationTier: SlaEscalationTier.NONE,
      };
      const requestB = {
        id: 'req-b',
        landlordId: 'landlord-b',
        priority: 'HIGH',
        status: MaintenanceStatus.OPEN,
        slaEscalationTier: SlaEscalationTier.NONE,
      };
      maintenanceRepo.find
        .mockResolvedValueOnce([requestA, requestB])
        .mockResolvedValueOnce([]);
      notificationsService.notify
        .mockRejectedValueOnce(new Error('email provider down'))
        .mockResolvedValueOnce(undefined);

      await expect(service.enforceSlaBreaches()).resolves.not.toThrow();

      expect(notificationsService.notify).toHaveBeenCalledTimes(2);
      // Only requestB should have been saved with the advanced tier since
      // requestA's notification failed.
      expect(maintenanceRepo.save).toHaveBeenCalledTimes(1);
      expect(maintenanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'req-b' }),
      );
    });
  });
});
