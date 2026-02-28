import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class GetUploadUrlDto {
  @ApiProperty({
    example: 'lease-agreement.pdf',
    description: 'Original file name',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    example: 1024000,
    description: 'File size in bytes',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type (e.g. application/pdf, image/jpeg)',
  })
  @IsString()
  fileType: string;
}

export class UploadUrlResponseDto {
  @ApiProperty({ description: 'Pre-signed upload URL' })
  url: string;

  @ApiProperty({ description: 'Storage key for later download' })
  key: string;
}

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'Pre-signed download URL' })
  url: string;
}
