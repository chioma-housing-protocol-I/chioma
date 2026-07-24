import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan, MoreThan } from 'typeorm';
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
import { PaymentService } from '../payments/payment.service';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { StellarService } from '../stellar/services/stellar.service';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    private readonly paymentService: PaymentService,
    private readonly stellarService: StellarService,
    private readonly dataSource: DataSource,
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

    // Check for overlapping bookings
    const overlapping = await this.bookingRepository.exists({
      where: {
        propertyId: dto.propertyId,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        checkInDate: LessThan(dto.checkOut),
        checkOutDate: MoreThan(dto.checkIn),
      },
    });
    if (overlapping) {
      throw new BusinessRuleViolationError(
        'Property is not available for the selected dates',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = queryRunner.manager.create(Booking, {
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

      const savedBooking = await queryRunner.manager.save(booking);

      // Create pending payment record for the booking
      const payment = queryRunner.manager.create(Payment, {
        userId: guestId,
        bookingId: savedBooking.id,
        amount: savedBooking.totalAmount,
        transactionFee: 0,
        netAmount: savedBooking.totalAmount,
        currency: savedBooking.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: dto.paymentMethod,
        metadata: { flow: 'booking' },
      });

      await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Booking created: ${savedBooking.id} for property ${property.id} by guest ${guestId}`,
      );
      return savedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
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

      booking.status = BookingStatus.CONFIRMED;
      const savedBooking = await queryRunner.manager.save(booking);

      // Update payment status to completed (simulate for now; in real flow this would be after payment gateway confirmation)
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { bookingId: savedBooking.id },
      });
      if (payment) {
        payment.status = PaymentStatus.COMPLETED;
        payment.processedAt = new Date();
        await queryRunner.manager.save(payment);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Booking ${bookingId} transitioned to confirmed`);
      return savedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancel(userId: string, bookingId: string): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(Booking, {
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

      booking.status = BookingStatus.CANCELLED;
      const savedBooking = await queryRunner.manager.save(booking);

      // Update payment status to refunded (simulate for now)
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { bookingId: savedBooking.id },
      });
      if (payment && payment.status === PaymentStatus.COMPLETED) {
        payment.status = PaymentStatus.REFUNDED;
        payment.refundAmount = payment.amount;
        await queryRunner.manager.save(payment);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Booking ${bookingId} transitioned to cancelled`);
      return savedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
