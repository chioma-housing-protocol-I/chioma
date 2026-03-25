import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller('developer-portal')
export class DeveloperPortalController {
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
