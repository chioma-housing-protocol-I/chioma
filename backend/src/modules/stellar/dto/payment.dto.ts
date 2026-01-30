import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Matches,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AssetType,
  MemoType,
  TransactionStatus,
} from '../entities/stellar-transaction.entity';

export class AssetDto {
  @IsEnum(AssetType)
  type: AssetType;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]{1,12}$/, {
    message: 'Asset code must be 1-12 alphanumeric characters',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar public key format for issuer',
  })
  issuer?: string;
}

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid source public key format',
  })
  sourcePublicKey: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid destination public key format',
  })
  destinationPublicKey: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,7})?$/, {
    message: 'Amount must be a positive number with up to 7 decimal places',
  })
  amount: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetDto)
  asset?: AssetDto;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsEnum(MemoType)
  memoType?: MemoType = MemoType.TEXT;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PaymentResponseDto {
  id: number;
  transactionHash: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  assetType: AssetType;
  assetCode?: string;
  status: TransactionStatus;
  feePaid: number;
  ledger?: number;
  memo?: string;
  createdAt: Date;
}

export class ListTransactionsDto {
  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class TransactionResponseDto {
  id: number;
  transactionHash: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  assetType: AssetType;
  assetCode?: string;
  assetIssuer?: string;
  feePaid: number;
  memo?: string;
  memoType?: MemoType;
  status: TransactionStatus;
  ledger?: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
