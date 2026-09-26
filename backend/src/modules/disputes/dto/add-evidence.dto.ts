import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddEvidenceDto {
  @ApiProperty({
    example: 'damage-photo.jpg',
    description: 'Name of the evidence file being uploaded',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type of the evidence file',
  })
  @IsString()
  @IsNotEmpty()
  fileType: string;

  @ApiPropertyOptional({
    example: 'Photo of the damaged kitchen countertop taken on move-out date',
    description: 'Optional description of the evidence',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
