import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiPropertyOptional({
    example: 'My iPhone',
    description: 'Optional device name for the MFA device',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class VerifyMfaDto {
  @ApiProperty({
    example: '123456',
    description: 'TOTP token from authenticator app or backup code',
    minLength: 6,
    maxLength: 8,
  })
  @IsString()
  token: string;
}

export class DisableMfaDto {
  @ApiProperty({
    example: '123456',
    description: 'TOTP token or backup code to confirm MFA disable',
  })
  @IsString()
  token: string;
}
