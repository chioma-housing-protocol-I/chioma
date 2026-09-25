import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { LandlordAnalyticsQueryDto } from './landlord-analytics-query.dto';

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
}
