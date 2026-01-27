import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TerminateAgreementDto {
  @ApiProperty({
    description: 'Reason for terminating the agreement',
    example: 'Mutual agreement to end lease early',
  })
  @IsNotEmpty()
  @IsString()
  terminationReason: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the termination',
    example: 'Tenant found new job in different city',
  })
  @IsOptional()
  @IsString()
  terminationNotes?: string;
}
