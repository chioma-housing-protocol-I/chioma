import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class QueryAgreementsDto {
  @ApiPropertyOptional({
    description: 'Filter by agreement status',
    enum: AgreementStatus,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(AgreementStatus)
  status?: AgreementStatus;

  @ApiPropertyOptional({
    description: 'Filter by landlord ID',
    example: 'landlord-uuid-string',
  })
  @IsOptional()
  @IsString()
  landlordId?: string;

  @ApiPropertyOptional({
    description: 'Filter by tenant ID',
    example: 'tenant-uuid-string',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    description: 'Filter by agent ID',
    example: 'agent-uuid-string',
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by property ID',
    example: 'property-uuid-string',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  // Pagination
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  // Sorting
  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order direction',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
