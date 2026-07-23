import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateWebhookEndpointDto {
  @ApiProperty({ example: 'https://example.com/webhooks/chioma' })
  @IsUrl()
  url: string;

  @ApiProperty({
    example: ['payment.received', 'agreement.activated'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description:
      'Shared secret used to sign outbound payloads. A default from WEBHOOK_SIGNATURE_SECRET is used when omitted.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  secret?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
