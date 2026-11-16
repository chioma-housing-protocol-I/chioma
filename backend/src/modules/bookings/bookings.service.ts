import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository, DataSource, In, LessThan, MoreThan, Not } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { BookingRoleFilter, QueryBookingsDto } from './dto/query-bookings.dto';
import {
  AuthorizationError,
  BusinessRuleViolationError,
  PropertyNotFoundError,
  BookingNotFoundError,
} from '../../common/errors/domain-errors';
import { PaymentService } from '../payments/payment.service';
import { StellarService } from '../stellar/services/stellar.service';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaginationUtils } from '../../common/utils';
import { EmailJobData } from '../queues/processors/email.processor';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    private readonly paymentService: PaymentService,
    private readonly stellarService: StellarService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    @InjectQueue('email') private readonly emailQueue: Queue<EmailJobData>,
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

    // Cheap pre-check outside the transaction to fail fast on the common
    // case. This alone is NOT sufficient to prevent double-booking — two
    // concurrent requests can both pass it before either commits — so the
    // authoritative check below re-runs under a row lock inside the
    // transaction. SQLite (used by in-memory test databases) has no
    // row-level locking support, so the lock is skipped there rather than
    // failing the query outright, matching the pattern already used in
    // payments/refund.service.ts.
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

    const supportsRowLocking = this.dataSource.options?.type !== 'sqlite';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Serialize concurrent booking attempts for this property by taking a
      // pessimistic write lock on its row before re-checking availability.
      // Without this, two overlapping requests can both pass the exists()
      // check above before either commits, producing a double booking.
      await queryRunner.manager.findOne(Property, {
        where: { id: property.id },
        ...(supportsRowLocking
          ? { lock: { mode: 'pessimistic_write' as const } }
          : {}),
      });

      const stillOverlapping = await queryRunner.manager.exists(Booking, {
        where: {
          propertyId: dto.propertyId,
          status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
          checkInDate: LessThan(dto.checkOut),
          checkOutDate: MoreThan(dto.checkIn),
        },
      });
      if (stillOverlapping) {
        throw new BusinessRuleViolationError(
          'Property is not available for the selected dates',
        );
      }

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

      // Create pending payment record for the booking (#2040: delegated to
      // PaymentService so booking/rent/agreement flows share one
      // implementation instead of each inlining their own).
      await this.paymentService.createPendingPayment(
        {
          userId: guestId,
          bookingId: savedBooking.id,
          amount: savedBooking.totalAmount,
          currency: savedBooking.currency,
          paymentMethod: dto.paymentMethod,
          metadata: { flow: 'booking' },
        },
        queryRunner.manager,
      );

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

  async findForUser(userId: string, query: QueryBookingsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    PaginationUtils.validatePagination(page, limit);

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.guest', 'guest')
      .orderBy('booking.createdAt', 'DESC')
      .skip(PaginationUtils.calculateOffset(page, limit))
      .take(limit);

    if (query.role === BookingRoleFilter.HOST) {
      qb.where('property.ownerId = :userId', { userId });
    } else {
      qb.where('booking.guestId = :userId', { userId });
    }

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    const [data, total] = await qb.getManyAndCount();
    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
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

      // Update payment status to completed (simulate for now; in real flow
      // this would be after payment gateway confirmation). #2040: delegated
      // to PaymentService.
      await this.paymentService.completePaymentForBooking(
        savedBooking.id,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Booking ${bookingId} transitioned to confirmed`);

      // Enqueued (not sent inline) so a transient SMTP failure never fails
      // the confirmation itself: the email queue retries the job per its
      // own attempts/backoff config, and a permanently failed send lands in
      // the dead letter queue instead of being silently dropped (#2092).
      await this.enqueueBookingConfirmationEmail(savedBooking);

      return savedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async enqueueBookingConfirmationEmail(
    booking: Booking,
  ): Promise<void> {
    if (!booking.guest?.email) {
      this.logger.warn(
        `Skipping booking confirmation email for ${booking.id}: guest has no email on file`,
      );
      return;
    }

    try {
      await this.emailQueue.add(
        {
          type: 'booking-confirmation',
          email: booking.guest.email,
          subject: 'Your booking is confirmed',
          template: 'booking-confirmation',
          data: {
            title: 'Booking confirmed',
            message: `Your booking at ${booking.property?.title ?? 'the property'} from ${booking.checkInDate} to ${booking.checkOutDate} is confirmed.`,
          },
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    } catch (error) {
      // Enqueue itself failing (e.g. Redis unreachable) should not fail the
      // booking confirmation that already committed; log and move on.
      this.logger.error(
        `Failed to enqueue booking confirmation email for booking ${booking.id}`,
        error instanceof Error ? error.stack : String(error),
      );
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

      // Update payment status to refunded (simulate for now). #2040:
      // delegated to PaymentService.
      await this.paymentService.refundPaymentForBooking(
        savedBooking.id,
        queryRunner.manager,
      );

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

  async reschedule(
    guestId: string,
    bookingId: string,
    dto: RescheduleBookingDto,
  ): Promise<Booking> {
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
      if (booking.guestId !== guestId) {
        throw new AuthorizationError(
          'Only the guest who made this booking can reschedule it',
        );
      }
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BusinessRuleViolationError(
          `Booking is already ${booking.status}`,
        );
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

      const overlapping = await queryRunner.manager.exists(Booking, {
        where: {
          propertyId: booking.propertyId,
          id: Not(booking.id),
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

      const previousCheckIn = booking.checkInDate;
      const previousCheckOut = booking.checkOutDate;
      const previousAmount = booking.totalAmount;

      booking.checkInDate = dto.checkIn;
      booking.checkOutDate = dto.checkOut;
      booking.totalAmount = Number(booking.property.price) * nights;

      const savedBooking = await queryRunner.manager.save(booking);

      const amountDelta = savedBooking.totalAmount - Number(previousAmount);
      if (amountDelta !== 0) {
        // #2040: delegated to PaymentService.
        await this.paymentService.updatePaymentAmountForBooking(
          savedBooking.id,
          savedBooking.totalAmount,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Booking ${bookingId} rescheduled from ${previousCheckIn}..${previousCheckOut} to ${dto.checkIn}..${dto.checkOut}`,
      );

      await this.notificationsService.notify(
        booking.property.ownerId,
        'Booking Rescheduled',
        `The guest rescheduled booking ${savedBooking.id} to ${dto.checkIn} - ${dto.checkOut}.`,
        'booking',
      );

      return savedBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
