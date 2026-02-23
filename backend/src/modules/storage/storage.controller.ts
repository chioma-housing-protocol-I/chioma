import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  async getUploadUrl(
    @Body()
    body: {
      fileName: string;
      fileSize: number;
      fileType: string;
    },
    @Req() req: any,
  ) {
    // Assume req.user.id is available from AuthGuard
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
  async getDownloadUrl(@Query('key') key: string, @Req() req: any) {
    const url = await this.storageService.getDownloadUrl(key, req.user.id);
    return { url };
  }
}
