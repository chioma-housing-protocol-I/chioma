import { IsString, IsObject, IsNumber, IsOptional } from 'class-validator';

export class NFTMetadata {
  @IsString()
  agreementId: string;

  @IsString()
  propertyAddress: string;

  @IsString()
  monthlyRent: string;

  @IsNumber()
  startDate: number;

  @IsNumber()
  endDate: number;

  @IsString()
  tenant: string;

  @IsString()
  landlord: string;

  @IsOptional()
  @IsString()
  agent?: string;

  @IsString()
  tokenStandard: string;

  @IsNumber()
  created: number;
}

export class MintNFTDto {
  @IsString()
  agreementId: string;

  @IsString()
  tenantAddress: string;

  @IsObject()
  metadata: NFTMetadata;
}

export class TransferNFTDto {
  @IsString()
  fromAddress: string;

  @IsString()
  toAddress: string;

  @IsString()
  tokenId: string;
}

export class BurnNFTDto {
  @IsString()
  tokenId: string;

  @IsString()
  ownerAddress: string;
}