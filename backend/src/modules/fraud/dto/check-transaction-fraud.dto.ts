import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CheckTransactionFraudDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the user involved in the transaction' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 1500.0, description: 'Transaction amount to check for fraud', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'NGN', description: 'Transaction currency code (ISO 4217)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'stellar_usdc', description: 'Payment method used for the transaction' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: '192.168.1.100', description: 'IP address from which the transaction originated' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'fp_abc123_device456', description: 'Device fingerprint for fraud analysis' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}
