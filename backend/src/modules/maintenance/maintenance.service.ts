import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from './maintenance-request.entity';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PropertiesService } from '../properties/properties.service';
import { UsersService } from '../users/users.service';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import {
  MaintenanceNotFoundError,
  AuthorizationError,
  ValidationError,
} from '../../common/errors/domain-errors';

export interface CreateMaintenanceDto {
  propertyId: string;
  tenantId: string;
  landlordId: string;
  mediaUrls?: string[];
  [key: string]: unknown;
}

export interface MaintenanceFilter {
  propertyId?: string;
  status?: MaintenanceStatus;
  priority?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepo: Repository<MaintenanceRequest>,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
    private readonly propertiesService: PropertiesService,
    private readonly usersService: UsersService,
    private readonly reviewPromptService: ReviewPromptService,
  ) {}

  async create(dto: CreateMaintenanceDto): Promise<MaintenanceRequest> {
    const property = await this.propertiesService.findOne(dto.propertyId);
    if (!property) throw new ValidationError('Invalid property');

    const tenant = await this.usersService.getUserById(dto.tenantId);
    const landlord = await this.usersService.getUserById(dto.landlordId);
    if (!tenant || !landlord) throw new ValidationError('Invalid user');

    if (dto.mediaUrls && dto.mediaUrls.length > 0) {
      for (const url of dto.mediaUrls) {
        if (!url.includes(dto.tenantId)) {
          throw new ValidationError('Invalid media ownership');
        }
      }
    }

    const req = this.maintenanceRepo.create({
      ...dto,
      status: MaintenanceStatus.OPEN,
    });

    const saved = await this.maintenanceRepo.save(req);

    await this.notificationsService.notify(
      dto.landlordId,
      'New Maintenance Request',
      `A new maintenance request was submitted for property ${property.title ?? ''}.`,
      'maintenance',
    );

    return saved;
  }

  async findAll(filter: MaintenanceFilter): Promise<MaintenanceRequest[]> {
    // Removed the erroneous `as MaintenanceRequest[]` cast — find() already returns the correct type
    return this.maintenanceRepo.find({ where: filter });
  }

  async findOne(id: string): Promise<MaintenanceRequest> {
    const req = await this.maintenanceRepo.findOne({ where: { id } });
    if (!req) throw new MaintenanceNotFoundError(id);
    return req;
  }

  async updateStatus(
    id: string,
    status: MaintenanceStatus,
    userId: string,
    isLandlordOrAgent: boolean,
  ): Promise<MaintenanceRequest> {
    const req = await this.findOne(id);

    if (!isLandlordOrAgent) throw new AuthorizationError('Not authorized');

    req.status = status;
    const saved = await this.maintenanceRepo.save(req);

    await this.notificationsService.notify(
      req.tenantId,
      'Maintenance Request Status Updated',
      `Your maintenance request status is now ${status}.`,
      'maintenance',
    );

    // Trigger review prompt if closed
    if (status === MaintenanceStatus.CLOSED) {
      await this.reviewPromptService.promptForMaintenanceReview(id);
    }

    return saved;
  }
}
