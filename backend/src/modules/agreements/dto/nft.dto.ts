import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MintNftDto {
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @IsString()
  @IsNotEmpty()
  adminAddress: string;
}

export class TransferNftDto {
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @IsString()
  @IsNotEmpty()
  toAddress: string;
}

export class BurnNftDto {
  @ApiProperty({
    description: 'Agreement whose NFT obligation should be burned',
    example: 'agreement-123',
  })
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @ApiProperty({
    description:
      'Reason for burning, must match contract-accepted values (e.g. AgreementTerminated, LeaseCompleted, DisputeResolved, UserRequested)',
    example: 'AgreementTerminated',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AdminReassignObligationDto {
  @ApiProperty({
    description: 'Agreement whose NFT obligation should be reassigned',
    example: 'agreement-123',
  })
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @ApiProperty({
    description: 'Stellar address of the new obligation owner',
    example: 'GABCD...',
  })
  @IsString()
  @IsNotEmpty()
  newOwnerAddress: string;

  @ApiProperty({
    description: 'Stellar address of the admin performing the reassignment',
    example: 'GADMIN...',
  })
  @IsString()
  @IsNotEmpty()
  adminAddress: string;
}
