import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreatePaymentRecordDto {
  @IsOptional()
  @IsString()
  agreementId?: string | undefined;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string | undefined;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  notes?: string | undefined;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
