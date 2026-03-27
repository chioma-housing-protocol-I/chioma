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

export class UpdateFileMetadataDto {
  @ApiProperty({
    example: 'new-lease-agreement.pdf',
    description: 'New file name',
  })
  @IsString()
  fileName: string;
}

export class FileMetadataResponseDto {
  @ApiProperty({ example: 'uuid-1', description: 'File ID' })
  id: string;

  @ApiProperty({ example: 'lease.pdf', description: 'File name' })
  fileName: string;

  @ApiProperty({ example: 1024000, description: 'File size' })
  fileSize: number;

  @ApiProperty({ example: 'application/pdf', description: 'File type' })
  fileType: string;

  @ApiProperty({ example: 'docs/user/key', description: 'S3 key' })
  s3Key: string;

  @ApiProperty({
    example: '2024-03-27T10:00:00Z',
    description: 'Creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-03-27T10:00:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
