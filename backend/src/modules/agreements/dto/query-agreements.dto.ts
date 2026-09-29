import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAgreementsDto extends PaginationQueryDto {
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
