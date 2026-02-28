import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class AddEvidenceDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
