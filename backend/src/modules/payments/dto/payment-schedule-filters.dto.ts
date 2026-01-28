import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaymentScheduleStatus } from '../entities/payment-schedule.entity';

export class PaymentScheduleFiltersDto {
  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsOptional()
  @IsIn([
    PaymentScheduleStatus.ACTIVE,
    PaymentScheduleStatus.PAUSED,
    PaymentScheduleStatus.CANCELED,
    PaymentScheduleStatus.FAILED,
  ])
  status?: PaymentScheduleStatus;
}
