import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
  IsFinite,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Payment amount in USD',
    example: 1500.0,
    minimum: 0.01,
    maximum: 999999999.99,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsFinite({ message: 'Amount must be a finite number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @Max(999999999.99, { message: 'Amount must not exceed 999,999,999.99' })
  amount: number;

  @ApiProperty({
    description: 'Payment date (ISO 8601 format)',
    example: '2024-01-26',
    format: 'date',
  })
  @IsNotEmpty()
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({
    description: 'Payment method used',
    example: 'Stellar Transfer',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Transaction reference number or hash',
    example: 'stellar-tx-hash-123',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the payment',
    example: 'January rent payment',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
