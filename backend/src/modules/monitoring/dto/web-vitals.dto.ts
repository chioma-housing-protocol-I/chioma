import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { WEB_VITAL_NAMES } from '../metrics.service';

/**
 * One anonymised real-user Web Vital, as forwarded by the frontend's
 * `/api/web-vitals` route. Contains no user identifiers.
 */
export class WebVitalMetricDto {
  @ApiProperty({ enum: WEB_VITAL_NAMES, example: 'LCP' })
  @IsIn(WEB_VITAL_NAMES)
  name: string;

  @ApiProperty({ example: 1834.2 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 'good' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  rating?: string;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  delta?: number;

  @ApiPropertyOptional({ example: 'v4-1700000000000-123' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  id?: string;

  @ApiPropertyOptional({ example: 'navigate' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  navigationType?: string;

  @ApiPropertyOptional({ example: '/properties' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  route?: string;

  @ApiPropertyOptional({ example: '2026-11-23T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timestamp?: string;
}

export class WebVitalsBatchDto {
  @ApiProperty({ type: [WebVitalMetricDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => WebVitalMetricDto)
  metrics: WebVitalMetricDto[];
}
