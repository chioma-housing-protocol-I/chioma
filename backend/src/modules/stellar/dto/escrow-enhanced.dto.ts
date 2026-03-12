import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConditionType } from '../entities/escrow-condition.entity';

export class CreateMultiSigEscrowDto {
  @IsArray()
  @IsString({ each: true })
  participants: string[];

  @IsNumber()
  @Min(1)
  @Max(10)
  requiredSignatures: number;

  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddSignatureDto {
  @IsString()
  escrowId: string;

  @IsString()
  signerAddress: string;

  @IsString()
  signature: string;
}

export class CreateTimeLockedEscrowDto {
  @IsString()
  beneficiary: string;

  @IsString()
  amount: string;

  @IsNumber()
  releaseTime: number;

  @IsOptional()
  @IsString()
  token?: string;
}

export class EscrowConditionDto {
  @IsString()
  type: ConditionType;

  @IsObject()
  parameters: Record<string, any>;

  @IsBoolean()
  required: boolean;
}

export class CreateConditionalEscrowDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscrowConditionDto)
  conditions: EscrowConditionDto[];

  @IsString()
  beneficiary: string;

  @IsString()
  amount: string;
}

export interface ConditionValidationResult {
  valid: boolean;
  failedConditions?: EscrowConditionDto[];
}
