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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { RentService } from './rent.service';
import { RentReminderService } from './rent-reminder.service';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CalculateLateFeeDto {
  @ApiProperty({
    example: 1500.0,
    description: 'Monthly rent amount',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @ApiProperty({
    example: 10,
    description: 'Number of days the payment is late',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  daysLate: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Grace period in days before late fees apply',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gracePeriodDays?: number;

  @ApiPropertyOptional({
    example: 0.05,
    description: 'Daily late fee rate as a decimal (e.g., 0.05 = 5% per day)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lateFeeRate?: number;
}

export class CalculateProratedRentDto {
  @ApiProperty({
    example: 1500.0,
    description: 'Full monthly rent amount',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Move-in date for proration calculation (ISO 8601)',
  })
  @IsDateString()
  moveInDate: string;
}

export class CreateRemindersDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the rent agreement',
  })
  @IsString()
  agreementId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the tenant',
  })
  @IsString()
  tenantId: string;

  @ApiProperty({
    example: 'tenant@example.com',
    description: 'Tenant email address for reminder delivery',
  })
  @IsEmail()
  tenantEmail: string;

  @ApiProperty({
    example: '2026-07-01',
    description: 'Rent due date (ISO 8601)',
  })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 1500.0, description: 'Rent amount due', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Rent')
@Controller('rent')
export class RentController {
  constructor(
    private readonly rentService: RentService,
    private readonly rentReminderService: RentReminderService,
  ) {}

  @ApiOperation({
    summary: 'Get payment schedule',
    description:
      'Generates a payment schedule for the given agreement based on its stored terms.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment schedule generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  @Get('agreements/:id/schedule')
  async getPaymentSchedule(@Param('id', ParseUUIDPipe) id: string) {
    await this.rentService.getRentHistory(id);
    return this.rentService.generatePaymentSchedule(
      id,
      0,
      new Date(),
      new Date(),
    );
  }

  @ApiOperation({
    summary: 'Get rent history',
    description: 'Returns the payment history for the specified agreement.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rent history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  @Get('agreements/:id/history')
  async getRentHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentService.getRentHistory(id);
  }

  @ApiOperation({
    summary: 'Calculate late fee',
    description: 'Calculates a late fee based on the provided parameters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Late fee calculated',
    schema: { example: { lateFee: 75.0 } },
  })
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

  @ApiOperation({
    summary: 'Calculate prorated rent',
    description: 'Calculates prorated rent for a partial month.',
  })
  @ApiResponse({
    status: 200,
    description: 'Prorated rent calculated',
    schema: { example: { proratedRent: 750.0 } },
  })
  @Post('calculate/prorated')
  @HttpCode(HttpStatus.OK)
  calculateProratedRent(@Body() dto: CalculateProratedRentDto) {
    const prorated = this.rentService.calculateProratedRent(
      dto.monthlyRent,
      new Date(dto.moveInDate),
    );
    return { proratedRent: prorated };
  }

  @ApiOperation({
    summary: 'Create rent reminders',
    description: 'Creates a set of automated reminders for a rent agreement.',
  })
  @ApiResponse({ status: 201, description: 'Reminders created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
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

  @ApiOperation({
    summary: 'Get reminders',
    description: 'Lists all reminders for the specified agreement.',
  })
  @ApiResponse({ status: 200, description: 'Reminders retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  @Get('agreements/:id/reminders')
  async getReminders(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentReminderService.getReminders(id);
  }

  @ApiOperation({
    summary: 'Cancel reminder',
    description: 'Cancels a specific reminder by ID.',
  })
  @ApiResponse({ status: 200, description: 'Reminder cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  @Delete('reminders/:id')
  async cancelReminder(@Param('id', ParseUUIDPipe) id: string) {
    return this.rentReminderService.cancelReminder(id);
  }
}
