import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubletRequest,
  SubletRequestStatus,
} from './entities/sublet-request.entity';
import { SubletBooking } from './entities/sublet-booking.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { RequestSublettingDto } from './dto/request-subletting.dto';
import { ApproveSublettingDto } from './dto/approve-subletting.dto';
import { DenySublettingDto } from './dto/deny-subletting.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationUtils } from '../../common/utils';
import { Property } from '../properties/entities/property.entity';

@Injectable()
export class SublettingService {
  constructor(
    @InjectRepository(SubletRequest)
    private readonly subletRequestRepository: Repository<SubletRequest>,
    @InjectRepository(SubletBooking)
    private readonly subletBookingRepository: Repository<SubletBooking>,
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async requestSubletting(dto: RequestSublettingDto, tenantId: string) {
    const agreement = await this.agreementRepository.findOne({
      where: { id: dto.agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found');
    }

    if (agreement.userId !== tenantId) {
      throw new ForbiddenException('Not authorized');
    }

    const property = await this.propertyRepository.findOne({
      where: { id: agreement.propertyId },
    });

    if (!property?.sublettingAllowed) {
      throw new BadRequestException('Subletting not allowed for this property');
    }

    const request = this.subletRequestRepository.create({
      agreementId: dto.agreementId,
      tenantId,
      landlordId: agreement.adminId,
      requestedStartDate: new Date(dto.startDate),
      requestedEndDate: new Date(dto.endDate),
      maxDaysPerYear: property.sublettingMaxDaysPerYear,
      tenantShare: Number(property.sublettingTenantShare),
      landlordShare: Number(property.sublettingLandlordShare),
      reason: dto.reason ?? null,
    });

    const saved = await this.subletRequestRepository.save(request);

    await this.notificationsService.notify(
      agreement.adminId,
      'Sublet request',
      'A tenant requested subletting approval.',
      'SUBLET_REQUEST',
    );

    return saved;
  }

  async getSublettingRequests(
    landlordId: string,
    status?: SubletRequestStatus,
    page = 1,
    limit = 20,
  ) {
    const where: { landlordId: string; status?: SubletRequestStatus } = {
      landlordId,
    };

    if (status) {
      where.status = status;
    }

    PaginationUtils.validatePagination(page, limit);
    const [data, total] = await this.subletRequestRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(page, limit),
      take: limit,
    });

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  async approveSubletting(
    requestId: string,
    dto: ApproveSublettingDto,
    landlordId: string,
  ) {
    const request = await this.subletRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.landlordId !== landlordId) {
      throw new ForbiddenException('Not authorized');
    }

    request.status = SubletRequestStatus.APPROVED;
    request.landlordNotes = dto.notes ?? null;
    request.respondedAt = new Date();

    const saved = await this.subletRequestRepository.save(request);

    await this.notificationsService.notify(
      request.tenantId,
      'Sublet approved',
      'Your sublet request has been approved.',
      'SUBLET_APPROVED',
    );

    return saved;
  }

  async denySubletting(
    requestId: string,
    dto: DenySublettingDto,
    landlordId: string,
  ) {
    const request = await this.subletRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.landlordId !== landlordId) {
      throw new ForbiddenException('Not authorized');
    }

    request.status = SubletRequestStatus.DENIED;
    request.landlordNotes = dto.reason;
    request.respondedAt = new Date();

    const saved = await this.subletRequestRepository.save(request);

    await this.notificationsService.notify(
      request.tenantId,
      'Sublet denied',
      'Your sublet request has been denied.',
      'SUBLET_DENIED',
    );

    return saved;
  }

  async getTenantSubletBookings(tenantId: string, page = 1, limit = 20) {
    PaginationUtils.validatePagination(page, limit);
    const [data, total] = await this.subletBookingRepository.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: PaginationUtils.calculateOffset(page, limit),
      take: limit,
    });

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  async getTenantEarnings(tenantId: string) {
    const bookings = await this.subletBookingRepository.find({
      where: { tenantId },
    });

    const totalEarnings = bookings.reduce(
      (sum, b) => sum + Number(b.tenantEarnings),
      0,
    );
    const pendingEarnings = bookings
      .filter((b) => !b.payoutProcessed)
      .reduce((sum, b) => sum + Number(b.tenantEarnings), 0);

    return {
      totalEarnings,
      pendingEarnings,
      paidEarnings: totalEarnings - pendingEarnings,
      bookingCount: bookings.length,
    };
  }

  async getLandlordEarnings(landlordId: string) {
    const bookings = await this.subletBookingRepository.find({
      where: { landlordId },
    });

    const totalEarnings = bookings.reduce(
      (sum, b) => sum + Number(b.landlordEarnings),
      0,
    );
    const pendingEarnings = bookings
      .filter((b) => !b.payoutProcessed)
      .reduce((sum, b) => sum + Number(b.landlordEarnings), 0);

    return {
      totalEarnings,
      pendingEarnings,
      paidEarnings: totalEarnings - pendingEarnings,
      bookingCount: bookings.length,
    };
  }
}
