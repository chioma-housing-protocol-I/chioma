import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsIn,
  IsDateString,
} from 'class-validator';
import { PaymentInterval } from '../entities/payment-schedule.entity';

export class CreatePaymentScheduleDto {
  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsIn([
    PaymentInterval.WEEKLY,
    PaymentInterval.MONTHLY,
    PaymentInterval.QUARTERLY,
    PaymentInterval.YEARLY,
  ])
  interval: PaymentInterval;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetries?: number;
}
