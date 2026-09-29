import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateFraudThresholdsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  thresholdReview?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  thresholdBlock?: number;
}
