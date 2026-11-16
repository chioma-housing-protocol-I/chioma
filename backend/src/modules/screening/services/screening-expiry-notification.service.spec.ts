import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ScreeningExpiryNotificationService } from './screening-expiry-notification.service';
import { TenantScreeningReport } from '../entities/tenant-screening-report.entity';
import { TenantScreeningRequest } from '../entities/tenant-screening-request.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditService } from '../../audit/audit.service';
import { UserScreeningStatus } from '../screening.enums';

describe('ScreeningExpiryNotificationService', () => {
  let service: ScreeningExpiryNotificationService;
  let mockReportRepository: { find: jest.Mock };
  let mockScreeningRepository: { find: jest.Mock };
  let notificationsService: { notify: jest.Mock };
  let auditService: { log: jest.Mock };

  const makeReport = (id: string, screeningId: string) => ({
    id,
    screeningId,
    accessExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });

  const makeScreening = (
    id: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    id,
    status: UserScreeningStatus.COMPLETED,
    requestedByUserId: `requester-${id}`,
    tenantId: `tenant-${id}`,
    ...overrides,
  });

  beforeEach(async () => {
    mockReportRepository = { find: jest.fn() };
    mockScreeningRepository = { find: jest.fn() };
    notificationsService = { notify: jest.fn().mockResolvedValue(undefined) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreeningExpiryNotificationService,
        {
          provide: getRepositoryToken(TenantScreeningReport),
          useValue: mockReportRepository,
        },
        {
          provide: getRepositoryToken(TenantScreeningRequest),
          useValue: mockScreeningRepository,
        },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditService, useValue: auditService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, def: string) => def) },
        },
      ],
    }).compile();

    service = module.get(ScreeningExpiryNotificationService);
  });

  it('fetches all matching screening requests in a single batched query instead of one per report (#2078)', async () => {
    const reports = [
      makeReport('report-1', 'screening-1'),
      makeReport('report-2', 'screening-2'),
      makeReport('report-3', 'screening-3'),
    ];
    mockReportRepository.find.mockResolvedValue(reports);
    mockScreeningRepository.find.mockResolvedValue([
      makeScreening('screening-1'),
      makeScreening('screening-2'),
      makeScreening('screening-3'),
    ]);

    const sent = await service.notifyExpiringReports();

    expect(mockScreeningRepository.find).toHaveBeenCalledTimes(1);
    expect(sent).toBe(3);
    // Two notifications per completed report (requester + tenant).
    expect(notificationsService.notify).toHaveBeenCalledTimes(6);
  });

  it('does not query screenings at all when there are no expiring reports', async () => {
    mockReportRepository.find.mockResolvedValue([]);

    const sent = await service.notifyExpiringReports();

    expect(mockScreeningRepository.find).not.toHaveBeenCalled();
    expect(sent).toBe(0);
  });

  it('skips a report whose screening request cannot be found', async () => {
    mockReportRepository.find.mockResolvedValue([
      makeReport('report-1', 'missing-screening'),
    ]);
    mockScreeningRepository.find.mockResolvedValue([]);

    const sent = await service.notifyExpiringReports();

    expect(sent).toBe(0);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });

  it('skips a report whose screening is not in completed status', async () => {
    mockReportRepository.find.mockResolvedValue([
      makeReport('report-1', 'screening-1'),
    ]);
    mockScreeningRepository.find.mockResolvedValue([
      makeScreening('screening-1', {
        status: UserScreeningStatus.IN_PROGRESS,
      }),
    ]);

    const sent = await service.notifyExpiringReports();

    expect(sent).toBe(0);
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});
