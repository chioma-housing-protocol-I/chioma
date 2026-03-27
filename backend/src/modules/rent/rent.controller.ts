import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
  IsEmail,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RentService } from './rent.service';
import { RentReminderService } from './rent-reminder.service';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CalculateLateFeeDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  daysLate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gracePeriodDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lateFeeRate?: number;
}

export class CalculateProratedRentDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @IsDateString()
  moveInDate: string;
}

export class CreateRemindersDto {
  @IsString()
  agreementId: string;

  @IsString()
  tenantId: string;

  @IsEmail()
  tenantEmail: string;

  @IsDateString()
  dueDate: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('rent')
export class RentController {
  constructor(
    private readonly rentService: RentService,
    private readonly rentReminderService: RentReminderService,
  ) {}

  /**
   * GET /rent/agreements/:id/schedule
   * Generates a payment schedule for the given agreement based on its stored terms.
   */
  @Get('agreements/:id/schedule')
  async getPaymentSchedule(@Param('id', ParseUUIDPipe) id: string) {
    // Validate the agreement exists (throws NotFoundException if not found),
    // then generate the payment schedule.
    await this.rentService.getRentHistory(id);
    return this.rentService.generatePaymentSchedule(
      id,
      0, // placeholder – the controller will be enhanced once an agreement-fetch method is added
      new Date(),
      new Date(),
    );
  }

  /**
   * GET /rent/agreements/:id/history
   * Returns the payment history for the specified agreement.
   */
  @Get('agreements/:id/history')
  async getRentHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentService.getRentHistory(id);
  }

  /**
   * POST /rent/calculate/late-fee
   * Calculates a late fee based on the provided parameters.
   */
  @Post('calculate/late-fee')
  @HttpCode(HttpStatus.OK)
  calculateLateFee(@Body() dto: CalculateLateFeeDto) {
    const fee = this.rentService.calculateLateFee(
      dto.monthlyRent,
      dto.daysLate,
      dto.gracePeriodDays,
      dto.lateFeeRate,
    );
    return { lateFee: fee };
  }

  /**
   * POST /rent/calculate/prorated
   * Calculates prorated rent for a partial month.
   */
  @Post('calculate/prorated')
  @HttpCode(HttpStatus.OK)
  calculateProratedRent(@Body() dto: CalculateProratedRentDto) {
    const prorated = this.rentService.calculateProratedRent(
      dto.monthlyRent,
      new Date(dto.moveInDate),
    );
    return { proratedRent: prorated };
  }

  /**
   * POST /rent/reminders
   * Creates a set of automated reminders for a rent agreement.
   */
  @Post('reminders')
  @HttpCode(HttpStatus.CREATED)
  async createReminders(@Body() dto: CreateRemindersDto) {
    return this.rentReminderService.createRemindersForAgreement(
      dto.agreementId,
      dto.tenantId,
      dto.tenantEmail,
      new Date(dto.dueDate),
      dto.amount,
    );
  }

  /**
   * GET /rent/agreements/:id/reminders
   * Lists all reminders for the specified agreement.
   */
  @Get('agreements/:id/reminders')
  async getReminders(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentReminderService.getReminders(id);
  }

  /**
   * DELETE /rent/reminders/:id
   * Cancels a specific reminder.
   */
  @Delete('reminders/:id')
  async cancelReminder(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentReminderService.cancelReminder(id);
  }
}
