import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PropertyInquiry,
  PropertyInquiryStatus,
} from './entities/property-inquiry.entity';
import { CreatePropertyInquiryDto } from './dto/create-property-inquiry.dto';

export interface InquiryPropertySummary {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  coverImageUrl: string | null;
}

export interface InquiryCounterparty {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export type PropertyInquiryWithDetails = PropertyInquiry & {
  property: InquiryPropertySummary | null;
  counterparty: InquiryCounterparty | null;
};

@Injectable()
export class InquiriesService {
  constructor(
    @InjectRepository(PropertyInquiry)
    private readonly inquiryRepository: Repository<PropertyInquiry>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createInquiry(
    fromUserId: string,
    dto: CreatePropertyInquiryDto,
  ): Promise<PropertyInquiry> {
    const property = await this.propertyRepository.findOne({
      where: { id: dto.propertyId },
      select: ['id', 'title', 'ownerId'],
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerId === fromUserId) {
      throw new BadRequestException(
        'You cannot inquire about your own property',
      );
    }

    const inquiry = this.inquiryRepository.create({
      propertyId: property.id,
      fromUserId,
      toUserId: property.ownerId,
      message: dto.message,
      senderName: dto.name ?? null,
      senderEmail: dto.email ?? null,
      senderPhone: dto.phone ?? null,
      status: PropertyInquiryStatus.PENDING,
      viewedAt: null,
    });

    const saved = await this.inquiryRepository.save(inquiry);

    await this.notificationsService.notify(
      property.ownerId,
      'New property inquiry',
      `${dto.name || 'A user'} sent an inquiry for ${property.title}.`,
      'PROPERTY_INQUIRY',
    );

    return saved;
  }

  async listIncoming(userId: string): Promise<PropertyInquiryWithDetails[]> {
    const inquiries = await this.inquiryRepository.find({
      where: { toUserId: userId },
      order: { createdAt: 'DESC' },
    });

    const properties = await this.loadProperties(
      inquiries.map((inquiry) => inquiry.propertyId),
    );

    return inquiries.map((inquiry) => ({
      ...inquiry,
      property: properties.get(inquiry.propertyId) ?? null,
      counterparty: {
        id: inquiry.fromUserId,
        name: inquiry.senderName || 'Unknown user',
        email: inquiry.senderEmail,
        phone: inquiry.senderPhone,
      },
    }));
  }

  async listOutgoing(userId: string): Promise<PropertyInquiryWithDetails[]> {
    const inquiries = await this.inquiryRepository.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
    });

    const [properties, landlords] = await Promise.all([
      this.loadProperties(inquiries.map((inquiry) => inquiry.propertyId)),
      this.loadUsers(inquiries.map((inquiry) => inquiry.toUserId)),
    ]);

    return inquiries.map((inquiry) => ({
      ...inquiry,
      property: properties.get(inquiry.propertyId) ?? null,
      counterparty: landlords.get(inquiry.toUserId) ?? null,
    }));
  }

  private async loadProperties(
    propertyIds: string[],
  ): Promise<Map<string, InquiryPropertySummary>> {
    const uniqueIds = [...new Set(propertyIds)];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const properties = await this.propertyRepository.find({
      where: { id: In(uniqueIds) },
      relations: ['images'],
    });

    return new Map(
      properties.map((property) => [
        property.id,
        {
          id: property.id,
          title: property.title,
          address: property.address ?? null,
          city: property.city ?? null,
          coverImageUrl:
            property.images?.find((image) => image.isPrimary)?.url ??
            property.images?.[0]?.url ??
            null,
        },
      ]),
    );
  }

  private async loadUsers(
    userIds: string[],
  ): Promise<Map<string, InquiryCounterparty>> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const users = await this.userRepository.find({
      where: { id: In(uniqueIds) },
    });

    return new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.email ||
            'Landlord',
          email: user.email,
          phone: user.phoneNumber,
        },
      ]),
    );
  }

  async markViewed(id: string, userId: string): Promise<PropertyInquiry> {
    const inquiry = await this.inquiryRepository.findOne({
      where: { id, toUserId: userId },
    });

    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (inquiry.status === PropertyInquiryStatus.VIEWED) {
      return inquiry;
    }

    inquiry.status = PropertyInquiryStatus.VIEWED;
    inquiry.viewedAt = new Date();
    return this.inquiryRepository.save(inquiry);
  }
}
