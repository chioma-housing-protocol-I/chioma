import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { DocumentStatus } from '../document.entity';

export class UploadDocumentContentDto {
  @ApiProperty({ description: 'Storage key of the uploaded file' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  storageKey: string;

  @ApiProperty({ description: 'SHA-256 checksum (hex) of the file content' })
  @Matches(/^[a-f0-9]{64}$/i)
  checksum: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeNote?: string;

  @ApiPropertyOptional({
    description:
      'Required to replace content of a signed document; clears existing signature so it must be re-signed',
  })
  @IsOptional()
  @IsBoolean()
  requireResign?: boolean;
}

export class CreateDocumentDto extends UploadDocumentContentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
