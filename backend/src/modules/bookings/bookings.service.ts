import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingRoleFilter, QueryBookingsDto } from './dto/query-bookings.dto';
import {
  AuthorizationError,
  BusinessRuleViolationError,
  PropertyNotFoundError,
  BookingNotFoundError,
} from '../../common/errors/domain-errors';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async create(guestId: string, dto: CreateBookingDto): Promise<Booking> {
    const property = await this.propertyRepository.findOne({
      where: { id: dto.propertyId },
    });
    if (!property) {
      throw new PropertyNotFoundError(dto.propertyId);
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY,
    );
    if (nights < 1) {
      throw new BusinessRuleViolationError(
        'Check-out date must be after check-in date',
      );
    }

    const booking = this.bookingRepository.create({
      propertyId: property.id,
      guestId,
      checkInDate: dto.checkIn,
      checkOutDate: dto.checkOut,
      guests: dto.guests,
      specialRequests: dto.specialRequests ?? null,
      paymentMethod: dto.paymentMethod,
      totalAmount: Number(property.price) * nights,
      currency: property.currency,
      status: BookingStatus.PENDING,
    });

    const saved = await this.bookingRepository.save(booking);
    this.logger.log(
      `Booking created: ${saved.id} for property ${property.id} by guest ${guestId}`,
    );
    return saved;
  }

  async findForUser(
    userId: string,
    query: QueryBookingsDto,
  ): Promise<Booking[]> {
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.guest', 'guest')
      .orderBy('booking.createdAt', 'DESC');

    if (query.role === BookingRoleFilter.HOST) {
      qb.where('property.ownerId = :userId', { userId });
    } else {
      qb.where('booking.guestId = :userId', { userId });
    }

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async confirm(userId: string, bookingId: string): Promise<Booking> {
    return this.transitionAsHost(userId, bookingId, BookingStatus.CONFIRMED);
  }

  async cancel(userId: string, bookingId: string): Promise<Booking> {
    return this.transitionAsHost(userId, bookingId, BookingStatus.CANCELLED);
  }

  private async transitionAsHost(
    userId: string,
    bookingId: string,
    nextStatus: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['property', 'guest'],
    });
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }
    if (booking.property.ownerId !== userId) {
      throw new AuthorizationError(
        'Only the property owner can update this booking',
      );
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BusinessRuleViolationError(
        `Booking is already ${booking.status}`,
      );
    }

    booking.status = nextStatus;
    const saved = await this.bookingRepository.save(booking);
    this.logger.log(`Booking ${bookingId} transitioned to ${nextStatus}`);
    return saved;
  }
}
