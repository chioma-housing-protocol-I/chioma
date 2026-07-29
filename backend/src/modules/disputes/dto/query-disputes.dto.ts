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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus, DisputeType } from '../entities/dispute.entity';
import { Type } from 'class-transformer';

export class QueryDisputesDto {
  @ApiPropertyOptional({ example: 'OPEN', enum: DisputeStatus, description: 'Filter by dispute status' })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ example: 'RENT_PAYMENT', enum: DisputeType, description: 'Filter by dispute type' })
  @IsOptional()
  @IsEnum(DisputeType)
  disputeType?: DisputeType;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by agreement UUID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  agreementId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Filter by UUID of the user who initiated the dispute' })
  @IsOptional()
  @IsString()
  @IsUUID()
  initiatedBy?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Number of results per page', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort results by', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'], description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174000'], description: 'Filter by specific dispute UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  disputeIds?: string[];
}
