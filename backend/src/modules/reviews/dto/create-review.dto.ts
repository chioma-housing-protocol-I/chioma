import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ReviewContext } from '../review.entity';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID of the user being reviewed' })
  @IsString()
  revieweeId: string;

  @ApiProperty({ enum: ReviewContext, description: 'Context of the review' })
  @IsEnum(ReviewContext)
  context: ReviewContext;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Rating 1-5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ description: 'Property ID when context is LEASE' })
  @IsOptional()
  @IsString()
  propertyId?: string;
}
