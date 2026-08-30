import {
  MaintenanceNotFoundError,
  AuthorizationError,
  ValidationError,
} from '../../common/errors/domain-errors';
import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from './maintenance-request.entity';

describe('MaintenanceService', () => {
  const maintenanceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const notificationsService = { notify: jest.fn() };
  const propertiesService = { findOne: jest.fn() };
  const usersService = { getUserById: jest.fn() };
  const reviewPromptService = { promptForMaintenanceReview: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue(undefined) };

  let service: MaintenanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(undefined);
    service = new MaintenanceService(
      maintenanceRepo as never,
      {} as never,
      notificationsService as never,
      propertiesService as never,
      usersService as never,
      reviewPromptService as never,
      configService as never,
    );
  });

  it('creates an open maintenance request and notifies the landlord', async () => {
    const dto = {
      propertyId: 'property-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
      category: 'plumbing',
      description: 'Kitchen sink leak',
      mediaUrls: ['https://cdn.example.com/tenant-1/leak.jpg'],
    };
    const created = { ...dto, status: MaintenanceStatus.OPEN };
    const saved = { id: 'request-1', ...created } as MaintenanceRequest;

    propertiesService.findOne.mockResolvedValue({ title: 'Ocean Flat' });
    usersService.getUserById.mockResolvedValue({});
    maintenanceRepo.create.mockReturnValue(created);
    maintenanceRepo.save.mockResolvedValue(saved);

    await expect(service.create(dto)).resolves.toEqual(saved);

    expect(maintenanceRepo.create).toHaveBeenCalledWith({
      ...dto,
      status: MaintenanceStatus.OPEN,
      responseDueAt: expect.any(Date),
      resolutionDueAt: expect.any(Date),
    });
    const [createCallArg] = maintenanceRepo.create.mock.calls[0];
    expect(createCallArg.resolutionDueAt.getTime()).toBeGreaterThan(
      createCallArg.responseDueAt.getTime(),
    );
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'landlord-1',
      'New Maintenance Request',
      'A new maintenance request was submitted for property Ocean Flat.',
      'maintenance',
    );
  });

  it('rejects invalid properties and users before saving', async () => {
    propertiesService.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        propertyId: 'missing',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
      }),
    ).rejects.toThrow(ValidationError);

    propertiesService.findOne.mockResolvedValue({});
    usersService.getUserById.mockResolvedValueOnce(null);

    await expect(
      service.create({
        propertyId: 'property-1',
        tenantId: 'missing',
        landlordId: 'landlord-1',
      }),
    ).rejects.toThrow(ValidationError);
    expect(maintenanceRepo.save).not.toHaveBeenCalled();
  });

  it('rejects media that does not belong to the tenant', async () => {
    propertiesService.findOne.mockResolvedValue({});
    usersService.getUserById.mockResolvedValue({});

    await expect(
      service.create({
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
        mediaUrls: ['https://cdn.example.com/hacker-id/file.jpg'],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('retrieves a single request or throws NotFound', async () => {
    maintenanceRepo.findOne.mockResolvedValue({ id: 'request-1' });
    await expect(service.findOne('request-1')).resolves.toMatchObject({
      id: 'request-1',
    });

    maintenanceRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(
      MaintenanceNotFoundError,
    );
  });

  it('updates status and notifies tenant', async () => {
    maintenanceRepo.findOne.mockResolvedValue({
      id: 'request-1',
      tenantId: 'tenant-1',
    });
    maintenanceRepo.save.mockImplementation(async (r: any) => r);

    await expect(
      service.updateStatus(
        'request-1',
        MaintenanceStatus.CLOSED,
        'landlord-1',
        true,
      ),
    ).resolves.toMatchObject({ status: MaintenanceStatus.CLOSED });

    expect(notificationsService.notify).toHaveBeenCalledWith(
      'tenant-1',
      'Maintenance Request Status Updated',
      'Your maintenance request status is now CLOSED.',
      'maintenance',
    );
    expect(reviewPromptService.promptForMaintenanceReview).toHaveBeenCalledWith(
      'request-1',
    );
  });

  it('computes SLA deadlines from priority-specific configuration', async () => {
    const dto = {
      propertyId: 'property-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
      category: 'plumbing',
      description: 'Kitchen sink leak',
      priority: 'URGENT',
    };
    propertiesService.findOne.mockResolvedValue({ title: 'Ocean Flat' });
    usersService.getUserById.mockResolvedValue({});
    maintenanceRepo.create.mockImplementation((value: any) => value);
    maintenanceRepo.save.mockImplementation(async (value: any) => ({
      id: 'request-1',
      ...value,
    }));

    configService.get.mockImplementation((key: string) => {
      if (key === 'MAINTENANCE_SLA_URGENT_RESPONSE_HOURS') return '1';
      if (key === 'MAINTENANCE_SLA_URGENT_RESOLUTION_HOURS') return '6';
      return undefined;
    });

    const before = Date.now();
    const saved = await service.create(dto);
    const responseDueAt = (saved as any).responseDueAt as Date;
    const resolutionDueAt = (saved as any).resolutionDueAt as Date;

    expect(responseDueAt.getTime() - before).toBeCloseTo(
      1 * 60 * 60 * 1000,
      -3,
    );
    expect(resolutionDueAt.getTime() - before).toBeCloseTo(
      6 * 60 * 60 * 1000,
      -3,
    );
  });

  it('blocks status updates from unauthorized users', async () => {
    maintenanceRepo.findOne.mockResolvedValue({
      id: 'request-1',
      tenantId: 'tenant-1',
    });

    await expect(
      service.updateStatus(
        'request-1',
        MaintenanceStatus.IN_PROGRESS,
        'tenant-1',
        false,
      ),
    ).rejects.toThrow(AuthorizationError);
  });
});
