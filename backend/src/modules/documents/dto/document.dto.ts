import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Lease Agreement.pdf' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'LEASE',
    enum: ['LEASE', 'INSPECTION', 'RECEIPT', 'CONTRACT', 'OTHER'],
  })
  @IsEnum(['LEASE', 'INSPECTION', 'RECEIPT', 'CONTRACT', 'OTHER'])
  type: string;

  @ApiProperty({ example: 'lease' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'docs/user/filename' })
  @IsString()
  fileKey: string;

  @ApiProperty({ example: 1024000 })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  fileType: string;

  @ApiPropertyOptional({ example: 'uuid-of-property' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-tenant' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ example: 'Annual lease agreement' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Updated Name.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    example: 'ARCHIVED',
    enum: ['ACTIVE', 'ARCHIVED', 'EXPIRED'],
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'ARCHIVED', 'EXPIRED'])
  status?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ShareDocumentDto {
  @ApiProperty({ example: 'uuid-of-tenant' })
  @IsString()
  tenantId: string;
}

export class DocumentFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  page?: number;
}

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  fileKey: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  fileType: string;

  @ApiProperty({ nullable: true })
  propertyId: string | null;

  @ApiProperty({ nullable: true })
  tenantId: string | null;

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  sharedWith: string[] | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
