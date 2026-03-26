import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentAgreement } from './entities/rent-contract.entity';
import { Payment } from './entities/payment.entity';

/** Represents a single entry in a generated payment schedule. */
export interface PaymentScheduleEntry {
  /** Sequential payment number */
  paymentNumber: number;
  /** Date the payment is due */
  dueDate: Date;
  /** Amount due for this period */
  amount: number;
  /** The agreement this schedule belongs to */
  agreementId: string;
}

@Injectable()
export class RentService {
  private readonly logger = new Logger(RentService.name);

  constructor(
    @InjectRepository(RentAgreement)
    private readonly agreementRepository: Repository<RentAgreement>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Calculates the total monthly rent including optional tax and fees.
   *
   * @param baseRent - The base monthly rent amount
   * @param taxRate - Optional tax rate as a decimal (e.g. 0.05 for 5%)
   * @param fees - Optional additional flat fees
   * @returns The total monthly amount due
   */
  calculateMonthlyRent(
    baseRent: number,
    taxRate: number = 0,
    fees: number = 0,
  ): number {
    const taxAmount = baseRent * taxRate;
    const total = baseRent + taxAmount + fees;
    return Math.round(total * 100) / 100;
  }

  /**
   * Calculates the late fee for an overdue rent payment.
   *
   * Default policy: 5% flat fee after a 5-day grace period, plus 0.1% of
   * the monthly rent for each additional day beyond the grace period.
   *
   * @param monthlyRent - The monthly rent amount
   * @param daysLate - Number of days past the due date
   * @param gracePeriodDays - Days before late fees kick in (default: 5)
   * @param lateFeeRate - Flat late-fee percentage as a decimal (default: 0.05)
   * @returns The calculated late fee, or 0 if within the grace period
   */
  calculateLateFee(
    monthlyRent: number,
    daysLate: number,
    gracePeriodDays: number = 5,
    lateFeeRate: number = 0.05,
  ): number {
    if (daysLate <= gracePeriodDays) {
      return 0;
    }

    const flatFee = monthlyRent * lateFeeRate;
    const additionalDays = daysLate - gracePeriodDays;
    const dailyPenalty = monthlyRent * 0.001 * additionalDays;
    const total = flatFee + dailyPenalty;

    return Math.round(total * 100) / 100;
  }

  /**
   * Calculates prorated rent for a partial month based on the move-in date.
   *
   * Uses the actual number of days in the move-in month to prorate.
   *
   * @param monthlyRent - The full monthly rent amount
   * @param moveInDate - The tenant's move-in date
   * @returns The prorated rent amount for the remaining days in the month
   */
  calculateProratedRent(monthlyRent: number, moveInDate: Date): number {
    const date = new Date(moveInDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const remainingDays = daysInMonth - date.getDate() + 1;
    const dailyRate = monthlyRent / daysInMonth;
    const prorated = dailyRate * remainingDays;

    return Math.round(prorated * 100) / 100;
  }

  /**
   * Generates a month-by-month payment schedule for a rent agreement.
   *
   * Each entry falls on the same day-of-month as the start date. The schedule
   * covers every month from startDate through endDate (inclusive of the final month).
   *
   * @param agreementId - The agreement identifier
   * @param monthlyRent - The monthly rent amount
   * @param startDate - Lease start date
   * @param endDate - Lease end date
   * @returns An array of payment schedule entries
   */
  generatePaymentSchedule(
    agreementId: string,
    monthlyRent: number,
    startDate: Date,
    endDate: Date,
  ): PaymentScheduleEntry[] {
    const schedule: PaymentScheduleEntry[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    let paymentNumber = 1;
    const current = new Date(start);

    while (current <= end) {
      schedule.push({
        paymentNumber,
        dueDate: new Date(current),
        amount: monthlyRent,
        agreementId,
      });

      paymentNumber++;
      current.setMonth(current.getMonth() + 1);
    }

    this.logger.log(
      `Generated ${schedule.length} payment schedule entries for agreement ${agreementId}`,
    );

    return schedule;
  }

  /**
   * Retrieves the payment history for a given rent agreement.
   *
   * @param agreementId - The agreement identifier
   * @returns An array of Payment records ordered by payment date descending
   * @throws NotFoundException if the agreement does not exist
   */
  async getRentHistory(agreementId: string): Promise<Payment[]> {
    const agreement = await this.agreementRepository.findOne({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new NotFoundException(
        `Rent agreement with id ${agreementId} not found`,
      );
    }

    const payments = await this.paymentRepository.find({
      where: { agreementId },
      order: { paymentDate: 'DESC' },
    });

    this.logger.log(
      `Retrieved ${payments.length} payments for agreement ${agreementId}`,
    );

    return payments;
  }
}
