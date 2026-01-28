import {
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
  Length,
  IsObject,
} from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @Length(4, 4)
  lastFour?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
