import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TourEventType } from '../entities/property-tour-engagement.entity';

export class TrackTourEngagementDto {
  @ApiProperty({ enum: TourEventType, example: TourEventType.VIEW_START })
  @IsEnum(TourEventType)
  eventType: TourEventType;

  @ApiPropertyOptional({ example: 'matterport' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 84 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24 * 60 * 60)
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 'mobile' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ example: 'property_details' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'sess_7a3dbf' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    example: { fullscreen: true, hotspotClicks: 3 },
    description: 'Additional engagement metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Optional user ID when tracking server-side events outside current auth context',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
