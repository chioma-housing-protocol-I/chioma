import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({
    example:
      'We have reviewed the photos and the lease agreement. The tenant is entitled to a partial refund of $750.',
    description: 'Comment text content',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether this comment is internal (not visible to the other party)',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}
