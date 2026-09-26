import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  Min,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceStatus } from './maintenance-request.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateMaintenanceRequestDto {
  @IsUUID()
  propertyId: string;

  @IsUUID()
  landlordId: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsArray()
  @IsOptional()
  mediaUrls?: string[];
}

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;
}

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray()
  @IsOptional()
  specialties?: string[];
}

export class AssignVendorDto {
  @IsUUID()
  vendorId: string;
}

export class SubmitCostEstimateDto {
  @IsNumber()
  @Min(0)
  estimatedCost: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class ReviewCostEstimateDto {
  @IsBoolean()
  approved: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class PayMaintenanceCostDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsUUID()
  @IsOptional()
  agreementId?: string;
export class QueryMaintenanceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by property UUID' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsString()
  priority?: string;
}
