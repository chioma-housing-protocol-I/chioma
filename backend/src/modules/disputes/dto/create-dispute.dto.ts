import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeType } from '../dispute.enum';

export class CreateDisputeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  agreementId: string;

  @ApiProperty({ enum: DisputeType })
  @IsEnum(DisputeType)
  disputeType: DisputeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  requestedAmount?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadata?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
