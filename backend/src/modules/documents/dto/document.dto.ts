import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

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

export class SignDocumentDto {
  @ApiProperty({
    description:
      'Captured signature payload (e.g. base64 signature image or typed name attestation)',
    example: 'data:image/png;base64,iVBORw0...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  signatureData: string;
}

export class SignatureStatusDto {
  @ApiProperty()
  signerId: string;

  @ApiProperty()
  signedAt: string;

  @ApiProperty({
    description:
      'False when the document content changed after signing (tamper detected)',
  })
  valid: boolean;
}

export class SignatureVerificationDto {
  @ApiProperty()
  documentId: string;

  @ApiProperty()
  signatureCount: number;

  @ApiProperty({
    description:
      'True when at least one signature exists and every signature hash still matches the document content',
  })
  allValid: boolean;

  @ApiProperty({ type: [SignatureStatusDto] })
  signatures: SignatureStatusDto[];
}

export class DocumentFilterDto extends PaginationQueryDto {
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

  @ApiProperty({ type: [SignatureStatusDto], nullable: true })
  signatures: { signerId: string; signedAt: string }[] | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
