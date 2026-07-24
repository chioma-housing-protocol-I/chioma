import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TriggerWebhookEventDto {
  @ApiProperty({ example: 'payment.received' })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiPropertyOptional({
    description: 'JSON-encoded string or object payload to send',
  })
  @IsOptional()
  payload?: unknown;
}
