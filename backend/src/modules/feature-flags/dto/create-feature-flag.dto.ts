import {
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsObject,
  Matches,
} from 'class-validator';

export class CreateFeatureFlagDto {
  @IsString()
  @Matches(/^[a-z0-9_:-]+$/i, {
    message:
      'Flag key must contain only letters, numbers, underscores, hyphens, or colons',
  })
  key: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number = 100;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
