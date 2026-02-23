import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class WithdrawRequestDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
