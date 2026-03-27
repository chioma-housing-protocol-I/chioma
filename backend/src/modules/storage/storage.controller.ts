import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetUploadUrlDto,
  UploadUrlResponseDto,
  DownloadUrlResponseDto,
  UpdateFileMetadataDto,
  FileMetadataResponseDto,
} from './dto/upload-url.dto';

@ApiTags('Storage')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  @ApiOperation({
    summary: 'Get pre-signed upload URL',
    description:
      'Returns a pre-signed S3 URL for uploading a file. Use the returned key with GET /storage/download-url to get a download URL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed upload URL',
    type: UploadUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUploadUrl(
    @Body() body: GetUploadUrlDto,
    @Req() req: { user: { id: string } },
  ) {
    const key = `${body.fileType.startsWith('image/') ? 'images' : 'docs'}/${req.user.id}/${Date.now()}_${body.fileName}`;
    const url = await this.storageService.getUploadUrl(
      key,
      body.fileType,
      req.user.id,
      body.fileName,
      body.fileSize,
    );
    return { url, key };
  }

  @Get('download-url')
  @ApiOperation({
    summary: 'Get pre-signed download URL',
    description:
      'Returns a pre-signed URL to download a file by its storage key.',
  })
  @ApiQuery({
    name: 'key',
    description: 'Storage key returned from upload-url',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-signed download URL',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - key not owned by user',
  })
  async getDownloadUrl(
    @Query('key') key: string,
    @Req() req: { user: { id: string } },
  ) {
    const url = await this.storageService.getDownloadUrl(key, req.user.id);
    return { url };
  }

  @Get()
  @ApiOperation({
    summary: 'List files',
    description: 'Returns a list of all files owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of files',
    type: [FileMetadataResponseDto],
  })
  async listFiles(@Req() req: { user: { id: string } }) {
    return this.storageService.listFiles(req.user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Updates file metadata like file name for a given key.',
  })
  @ApiQuery({ name: 'key', required: true })
  @ApiResponse({
    status: 200,
    description: 'File metadata updated',
    type: FileMetadataResponseDto,
  })
  async updateMetadata(
    @Query('key') key: string,
    @Body() body: UpdateFileMetadataDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.storageService.updateMetadata(key, req.user.id, body.fileName);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete file',
    description: 'Deletes a file from storage and removes its metadata.',
  })
  @ApiQuery({ name: 'key', required: true })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(
    @Query('key') key: string,
    @Req() req: { user: { id: string } },
  ) {
    await this.storageService.deleteFile(key, req.user.id);
    return { success: true };
  }
}
