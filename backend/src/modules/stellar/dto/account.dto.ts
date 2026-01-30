import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { StellarAccountType } from '../entities/stellar-account.entity';

export class CreateAccountDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(StellarAccountType)
  accountType?: StellarAccountType = StellarAccountType.USER;
}

export class AccountResponseDto {
  id: number;
  publicKey: string;
  accountType: StellarAccountType;
  balance: string;
  sequenceNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FundAccountDto {
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsOptional()
  @IsString()
  amount?: string; // Amount in XLM, default depends on network
}
