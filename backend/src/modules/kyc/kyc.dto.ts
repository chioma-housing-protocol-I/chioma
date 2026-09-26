import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from './kyc-status.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SubmitKycDto {
  @ApiProperty({
    description: 'KYC payload (SEP-9 style fields)',
    example: { first_name: 'John', last_name: 'Doe' },
  })
  @IsObject()
  @IsNotEmpty()
  kycData: Record<string, unknown>;
}

export class KycStatusResponseDto {
  @ApiProperty({ enum: KycStatus })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class KycWebhookDto {
  @ApiProperty({ description: 'Provider reference ID' })
  @IsString()
  providerReference: string;

  @ApiProperty({ enum: KycStatus })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminKycQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by user id, email, or name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'status'] })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'status'])
  sortBy?: 'createdAt' | 'updatedAt' | 'status' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class KycDecisionDto {
  @ApiPropertyOptional({ description: 'Reviewer note or rejection reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}
