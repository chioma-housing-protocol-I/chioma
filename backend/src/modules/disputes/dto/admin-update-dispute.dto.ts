import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateDisputeDto } from './update-dispute.dto';

export class AdminUpdateDisputeDto extends UpdateDisputeDto {
  @ApiPropertyOptional({
    example:
      'Admin has reviewed the case and determined the dispute should be escalated to the management team.',
    description: 'Admin resolution notes',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
