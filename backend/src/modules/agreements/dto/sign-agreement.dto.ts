import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SignAgreementDto {
  @ApiPropertyOptional({
    description:
      'Optional idempotency key for safely retrying agreement signing (client timeout, mobile network drop). ' +
      'The first result for a given agreement+key is returned for repeat submissions instead of re-running the signature/escrow side effects. Retained for 7 days.',
    example: '66b2c4b6-38c6-4f18-a591-2e0f9d4f1d4e',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
