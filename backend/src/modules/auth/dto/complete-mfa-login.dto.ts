import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteMfaLoginDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Temporary MFA token received from login endpoint',
  })
  @IsString()
  @IsNotEmpty()
  mfaToken: string;

  @ApiProperty({
    example: '123456',
    description: 'TOTP token from authenticator app or backup code',
  })
  @IsString()
  @IsNotEmpty()
  mfaCode: string;
}
