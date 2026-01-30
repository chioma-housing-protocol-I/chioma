import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  Matches,
  ValidateNested,
  IsDateString,
  IsInt,
  Min,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '../entities/stellar-transaction.entity';
import {
  EscrowStatus,
  ReleaseConditions,
} from '../entities/stellar-escrow.entity';

export class TimelockConditionDto {
  @IsOptional()
  @IsDateString()
  releaseAfter?: string;

  @IsOptional()
  @IsDateString()
  expireAfter?: string;
}

export class MultiSigConditionDto {
  @IsInt()
  @Min(1)
  requiredSignatures: number;

  @IsArray()
  @IsString({ each: true })
  @Matches(/^G[A-Z0-9]{55}$/, {
    each: true,
    message: 'Each signer must be a valid Stellar public key',
  })
  signers: string[];
}

export class ConditionDto {
  @IsString()
  type: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  fulfilled?: boolean;

  @IsOptional()
  @IsDateString()
  fulfilledAt?: string;
}

export class ReleaseConditionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TimelockConditionDto)
  timelock?: TimelockConditionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MultiSigConditionDto)
  multiSig?: MultiSigConditionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];
}

export class CreateEscrowDto {
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
  @IsEnum(AssetType)
  assetType?: AssetType = AssetType.NATIVE;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9]{1,12}$/, {
    message: 'Asset code must be 1-12 alphanumeric characters',
  })
  assetCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid asset issuer public key format',
  })
  assetIssuer?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReleaseConditionsDto)
  releaseConditions?: ReleaseConditionsDto;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  rentAgreementId?: string;
}

export class ReleaseEscrowDto {
  @IsInt()
  @Min(1)
  escrowId: number;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class RefundEscrowDto {
  @IsInt()
  @Min(1)
  escrowId: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class EscrowResponseDto {
  id: number;
  escrowPublicKey: string;
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  assetType: AssetType;
  assetCode?: string;
  assetIssuer?: string;
  status: EscrowStatus;
  releaseConditions?: ReleaseConditions;
  expirationDate?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
  releaseTransactionHash?: string;
  refundTransactionHash?: string;
  rentAgreementId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ListEscrowsDto {
  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid public key format',
  })
  publicKey?: string;

  @IsOptional()
  @IsEnum(EscrowStatus)
  status?: EscrowStatus;

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
}
