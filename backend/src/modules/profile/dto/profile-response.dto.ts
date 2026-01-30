import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountTypeDto } from './create-profile.dto';

export class OnChainDataDto {
  @ApiProperty({
    description: 'Profile owner wallet address',
    example: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
  })
  owner: string;

  @ApiProperty({
    description: 'Profile schema version',
    example: 1,
  })
  version: number;

  @ApiProperty({
    enum: AccountTypeDto,
    description: 'Account type',
    example: AccountTypeDto.Tenant,
  })
  accountType: AccountTypeDto;

  @ApiProperty({
    description: 'Unix timestamp of last update',
    example: 1706745600,
  })
  lastUpdated: number;

  @ApiProperty({
    description: 'SHA-256 hash of off-chain data (64 hex characters)',
    example: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  })
  dataHash: string;

  @ApiProperty({
    description: 'Whether the profile has been verified by an admin',
    example: false,
  })
  isVerified: boolean;
}

export class OffChainDataDto {
  @ApiPropertyOptional({ description: 'Display name', example: 'John Doe' })
  displayName: string | null;

  @ApiPropertyOptional({
    description: 'Bio or description',
    example: 'Experienced landlord',
  })
  bio: string | null;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl: string | null;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { preferences: { notifications: true } },
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Computed SHA-256 hash of off-chain data',
    example: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  })
  dataHash: string;

  @ApiPropertyOptional({
    description: 'IPFS Content Identifier (CID) where profile data is stored',
    example: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  ipfsCid: string | null;

  @ApiPropertyOptional({
    description: 'IPFS gateway URL to access the profile data',
    example:
      'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  ipfsUrl: string | null;

  @ApiProperty({
    description: 'Last time profile was synced with on-chain data',
    example: '2024-01-31T12:00:00Z',
  })
  lastSyncedAt: Date;
}

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Wallet address of the profile owner',
    example: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
  })
  walletAddress: string;

  @ApiPropertyOptional({
    description: 'On-chain profile data (null if not found on chain)',
    type: OnChainDataDto,
  })
  onChain: OnChainDataDto | null;

  @ApiPropertyOptional({
    description: 'Off-chain profile data from database',
    type: OffChainDataDto,
  })
  offChain: OffChainDataDto | null;

  @ApiProperty({
    description: 'Whether the off-chain data hash matches the on-chain hash',
    example: true,
  })
  dataIntegrityValid: boolean;
}

export class ProfileCreatedResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Profile created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Transaction hash from the blockchain',
    example:
      '3b340d0f8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'SHA-256 hash of the off-chain data stored on-chain',
    example: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  })
  dataHash: string;

  @ApiPropertyOptional({
    description: 'IPFS Content Identifier (CID) where profile data is stored',
    example: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  ipfsCid?: string;

  @ApiPropertyOptional({
    description: 'IPFS gateway URL to access the profile data',
    example:
      'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  ipfsUrl?: string;
}

export class ProfileUpdatedResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Profile updated successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description:
      'Transaction hash from the blockchain (only if on-chain update was needed)',
    example:
      '3b340d0f8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
  })
  transactionHash?: string;

  @ApiProperty({
    description: 'Whether on-chain data was updated',
    example: true,
  })
  onChainUpdated: boolean;

  @ApiProperty({
    description: 'Current SHA-256 hash of the off-chain data',
    example: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  })
  dataHash: string;

  @ApiPropertyOptional({
    description: 'IPFS Content Identifier (CID) where profile data is stored',
    example: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  ipfsCid?: string;

  @ApiPropertyOptional({
    description: 'IPFS gateway URL to access the profile data',
    example:
      'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
  })
  ipfsUrl?: string;
}

export class DataIntegrityResponseDto {
  @ApiProperty({
    description: 'Whether the data integrity check passed',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Computed hash of off-chain data',
    example: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  })
  computedHash: string;

  @ApiPropertyOptional({
    description: 'Hash stored on-chain (null if profile not found on-chain)',
    example: 'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  })
  onChainHash: string | null;

  @ApiProperty({
    description: 'Human-readable message about the verification result',
    example: 'Data integrity verified: off-chain data matches on-chain hash',
  })
  message: string;
}
