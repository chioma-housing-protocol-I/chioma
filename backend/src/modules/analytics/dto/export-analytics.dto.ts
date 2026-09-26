import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { LandlordAnalyticsQueryDto } from './landlord-analytics-query.dto';
import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportType {
  PROPERTY = 'property',
  PAYMENT = 'payment',
  USER_ACTIVITY = 'user_activity',
  ALL = 'all',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export class ExportAnalyticsDto extends LandlordAnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.JSON })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;
export class ExportAnalyticsDto {
  @IsEnum(ExportType)
  exportType: ExportType;

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;
}
