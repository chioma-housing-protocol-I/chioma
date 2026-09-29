import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RetryWebhookDeliveryDto {
  @ApiPropertyOptional({
    description:
      'ID of an existing delivery to redeliver. When omitted, event and payload are used to trigger a new delivery.',
  })
  @IsOptional()
  @IsString()
  deliveryId?: string;

  @ApiPropertyOptional({ example: 'payment.received' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({
    description: 'JSON-encoded string or object payload to send',
  })
  @IsOptional()
  payload?: unknown;
}
