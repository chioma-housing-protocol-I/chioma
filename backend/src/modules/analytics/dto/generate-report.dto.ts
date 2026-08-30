import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportType {
  PROPERTY = 'property',
  PAYMENT = 'payment',
  USER_ACTIVITY = 'user_activity',
  COMPREHENSIVE = 'comprehensive',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

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
