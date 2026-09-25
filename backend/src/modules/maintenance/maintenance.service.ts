import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
import { PaymentService } from '../payments/payment.service';
import { Vendor } from './entities/vendor.entity';

/** Allowed lifecycle transitions: requested → assigned → cost pending → approved → paid → resolved. */
export const MAINTENANCE_TRANSITIONS: Record<
  MaintenanceStatus,
  MaintenanceStatus[]
> = {
  [MaintenanceStatus.OPEN]: [
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.CLOSED,
  ],
  [MaintenanceStatus.ASSIGNED]: [
    MaintenanceStatus.COST_PENDING,
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.CLOSED,
  ],
  [MaintenanceStatus.COST_PENDING]: [
    MaintenanceStatus.COST_APPROVED,
    MaintenanceStatus.ASSIGNED,
    MaintenanceStatus.CLOSED,
  ],
  [MaintenanceStatus.COST_APPROVED]: [MaintenanceStatus.PAID],
  [MaintenanceStatus.PAID]: [
    MaintenanceStatus.IN_PROGRESS,
    MaintenanceStatus.RESOLVED,
  ],
  [MaintenanceStatus.IN_PROGRESS]: [
    MaintenanceStatus.RESOLVED,
    MaintenanceStatus.CLOSED,
  ],
  [MaintenanceStatus.RESOLVED]: [MaintenanceStatus.CLOSED],
  [MaintenanceStatus.CLOSED]: [],
};

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
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    private readonly paymentService: PaymentService,
  ) {}

  private assertTransition(from: MaintenanceStatus, to: MaintenanceStatus) {
    if (!MAINTENANCE_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition from ${from} to ${to}`,
      );
    }
  }

  async create(dto: CreateMaintenanceDto): Promise<MaintenanceRequest> {
    const property = await this.propertiesService.findOne(dto.propertyId);
    if (!property) throw new BadRequestException('Invalid property');

    const tenant = await this.usersService.getUserById(dto.tenantId);
    const landlord = await this.usersService.getUserById(dto.landlordId);
    if (!tenant || !landlord) throw new BadRequestException('Invalid user');

    if (dto.mediaUrls && dto.mediaUrls.length > 0) {
      for (const url of dto.mediaUrls) {
        if (!url.includes(dto.tenantId)) {
          throw new BadRequestException('Invalid media ownership');
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
    if (!req) throw new NotFoundException('Maintenance request not found');
    return req;
  }

  async updateStatus(
    id: string,
    status: MaintenanceStatus,
    userId: string,
    isLandlordOrAgent: boolean,
  ): Promise<MaintenanceRequest> {
    const req = await this.findOne(id);

    if (!isLandlordOrAgent) throw new ForbiddenException('Not authorized');

    this.assertTransition(req.status, status);
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

  createVendor(dto: Partial<Vendor>, landlordId?: string): Promise<Vendor> {
    return this.vendorRepo.save(this.vendorRepo.create({ ...dto, landlordId }));
  }

  findVendors(landlordId?: string): Promise<Vendor[]> {
    return this.vendorRepo.find({
      where: landlordId ? { landlordId } : {},
    });
  }

  async assignVendor(
    id: string,
    vendorId: string,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const req = await this.findOne(id);
    if (req.landlordId !== userId) {
      throw new ForbiddenException('Only the landlord can assign a vendor');
    }
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    this.assertTransition(req.status, MaintenanceStatus.ASSIGNED);
    req.vendorId = vendor.id;
    req.vendor = vendor;
    req.status = MaintenanceStatus.ASSIGNED;
    req.estimatedCost = null;
    req.costApprovedBy = null;
    req.costApprovedAt = null;
    const saved = await this.maintenanceRepo.save(req);

    await this.notificationsService.notify(
      req.tenantId,
      'Vendor Assigned',
      `${vendor.name} has been assigned to your maintenance request.`,
      'maintenance',
    );
    return saved;
  }

  async submitCostEstimate(
    id: string,
    estimatedCost: number,
    notes: string | undefined,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const req = await this.findOne(id);
    if (req.landlordId !== userId) {
      throw new ForbiddenException('Only the landlord can submit a cost');
    }
    if (!req.vendorId) throw new BadRequestException('No vendor assigned');
    if (!(estimatedCost >= 0)) throw new BadRequestException('Invalid cost');

    this.assertTransition(req.status, MaintenanceStatus.COST_PENDING);
    req.estimatedCost = estimatedCost;
    req.costNotes = notes ?? null;
    req.costRejectionReason = null;
    req.status = MaintenanceStatus.COST_PENDING;
    const saved = await this.maintenanceRepo.save(req);

    await this.notificationsService.notify(
      req.tenantId,
      'Maintenance Cost Estimate',
      `A cost estimate of ${estimatedCost} was submitted for your review.`,
      'maintenance',
    );
    return saved;
  }

  async reviewCostEstimate(
    id: string,
    approved: boolean,
    reason: string | undefined,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const req = await this.findOne(id);
    if (req.tenantId !== userId && req.landlordId !== userId) {
      throw new ForbiddenException('Not a party to this request');
    }
    if (req.status !== MaintenanceStatus.COST_PENDING) {
      throw new BadRequestException('No cost estimate pending review');
    }

    if (approved) {
      this.assertTransition(req.status, MaintenanceStatus.COST_APPROVED);
      req.status = MaintenanceStatus.COST_APPROVED;
      req.costApprovedBy = userId;
      req.costApprovedAt = new Date();
    } else {
      req.status = MaintenanceStatus.ASSIGNED;
      req.costRejectionReason = reason ?? 'Rejected';
    }
    const saved = await this.maintenanceRepo.save(req);

    const counterparty =
      userId === req.tenantId ? req.landlordId : req.tenantId;
    await this.notificationsService.notify(
      counterparty,
      approved ? 'Maintenance Cost Approved' : 'Maintenance Cost Rejected',
      approved
        ? `The cost estimate of ${req.estimatedCost} was approved.`
        : `The cost estimate was rejected: ${req.costRejectionReason}`,
      'maintenance',
    );
    return saved;
  }

  /** Settles an approved cost through the payment service (charged to the caller). */
  async payApprovedCost(
    id: string,
    paymentMethodId: string,
    agreementId: string | undefined,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const req = await this.findOne(id);
    if (req.tenantId !== userId && req.landlordId !== userId) {
      throw new ForbiddenException('Not a party to this request');
    }
    this.assertTransition(req.status, MaintenanceStatus.PAID);

    const payment = await this.paymentService.recordPayment(
      {
        amount: Number(req.estimatedCost),
        paymentMethodId,
        agreementId,
        notes: `Maintenance request ${req.id} (vendor ${req.vendorId})`,
        idempotencyKey: `maintenance-${req.id}`,
      },
      userId,
    );

    req.paymentId = String(payment.id);
    req.status = MaintenanceStatus.PAID;
    return this.maintenanceRepo.save(req);
  }
}
