import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  Min,
  Max,
  ValidateNested,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConditionType } from '../entities/escrow-condition.entity';

// ==================== Multi-Signature DTOs ====================

export class CreateMultiSigEscrowDto {
  @IsArray()
  @IsString({ each: true })
  @Matches(/^G[A-Z0-9]{55}$/, {
    each: true,
    message: 'Each participant must be a valid Stellar public key',
  })
  participants: string[];

  @IsNumber()
  @Min(1)
  @Max(10)
  requiredSignatures: number;

  @IsString()
  @Matches(/^\d+(\.\d{1,7})?$/, {
    message: 'Amount must be a positive number with up to 7 decimal places',
  })
  amount: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid token address format',
  })
  token?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid arbiter address format',
  })
  arbiter?: string;
}

export class AddSignatureDto {
  @IsString()
  @IsNotEmpty()
  escrowId: string;

  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid signer address format',
  })
  signerAddress: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ReleaseWithSignaturesDto {
  @IsString()
  @IsNotEmpty()
  escrowId: string;

  @IsArray()
  @IsString({ each: true })
  signatures: string[];

  @IsOptional()
  @IsString()
  memo?: string;
}

// ==================== Time-Locked Escrow DTOs ====================

export class CreateTimeLockedEscrowDto {
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid beneficiary address format',
  })
  beneficiary: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,7})?$/, {
    message: 'Amount must be a positive number with up to 7 decimal places',
  })
  amount: string;

  @IsNumber()
  @Min(Math.floor(Date.now() / 1000))
  releaseTime: number;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid token address format',
  })
  token?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid depositor address format',
  })
  depositor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid arbiter address format',
  })
  arbiter?: string;
}

export class CheckTimeLockConditionsDto {
  @IsString()
  @IsNotEmpty()
  escrowId: string;
}

// ==================== Conditional Escrow DTOs ====================

export class EscrowConditionDto {
  @IsEnum(ConditionType)
  type: ConditionType;

  @IsObject()
  parameters: Record<string, any>;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateConditionalEscrowDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscrowConditionDto)
  conditions: EscrowConditionDto[];

  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid beneficiary address format',
  })
  beneficiary: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,7})?$/, {
    message: 'Amount must be a positive number with up to 7 decimal places',
  })
  amount: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid depositor address format',
  })
  depositor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid token address format',
  })
  token?: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid arbiter address format',
  })
  arbiter?: string;
}

export class ValidateConditionsDto {
  @IsString()
  @IsNotEmpty()
  escrowId: string;
}

// ==================== Dispute Integration DTOs ====================

export class IntegrateWithDisputeDto {
  @IsString()
  @IsNotEmpty()
  escrowId: string;

  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReleaseOnDisputeResolutionDto {
  @IsString()
  @IsNotEmpty()
  escrowId: string;

  @IsString()
  @IsNotEmpty()
  disputeOutcome: string;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid recipient address format',
  })
  recipientAddress?: string;
}

// ==================== Response DTOs ====================

export class ConditionValidationResult {
  conditionId: number;
  type: ConditionType;
  satisfied: boolean;
  required: boolean;
  description?: string;
  validationDetails?: Record<string, any>;
}

export class EscrowConditionsStatusDto {
  escrowId: string;
  allConditionsMet: boolean;
  requiredConditionsMet: boolean;
  conditions: ConditionValidationResult[];
  canRelease: boolean;
}

export class MultiSigEscrowResponseDto {
  escrowId: string;
  participants: string[];
  requiredSignatures: number;
  currentSignatures: number;
  signatures: {
    signerAddress: string;
    signedAt: Date;
    isValid: boolean;
  }[];
  canRelease: boolean;
}

export class TimeLockedEscrowResponseDto {
  escrowId: string;
  releaseTime: number;
  currentTime: number;
  isUnlocked: boolean;
  timeRemaining: number;
}

export class DisputeIntegrationResponseDto {
  escrowId: string;
  disputeId: string;
  integrated: boolean;
  disputeStatus?: string;
  canRelease: boolean;
}
