import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStellarAddress } from '../validators/stellar-address.validator';

export class StellarAuthChallengeDto {
  @ApiProperty({
    example: 'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q',
    description: 'Stellar wallet public key',
  })
  @IsStellarAddress()
  @IsNotEmpty({ message: 'Wallet address is required' })
  walletAddress: string;
}

export class StellarAuthVerifyDto {
  @ApiProperty({
    example: 'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2Q',
    description: 'Stellar wallet public key',
  })
  @IsStellarAddress()
  @IsNotEmpty({ message: 'Wallet address is required' })
  walletAddress: string;

  @ApiProperty({
    example: '304402207...',
    description: 'Signature of the challenge transaction',
  })
  @IsString({ message: 'Signature must be a string' })
  @IsNotEmpty({ message: 'Signature is required' })
  signature: string;

  @ApiProperty({
    example: 'AAAAAgAAAAA...',
    description: 'Challenge transaction XDR',
  })
  @IsString({ message: 'Challenge must be a string' })
  @IsNotEmpty({ message: 'Challenge is required' })
  challenge: string;
}

export class StellarAuthResponseDto {
  @ApiProperty({
    example: 'AAAAAgAAAAA...',
    description: 'Challenge transaction XDR for client to sign',
  })
  challenge: string;

  @ApiProperty({
    example: '2024-01-26T17:27:00.000Z',
    description: 'Challenge expiration time',
  })
  expiresAt: string;
}
