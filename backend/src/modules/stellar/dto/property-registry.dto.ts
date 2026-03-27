import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterPropertyDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  ownerAddress: string;

  @IsString()
  @IsNotEmpty()
  metadataHash: string;
}

export class TransferPropertyDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @IsString()
  @IsNotEmpty()
  toAddress: string;
}

export class VerifyPropertyDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  verifierAddress: string;
}
