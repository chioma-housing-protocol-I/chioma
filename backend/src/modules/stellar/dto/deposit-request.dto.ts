import { IsNumber, IsString, IsEnum, IsNotEmpty } from 'class-validator';

export enum PaymentMethodType {
  SEPA = 'SEPA',
  SWIFT = 'SWIFT',
  ACH = 'ACH',
}

export class DepositRequestDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;
}
