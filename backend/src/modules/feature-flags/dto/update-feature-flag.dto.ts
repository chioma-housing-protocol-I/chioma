import {
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsObject,
} from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
