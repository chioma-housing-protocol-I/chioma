import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ShareDocumentDto,
  DocumentFilterDto,
  DocumentResponseDto,
} from './dto/document.dto';
import { Document } from './document.entity';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a document record' })
  @ApiResponse({
    status: 201,
    description: 'Document created',
    type: DocumentResponseDto,
  })
  async create(
    @Body() dto: CreateDocumentDto,
    @Req() req: { user: { id: string } },
  ) {
    const doc = await this.documentService.create(dto, req.user.id);
    return this.toResponse(doc);
  }

  @Get()
  @ApiOperation({ summary: 'List documents with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated document list' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role (owner/shared)',
  })
  async findAll(
    @Query() filters: DocumentFilterDto,
    @Query('role') role: string | undefined,
    @Req() req: { user: { id: string } },
  ) {
    if (role === 'shared') {
      const documents = await this.documentService.findSharedWithUser(
        req.user.id,
      );
      return {
        data: documents.map((d) => this.toResponse(d)),
        total: documents.length,
      };
    }
    const result = await this.documentService.findAll(req.user.id, filters);
    return {
      data: result.documents.map((d) => this.toResponse(d)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single document' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async findOne(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    const doc = await this.documentService.findOne(id, req.user.id);
    return this.toResponse(doc);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: { user: { id: string } },
  ) {
    const doc = await this.documentService.update(id, dto, req.user.id);
    return this.toResponse(doc);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async remove(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    await this.documentService.remove(id, req.user.id);
    return { success: true };
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Share a document with a tenant' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async share(
    @Param('id') id: string,
    @Body() dto: ShareDocumentDto,
    @Req() req: { user: { id: string } },
  ) {
    const doc = await this.documentService.share(id, dto.tenantId, req.user.id);
    return this.toResponse(doc);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiResponse({ status: 200, description: 'Download URL' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    const doc = await this.documentService.findOne(id, req.user.id);
    return { url: this.getFileUrl(doc.fileKey), key: doc.fileKey };
  }

  private toResponse(doc: Document): DocumentResponseDto {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      status: doc.status,
      category: doc.category,
      fileKey: doc.fileKey,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      propertyId: doc.propertyId,
      tenantId: doc.tenantId,
      ownerId: doc.ownerId,
      description: doc.description,
      sharedWith: doc.sharedWith,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private getFileUrl(key: string): string {
    const base =
      process.env.CDN_BASE_URL ||
      `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
    return `${base}/${key}`;
  }
}
