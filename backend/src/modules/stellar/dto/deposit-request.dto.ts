import { IsNotEmpty, IsString, IsNumber, IsEnum, Min } from 'class-validator';

export type PaymentMethod = 'SEPA' | 'SWIFT' | 'ACH';

export class DepositRequestDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string; // Fiat currency code (e.g., USD, EUR)

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsEnum(['SEPA', 'SWIFT', 'ACH'])
  type: PaymentMethod; // Payment method
}