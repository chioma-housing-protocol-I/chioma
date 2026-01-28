import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class PaymentFiltersDto {
  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded', 'partial_refund'])
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
