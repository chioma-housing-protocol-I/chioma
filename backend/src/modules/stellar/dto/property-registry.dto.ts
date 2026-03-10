import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPropertyDto {
  @ApiProperty({ description: 'Unique identifier for the property' })
  @IsString()
  propertyId: string;

  @ApiProperty({ description: 'Stellar public key of the property owner' })
  @IsString()
  ownerAddress: string;

  @ApiProperty({
    description: 'IPFS hash or other reference to property metadata',
  })
  @IsString()
  metadataHash: string;
}

export class TransferPropertyDto {
  @ApiProperty({ description: 'Unique identifier for the property' })
  @IsString()
  propertyId: string;

  @ApiProperty({ description: 'Stellar public key of the current owner' })
  @IsString()
  fromAddress: string;

  @ApiProperty({ description: 'Stellar public key of the new owner' })
  @IsString()
  toAddress: string;
}

export class VerifyPropertyDto {
  @ApiProperty({ description: 'Unique identifier for the property to verify' })
  @IsString()
  propertyId: string;

  @ApiProperty({
    description: 'Stellar public key of the verifier (must be admin)',
  })
  @IsString()
  verifierAddress: string;
}
