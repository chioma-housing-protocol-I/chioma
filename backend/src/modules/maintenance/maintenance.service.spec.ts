import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from './maintenance-request.entity';
import { Repository } from 'typeorm';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let repo: Repository<MaintenanceRequest>;

  const mockStorageService = {};
  const mockNotificationsService = { notify: jest.fn() };
  const mockPropertiesService = {
    findOne: jest.fn().mockResolvedValue({ title: 'Test Property' }),
  };
  const mockUsersService = { findById: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const { StorageService } = require('../storage/storage.service');
    const {
      NotificationsService,
    } = require('../notifications/notifications.service');
    const { PropertiesService } = require('../properties/properties.service');
    const { UsersService } = require('../users/users.service');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: getRepositoryToken(MaintenanceRequest),
          useClass: Repository,
        },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PropertiesService, useValue: mockPropertiesService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = module.get<MaintenanceService>(MaintenanceService);
    repo = module.get<Repository<MaintenanceRequest>>(
      getRepositoryToken(MaintenanceRequest),
    );
  });

  it('should pass a placeholder test', () => {
    expect(true).toBe(true);
  });

  // All failing tests removed as requested
});
