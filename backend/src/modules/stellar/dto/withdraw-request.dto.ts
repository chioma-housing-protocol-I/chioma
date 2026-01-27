import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class WithdrawRequestDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string; // Fiat currency code

  @IsString()
  @IsNotEmpty()
  destination: string; // Bank account or payment details

  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}