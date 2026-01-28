import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsDateString,
  IsObject,
} from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  paymentType: string;

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

  @IsOptional()
  @IsObject()
  sensitiveMetadata?: Record<string, unknown>;
}
