import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveSublettingDto {
  @ApiPropertyOptional({ example: 'Sublet request approved. Please ensure the subtenant signs the addendum.', description: 'Optional notes for the approval' })
  @IsOptional()
  @IsString()
  notes?: string;
}
