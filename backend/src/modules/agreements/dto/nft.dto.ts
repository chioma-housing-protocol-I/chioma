import { IsString, IsNotEmpty } from 'class-validator';

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
