import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** Trims a string and strips ASCII / unicode control characters. */
function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\p{Cc}/gu, '');
}

export class SuggestDto {
  @ApiProperty({
    description: 'Partial query to generate autocomplete suggestions for',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }) => sanitizeString(value))
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q: string;
}
