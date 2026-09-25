import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DocumentService } from './document.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  UploadDocumentContentDto,
} from './dto/document.dto';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a document (version 1)' })
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: User) {
    return this.documentService.create(dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.documentService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata only' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentService.update(id, dto, user.id);
  }

  @Post(':id/content')
  @ApiOperation({ summary: 'Upload new content, creating a new version' })
  uploadContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadDocumentContentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentService.uploadContent(id, dto, user.id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List document version history' })
  listVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentService.listVersions(id, user.id);
  }

  @Post(':id/sign')
  sign(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.documentService.sign(id, user.id);
  }

  @Get(':id/signatures/verify')
  verifySignatures(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentService.verifySignatures(id, user.id);
  }
}
