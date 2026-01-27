import { IsString, Length, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for enabling MFA
 */
export class EnableMfaDto {
  @ApiProperty({
    description: 'TOTP verification code',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be 6 digits' })
  @IsNotEmpty()
  code: string;
}

/**
 * DTO for disabling MFA
 */
export class DisableMfaDto {
  @ApiProperty({
    description: 'TOTP verification code',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be 6 digits' })
  @IsNotEmpty()
  code: string;
}

/**
 * DTO for verifying MFA during login
 */
export class VerifyMfaDto {
  @ApiProperty({
    description: 'User ID from partial login response',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'TOTP verification code or backup code',
    example: '123456',
  })
  @IsString()
  @Length(6, 8, { message: 'Code must be 6-8 characters' })
  @IsNotEmpty()
  code: string;
}

/**
 * DTO for regenerating backup codes
 */
export class RegenerateBackupCodesDto {
  @ApiProperty({
    description: 'Current TOTP verification code',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be 6 digits' })
  @IsNotEmpty()
  code: string;
}

/**
 * Response DTOs
 */
export class MfaSetupResponseDto {
  @ApiProperty({
    description: 'Base32 encoded secret',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'URL for generating QR code',
    example:
      'otpauth://totp/Chioma:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Chioma',
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'Backup codes for account recovery',
    example: ['A1B2C3D4', 'E5F6G7H8'],
  })
  backupCodes: string[];
}

export class MfaStatusResponseDto {
  @ApiProperty({
    description: 'Whether MFA is enabled for the user',
    example: true,
  })
  mfaEnabled: boolean;
}

export class MfaVerifyResponseDto {
  @ApiProperty({
    description: 'Whether the code was verified successfully',
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: 'Optional message',
    example: 'MFA verified successfully',
    required: false,
  })
  message?: string;
}
