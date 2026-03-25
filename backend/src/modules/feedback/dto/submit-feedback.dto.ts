import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FeedbackType } from '../entities/feedback.entity';

export class SubmitFeedbackDto {
  @ApiPropertyOptional({ example: 'developer@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'Would be great to have webhooks for agreement events.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ enum: FeedbackType, default: FeedbackType.GENERAL })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;
}
