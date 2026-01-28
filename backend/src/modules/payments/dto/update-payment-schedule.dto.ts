import { IsOptional, IsIn, IsDateString, IsNumber, Min } from 'class-validator';
import { PaymentScheduleStatus } from '../entities/payment-schedule.entity';

export class UpdatePaymentScheduleDto {
  @IsOptional()
  @IsIn([
    PaymentScheduleStatus.ACTIVE,
    PaymentScheduleStatus.PAUSED,
    PaymentScheduleStatus.CANCELED,
    PaymentScheduleStatus.FAILED,
  ])
  status?: PaymentScheduleStatus;

  @IsOptional()
  @IsDateString()
  nextRunAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetries?: number;
}
