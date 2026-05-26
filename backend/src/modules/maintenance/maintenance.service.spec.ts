import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

  let service: MaintenanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceService(
      maintenanceRepo as never,
      {} as never,
      notificationsService as never,
      propertiesService as never,
      usersService as never,
      reviewPromptService as never,
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
    });
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
    ).rejects.toThrow(BadRequestException);

    propertiesService.findOne.mockResolvedValue({});
    usersService.getUserById.mockResolvedValueOnce(null);

    await expect(
      service.create({
        propertyId: 'property-1',
        tenantId: 'missing',
        landlordId: 'landlord-1',
      }),
    ).rejects.toThrow(BadRequestException);
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
        mediaUrls: ['https://cdn.example.com/other-user/photo.jpg'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('finds requests by filter and throws when a request is missing', async () => {
    const openRequest = {
      id: 'request-1',
      status: MaintenanceStatus.OPEN,
    } as MaintenanceRequest;
    maintenanceRepo.find.mockResolvedValue([openRequest]);
    maintenanceRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findAll({
        propertyId: 'property-1',
        status: MaintenanceStatus.OPEN,
      }),
    ).resolves.toEqual([openRequest]);
    expect(maintenanceRepo.find).toHaveBeenCalledWith({
      where: { propertyId: 'property-1', status: MaintenanceStatus.OPEN },
    });
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('updates status, notifies the tenant, and prompts for reviews when closed', async () => {
    const request = {
      id: 'request-1',
      tenantId: 'tenant-1',
      status: MaintenanceStatus.OPEN,
    } as MaintenanceRequest;
    maintenanceRepo.findOne.mockResolvedValue(request);
    maintenanceRepo.save.mockImplementation(async (value) => value);

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
    ).rejects.toThrow(ForbiddenException);
  });
});
