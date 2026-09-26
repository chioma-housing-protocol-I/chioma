import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveIncidentDto {
  @ApiPropertyOptional({
    description: 'Free-text resolution note for the incident',
    example: 'Rotated credentials and blocked offending IP range.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
