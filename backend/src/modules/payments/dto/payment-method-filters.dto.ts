import { IsOptional, IsBoolean } from 'class-validator';

export class PaymentMethodFiltersDto {
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
