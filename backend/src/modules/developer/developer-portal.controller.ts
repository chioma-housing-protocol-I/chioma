import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('developer-portal')
@ApiTags('Developer Portal')
export class DeveloperPortalController {
  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get portal' })
  @Get()
  getPortal(@Res() res: Response): void {
    const path = join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'developer-portal.html',
    );
    res.sendFile(path);
  }
}
