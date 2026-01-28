import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';
import { DisputeStatus, DisputeType } from '../entities/dispute.entity';
import { Type } from 'class-transformer';

export class QueryDisputesDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsEnum(DisputeType)
  disputeType?: DisputeType;

  @IsOptional()
  @IsString()
  @IsUUID()
  agreementId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  initiatedBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  disputeIds?: string[];
}
